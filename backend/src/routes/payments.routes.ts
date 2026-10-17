import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import type { Database } from '../config/database.js';
import type { PayPalGateway } from '../paypal/client.js';
import { orderSchema, verifyCapture } from '../paypal/verification.js';
import { identity, protect, requireRole } from '../middleware/auth.js';
import { audit, milestoneAccess } from '../services/access.js';
import { ApiError, requireCondition } from '../utils/errors.js';
import { formatPayPalAmount } from '../utils/money.js';

export function paymentRoutes(db: Database, gateway: PayPalGateway) {
  const router = Router();
  router.use(protect);
  router.get('/config', (_req, res) => res.json({ data: { environment: 'sandbox', configured: gateway.configured, clientId: gateway.configured ? gateway.clientId : null } }));
  router.get('/history', async (req, res) => {
    const user = identity(req);
    res.json({ data: await db.payment.findMany({ where: { milestone: { project: { OR: [{ clientId: user.id }, { freelancerId: user.id }] } } }, orderBy: { createdAt: 'desc' }, take: 100, include: { milestone: { select: { id: true, title: true, projectId: true } } } }) });
  });
  router.post('/orders', async (req, res) => {
    const user = requireRole(req, 'CLIENT');
    const { milestoneId } = z.object({ milestoneId: z.string().min(1) }).parse(req.body);
    const { milestone, project } = await milestoneAccess(db, milestoneId, user, true);
    requireCondition(gateway.configured, 503, 'PAYPAL_UNCONFIGURED', 'Configure PayPal Sandbox credentials on the backend to enable checkout.');
    requireCondition(['APPROVED', 'PAYMENT_PENDING', 'PAYMENT_FAILED'].includes(milestone.status), 409, 'NOT_PAYABLE', 'Only a client-approved milestone may be paid.');
    let payment = await db.payment.findUnique({ where: { milestoneId } });
    if (!payment) {
      payment = await db.$transaction(async tx => {
        const latestSubmission = await tx.submission.findFirst({ where: { milestoneId }, orderBy: { revisionNumber: 'desc' } });
        const approval = await tx.approval.findFirst({ where: { milestoneId, decision: 'APPROVED', submissionId: latestSubmission?.id ?? '' }, orderBy: { createdAt: 'desc' } });
        requireCondition(approval && milestone.status === 'APPROVED', 409, 'APPROVAL_REQUIRED', 'A current human approval is required.');
        const created = await tx.payment.create({ data: { milestoneId, approvalId: approval.id, amountMinor: milestone.amountMinor, currency: project.currency, createRequestId: randomUUID(), captureRequestId: randomUUID() } });
        await tx.milestone.update({ where: { id: milestoneId }, data: { status: 'PAYMENT_PENDING' } });
        await tx.auditLog.create({ data: audit(user.id, project.id, 'PAYMENT_STARTED', milestoneId, { paymentId: created.id }) });
        return created;
      });
    }
    if (payment.paypalOrderId) return res.json({ data: payment });
    requireCondition(Date.now() - payment.createdAt.getTime() < 5 * 3600_000, 409, 'RECONCILIATION_REQUIRED', 'Order creation is unresolved beyond the safe retry window. Reconcile with PayPal before any new attempt.');
    // A persistent request ID is reused on ambiguous failures; never create a replacement order.
    const raw = await gateway.create({ intent: 'CAPTURE', purchase_units: [{ custom_id: milestoneId, invoice_id: payment.id, amount: { currency_code: payment.currency, value: formatPayPalAmount(payment.amountMinor) } }] }, payment.createRequestId);
    const parsedOrder = z.object({ id: z.string().regex(/^[A-Za-z0-9-]+$/), status: z.enum(['CREATED', 'APPROVED', 'PAYER_ACTION_REQUIRED']) }).safeParse(raw);
    requireCondition(parsedOrder.success, 502, 'PAYPAL_INVALID_RESPONSE', 'PayPal did not return a valid Sandbox order. Retry the same request to reconcile.');
    const updated = await db.payment.update({ where: { id: payment.id }, data: { paypalOrderId: parsedOrder.data.id, status: 'READY' } });
    res.status(201).json({ data: updated });
  });
  router.post('/orders/:orderId/capture', async (req, res) => {
    const user = requireRole(req, 'CLIENT');
    const orderId = z.string().regex(/^[A-Za-z0-9-]{3,100}$/).parse(req.params.orderId);
    let payment = await db.payment.findUnique({ where: { paypalOrderId: orderId } });
    requireCondition(payment, 404, 'NOT_FOUND', 'Order not found.');
    const { project } = await milestoneAccess(db, payment.milestoneId, user, true);
    if (payment.status === 'COMPLETED') return res.json({ data: payment });
    requireCondition(gateway.configured, 503, 'PAYPAL_UNCONFIGURED', 'PayPal Sandbox is not configured.');
    requireCondition(!payment.processingUntil || payment.processingUntil.getTime() < Date.now(), 409, 'PAYMENT_BUSY', 'Capture is already processing. Refresh payment history shortly.');
    const claimed = await db.$transaction(async tx => {
      const result = await tx.payment.updateMany({ where: { id: payment!.id, status: { not: 'COMPLETED' }, OR: [{ processingUntil: null }, { processingUntil: { lt: new Date() } }] }, data: { status: 'CAPTURING', processingUntil: new Date(Date.now() + 90_000) } });
      if (result.count === 1) {
        const retry = await tx.milestone.updateMany({ where: { id: payment!.milestoneId, status: 'PAYMENT_FAILED' }, data: { status: 'PAYMENT_PENDING' } });
        if (retry.count) await tx.auditLog.create({ data: audit(user.id, project.id, 'PAYMENT_RETRY_STARTED', payment!.milestoneId) });
      }
      return result;
    });
    requireCondition(claimed.count === 1, 409, 'PAYMENT_BUSY', 'Capture is already processing.');
    try {
      // Reconcile first: a previous capture could have succeeded before a timeout or crash.
      let raw = await gateway.get(orderId);
      const parsedOrder = orderSchema.safeParse(raw);
      requireCondition(parsedOrder.success, 502, 'PAYMENT_VERIFICATION_FAILED', 'PayPal order is missing required identity information.');
      const order = parsedOrder.data;
      const unit = order.purchase_units[0];
      requireCondition(order.id === orderId && unit.custom_id === payment.milestoneId && unit.invoice_id === payment.id, 502, 'PAYMENT_VERIFICATION_FAILED', 'Order identity did not match the stored agreement.');
      if (order.status !== 'COMPLETED') {
        requireCondition(order.status === 'APPROVED', 409, 'BUYER_APPROVAL_REQUIRED', 'The Sandbox buyer must approve this order first.');
        requireCondition(unit.amount?.currency_code === payment.currency && parseIntAmount(unit.amount.value) === payment.amountMinor, 502, 'PAYMENT_VERIFICATION_FAILED', 'Approved order amount did not match.');
        requireCondition(Date.now() - payment.createdAt.getTime() < 5 * 3600_000, 409, 'RECONCILIATION_REQUIRED', 'Capture retry window expired. Reconcile this order with PayPal before proceeding.');
        raw = await gateway.capture(orderId, payment.captureRequestId);
      }
      const captureId = verifyCapture(raw, payment);
      payment = await db.$transaction(async tx => {
        const result = await tx.payment.update({ where: { id: payment!.id }, data: { status: 'COMPLETED', paypalCaptureId: captureId, capturedAt: new Date(), processingUntil: null } });
        await tx.milestone.update({ where: { id: result.milestoneId }, data: { status: 'PAID' } });
        await tx.auditLog.create({ data: audit(user.id, project.id, 'SANDBOX_PAYMENT_CONFIRMED', result.milestoneId, { paymentId: result.id, captureId }) });
        return result;
      });
      res.json({ data: payment });
    } catch (error) {
      await db.$transaction(async tx => {
        await tx.payment.update({ where: { id: payment!.id }, data: { status: error instanceof ApiError && error.code === 'PAYMENT_VERIFICATION_FAILED' ? 'VERIFY_FAILED' : 'UNCERTAIN', processingUntil: null } });
        await tx.milestone.update({ where: { id: payment!.milestoneId }, data: { status: 'PAYMENT_FAILED' } });
        await tx.auditLog.create({ data: audit(user.id, project.id, 'PAYMENT_REQUIRES_RETRY', payment!.milestoneId) });
      });
      throw error;
    }
  });
  router.get('/:id', async (req, res) => {
    const payment = await db.payment.findUnique({ where: { id: String(req.params.id) } });
    requireCondition(payment, 404, 'NOT_FOUND', 'Payment not found.');
    await milestoneAccess(db, payment.milestoneId, identity(req));
    res.json({ data: payment });
  });
  return router;
}

import { parsePayPalAmount as parseIntAmount } from '../utils/money.js';
