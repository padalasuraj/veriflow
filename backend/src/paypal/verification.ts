import { z } from 'zod';
import { parsePayPalAmount } from '../utils/money.js';
import { requireCondition } from '../utils/errors.js';

const money = z.object({ currency_code: z.string(), value: z.string() });
const capture = z.object({ id: z.string().min(1), status: z.string(), amount: money, final_capture: z.boolean().optional() });
export const orderSchema = z.object({ id: z.string().min(1), status: z.string(), purchase_units: z.array(z.object({ custom_id: z.string(), invoice_id: z.string(), amount: money.optional(), payments: z.object({ captures: z.array(capture) }).optional() })).length(1) });
export function verifyCapture(input: unknown, payment: { id: string; milestoneId: string; paypalOrderId: string | null; amountMinor: number; currency: string }) {
  const result = orderSchema.safeParse(input);
  requireCondition(result.success, 502, 'PAYMENT_VERIFICATION_FAILED', 'PayPal response is missing required transaction information.');
  const order = result.data;
  const unit = order.purchase_units[0];
  const captures = unit.payments?.captures;
  requireCondition(order.id === payment.paypalOrderId && order.status === 'COMPLETED' && unit.custom_id === payment.milestoneId && unit.invoice_id === payment.id && captures?.length === 1, 502, 'PAYMENT_VERIFICATION_FAILED', 'PayPal order identity or capture status did not match.');
  const captured = captures[0];
  requireCondition(captured.status === 'COMPLETED' && captured.amount.currency_code === payment.currency && parsePayPalAmount(captured.amount.value) === payment.amountMinor && captured.final_capture !== false, 502, 'PAYMENT_VERIFICATION_FAILED', 'PayPal capture amount, currency or completion did not match.');
  return captured.id;
}
