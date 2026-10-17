import { Router } from 'express';
import { z } from 'zod';
import type { Database } from '../config/database.js';
import { identity, protect, requireRole } from '../middleware/auth.js';
import { audit, milestoneAccess } from '../services/access.js';
import { assertTransition } from '../services/lifecycle.js';
import { requireCondition } from '../utils/errors.js';
import { milestoneSchema } from './projects.routes.js';

const httpUrl = z.url().refine(value => ['http:', 'https:'].includes(new URL(value).protocol), 'Use an HTTP(S) URL.').max(2000).optional();
const submissionSchema = z.object({ description: z.string().trim().min(10).max(8000), githubUrl: httpUrl, demoUrl: httpUrl, evidenceNotes: z.string().trim().min(10).max(12_000) });
export function milestoneRoutes(db: Database) {
  const router = Router();
  router.use(protect);
  router.get('/:id', async (req, res) => {
    const { milestone, project } = await milestoneAccess(db, String(req.params.id), identity(req));
    const detail = await db.milestone.findUniqueOrThrow({ where: { id: milestone.id }, include: {
      submissions: { orderBy: { revisionNumber: 'desc' }, include: { evaluations: { orderBy: { createdAt: 'desc' } } } },
      approvals: { orderBy: { createdAt: 'desc' } }, payment: true,
    } });
    res.json({ data: { ...detail, project } });
  });
  router.patch('/:id', async (req, res) => {
    const user = requireRole(req, 'CLIENT');
    const { milestone, project } = await milestoneAccess(db, String(req.params.id), user, true);
    const input = milestoneSchema.parse(req.body);
    const updated = await db.$transaction(async tx => {
      const current = await tx.milestone.findUniqueOrThrow({ where: { id: milestone.id }, include: { _count: { select: { submissions: true } } } });
      requireCondition(['DRAFT', 'OPEN'].includes(current.status) && current._count.submissions === 0, 409, 'MILESTONE_LOCKED', 'Agreements cannot change after submission.');
      requireCondition(current.status !== 'OPEN' || input.status === 'OPEN', 409, 'INVALID_TRANSITION', 'An open agreement cannot return to draft.');
      const total = await tx.milestone.aggregate({ where: { projectId: project.id, id: { not: milestone.id } }, _sum: { amountMinor: true } });
      const currentProject = await tx.project.findUniqueOrThrow({ where: { id: project.id } });
      requireCondition((total._sum.amountMinor ?? 0) + input.amountMinor <= currentProject.budgetMinor, 409, 'BUDGET_EXCEEDED', 'Allocation exceeds budget.');
      const result = await tx.milestone.update({ where: { id: milestone.id }, data: input });
      await tx.auditLog.create({ data: audit(user.id, project.id, 'MILESTONE_UPDATED', milestone.id) });
      return result;
    });
    res.json({ data: updated });
  });
  router.post('/:id/submissions', async (req, res) => {
    const user = requireRole(req, 'FREELANCER');
    const { milestone, project } = await milestoneAccess(db, String(req.params.id), user);
    requireCondition(project.freelancerId === user.id, 403, 'FORBIDDEN', 'Only the assigned freelancer may submit.');
    const input = submissionSchema.parse(req.body);
    const submission = await db.$transaction(async tx => {
      const current = await tx.milestone.findUniqueOrThrow({ where: { id: milestone.id } });
      assertTransition(current.status, 'SUBMITTED');
      const latest = await tx.submission.findFirst({ where: { milestoneId: milestone.id }, orderBy: { revisionNumber: 'desc' } });
      const result = await tx.submission.create({ data: { ...input, milestoneId: milestone.id, freelancerId: user.id, revisionNumber: (latest?.revisionNumber ?? 0) + 1 } });
      await tx.milestone.update({ where: { id: milestone.id }, data: { status: 'SUBMITTED' } });
      await tx.auditLog.create({ data: audit(user.id, project.id, 'EVIDENCE_SUBMITTED', milestone.id, { revision: result.revisionNumber }) });
      return result;
    });
    res.status(201).json({ data: submission });
  });
  router.get('/:id/submissions', async (req, res) => {
    const { milestone } = await milestoneAccess(db, String(req.params.id), identity(req));
    res.json({ data: await db.submission.findMany({ where: { milestoneId: milestone.id }, orderBy: { revisionNumber: 'desc' }, include: { evaluations: true } }) });
  });
  router.post('/:id/review', async (req, res) => {
    const user = requireRole(req, 'CLIENT');
    const { milestone, project } = await milestoneAccess(db, String(req.params.id), user, true);
    assertTransition(milestone.status, 'UNDER_REVIEW');
    await db.$transaction(async tx => {
      const changed = await tx.milestone.updateMany({ where: { id: milestone.id, status: 'SUBMITTED' }, data: { status: 'UNDER_REVIEW' } });
      requireCondition(changed.count === 1, 409, 'STALE_STATE', 'Milestone state changed. Refresh.');
      await tx.auditLog.create({ data: audit(user.id, project.id, 'REVIEW_STARTED', milestone.id) });
    });
    res.json({ data: { status: 'UNDER_REVIEW' } });
  });
  router.post('/:id/decision', async (req, res) => {
    const user = requireRole(req, 'CLIENT');
    const { milestone, project } = await milestoneAccess(db, String(req.params.id), user, true);
    const input = z.object({ submissionId: z.string(), decision: z.enum(['APPROVED', 'CHANGES_REQUESTED']), notes: z.string().trim().min(3).max(4000) }).parse(req.body);
    const approval = await db.$transaction(async tx => {
      const current = await tx.milestone.findUniqueOrThrow({ where: { id: milestone.id } });
      assertTransition(current.status, input.decision);
      const latest = await tx.submission.findFirst({ where: { milestoneId: milestone.id }, orderBy: { revisionNumber: 'desc' } });
      requireCondition(latest?.id === input.submissionId, 409, 'STALE_SUBMISSION', 'Decide on the current submission only.');
      const result = await tx.approval.create({ data: { ...input, milestoneId: milestone.id, clientId: user.id } });
      await tx.milestone.update({ where: { id: milestone.id }, data: { status: input.decision } });
      await tx.auditLog.create({ data: audit(user.id, project.id, input.decision, milestone.id, { submissionId: input.submissionId, approvalId: result.id }) });
      return result;
    });
    res.status(201).json({ data: approval });
  });
  return router;
}
