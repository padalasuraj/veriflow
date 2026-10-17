import { describe, expect, it, vi } from 'vitest';
import { formatPayPalAmount, parsePayPalAmount, minorSchema, currencySchema } from '../utils/money.js';
import { assertTransition } from '../services/lifecycle.js';
import { mockProvider } from '../ai/mock.provider.js';
import { realProvider } from '../ai/real.provider.js';
import { planSchema, evaluationSchema } from '../ai/schemas.js';
import { envSchema } from '../config/env.js';
import { paypalClient } from '../paypal/client.js';
import { verifyCapture } from '../paypal/verification.js';

describe('money and lifecycle', () => {
  it('formats and parses integer minor units without rounding payment amounts', () => {
    for (const minor of [1, 99, 100, 15000, 60000, 100000000]) expect(parsePayPalAmount(formatPayPalAmount(minor))).toBe(minor);
    for (const bad of ['1e2', '1.999', '-1.00', '1', 'NaN']) expect(parsePayPalAmount(bad)).toBe(-1);
    expect(minorSchema.safeParse(1.5).success).toBe(false);
    expect(minorSchema.safeParse(-1).success).toBe(false);
    expect(currencySchema.safeParse('JPY').success).toBe(false);
  });
  it('allows review and retry states and prevents payment/state shortcuts', () => {
    expect(() => assertTransition('OPEN', 'SUBMITTED')).not.toThrow();
    expect(() => assertTransition('PAYMENT_FAILED', 'PAYMENT_PENDING')).not.toThrow();
    for (const [from, to] of [['OPEN', 'PAID'], ['SUBMITTED', 'APPROVED'], ['PAID', 'PAYMENT_PENDING']] as const) expect(() => assertTransition(from, to)).toThrow();
  });
});
const planInput = { title: 'Build website', description: 'Build an accessible studio website.', requirements: 'Mobile responsive', deliverables: 'Source and preview', budgetMinor: 60000 };
describe('AI providers', () => {
  it('produces deterministic, valid allocations and explicitly limited simulated reports', async () => {
    const a = planSchema.parse(await mockProvider.plan(planInput));
    expect(a).toEqual(await mockProvider.plan(planInput));
    expect(a.milestones.map(m => m.amountMinor)).toEqual([15000, 25000, 20000]);
    const assessment = evaluationSchema.parse(await mockProvider.evaluate({ title: 'Design', description: 'Layout', acceptanceCriteria: ['Provide mobile designs'], submission: { description: 'All complete', evidenceNotes: 'Trust me', demoUrl: 'https://example.com' } }));
    expect(assessment.recommendation).toBe('MORE_EVIDENCE_REQUIRED');
    expect(assessment.limitations.join(' ')).toContain('MOCK MODE');
  });
  it('rejects real mode without credentials and never calls a mock', async () => {
    const transport = vi.fn();
    await expect(realProvider(envSchema.parse({ AI_MODE: 'real' }), transport).plan(planInput)).rejects.toMatchObject({ code: 'AI_UNCONFIGURED' });
    expect(transport).not.toHaveBeenCalled();
  });
  it('sends structured real requests and validates returned JSON', async () => {
    const result = await mockProvider.plan(planInput);
    const transport = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(result) } }] })));
    const provider = realProvider(envSchema.parse({ AI_MODE: 'real', AI_API_KEY: 'test-only' }), transport);
    expect(await provider.plan(planInput)).toEqual(result);
    const body = JSON.parse(transport.mock.calls[0][1].body);
    expect(body.response_format.json_schema.strict).toBe(true);
  });
  it.each(['invalid-json', 'refusal', 'timeout', 'http-error'])('reports %s truthfully', async mode => {
    const transport = vi.fn().mockImplementation(async () => {
      if (mode === 'timeout') throw new DOMException('Timed out', 'TimeoutError');
      if (mode === 'http-error') return new Response('{}', { status: 429 });
      return new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: mode === 'refusal' ? { refusal: 'No' } : { content: 'not-json' } }] }));
    });
    await expect(realProvider(envSchema.parse({ AI_MODE: 'real', AI_API_KEY: 'test-only' }), transport).plan(planInput)).rejects.toThrow();
  });
});
describe('PayPal transport and verification', () => {
  it('uses only Sandbox OAuth and persistent idempotency headers', async () => {
    const transport = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'test-token', expires_in: 3600 }))).mockImplementation(async () => new Response(JSON.stringify({ id: 'ORDER-TEST' })));
    const gateway = paypalClient(envSchema.parse({ PAYPAL_CLIENT_ID: 'test-id', PAYPAL_CLIENT_SECRET: 'test-secret' }), transport);
    await gateway.create({}, 'persistent-request');
    await gateway.capture('ORDER-TEST', 'capture-request');
    expect(transport.mock.calls[0][0]).toBe('https://api-m.sandbox.paypal.com/v1/oauth2/token');
    expect(transport.mock.calls[1][1].headers['PayPal-Request-Id']).toBe('persistent-request');
    expect(transport.mock.calls[2][1].headers['PayPal-Request-Id']).toBe('capture-request');
    expect(envSchema.safeParse({ PAYPAL_ENV: 'live' }).success).toBe(false);
  });
  it('requires configured credentials without simulating a successful order', async () => {
    await expect(paypalClient(envSchema.parse({})).create({}, 'id')).rejects.toMatchObject({ code: 'PAYPAL_UNCONFIGURED' });
  });
  const payment = { id: 'PAYMENT', milestoneId: 'MILESTONE', paypalOrderId: 'ORDER', amountMinor: 15000, currency: 'USD' };
  const order = () => ({ id: 'ORDER', status: 'COMPLETED', purchase_units: [{ custom_id: 'MILESTONE', invoice_id: 'PAYMENT', payments: { captures: [{ id: 'CAPTURE', status: 'COMPLETED', amount: { value: '150.00', currency_code: 'USD' } }] } }] });
  it('accepts an exact completed capture', () => expect(verifyCapture(order(), payment)).toBe('CAPTURE'));
  it.each(['amount', 'currency', 'order', 'capture-status', 'milestone', 'invoice', 'duplicate'])('rejects mismatched %s', mismatch => {
    const data = order();
    const unit = data.purchase_units[0];
    if (mismatch === 'amount') unit.payments.captures[0].amount.value = '149.00';
    if (mismatch === 'currency') unit.payments.captures[0].amount.currency_code = 'EUR';
    if (mismatch === 'order') data.id = 'OTHER';
    if (mismatch === 'capture-status') unit.payments.captures[0].status = 'PENDING';
    if (mismatch === 'milestone') unit.custom_id = 'OTHER';
    if (mismatch === 'invoice') unit.invoice_id = 'OTHER';
    if (mismatch === 'duplicate') unit.payments.captures.push(unit.payments.captures[0]);
    expect(() => verifyCapture(data, payment)).toThrow();
  });
});
