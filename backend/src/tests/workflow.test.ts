import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createApp } from '../app.js';
import { connectDatabase } from '../config/database.js';
import { envSchema } from '../config/env.js';
import type { PayPalGateway } from '../paypal/client.js';
import { hashToken } from '../middleware/auth.js';

const directory = mkdtempSync(join(tmpdir(), 'veriflow-test-'));
const databaseUrl = `file:${join(directory, 'integration.db').replaceAll('\\', '/')}`;
const db = connectDatabase(databaseUrl);
const gateway: PayPalGateway = { configured: true, clientId: 'test-only', create: vi.fn(), get: vi.fn(), capture: vi.fn() };
const config = envSchema.parse({ NODE_ENV: 'test' });
const app = createApp(config, { db, paypal: gateway });
type Login = { agent: ReturnType<typeof request.agent>; csrf: string; id: string; email: string };
let client: Login, freelancer: Login, stranger: Login, otherFreelancer: Login;
async function register(role: 'CLIENT' | 'FREELANCER', email: string): Promise<Login> {
  const agent = request.agent(app);
  const response = await agent.post('/api/auth/register').send({ name: 'Integration User', email, password: 'StrongPassword2026!', role }).expect(201);
  return { agent, csrf: response.body.data.csrfToken, id: response.body.data.user.id, email };
}
const post = (user: Login, path: string, body: object = {}) => user.agent.post(path).set('X-CSRF-Token', user.csrf).send(body);
async function project() {
  const response = await post(client, '/api/projects', { title: 'Website delivery', description: 'Build an accessible studio website.', requirements: 'Responsive layouts', deliverables: 'Source and preview', budgetMinor: 60000, currency: 'USD', freelancerEmail: freelancer.email }).expect(201);
  return response.body.data.id as string;
}
async function milestone(projectId: string, amountMinor = 15000) {
  const response = await post(client, `/api/projects/${projectId}/milestones`, { title: 'Design delivery', description: 'Supply the agreed design.', amountMinor, acceptanceCriteria: ['Provide mobile and desktop layouts.'] }).expect(201);
  return response.body.data.id as string;
}
const evidence = { description: 'Delivered mobile and desktop layouts for review.', evidenceNotes: 'Open the supplied design and inspect the contact form layout.', demoUrl: 'https://example.com' };
async function approved() {
  const projectId = await project();
  const milestoneId = await milestone(projectId);
  const submission = await post(freelancer, `/api/milestones/${milestoneId}/submissions`, evidence).expect(201);
  await post(client, `/api/milestones/${milestoneId}/review`).expect(200);
  await post(client, `/api/milestones/${milestoneId}/decision`, { submissionId: submission.body.data.id, decision: 'APPROVED', notes: 'Inspected manually and accepted.' }).expect(201);
  return { projectId, milestoneId };
}
async function orderFixture(milestoneId: string) {
  const response = await post(client, '/api/payments/orders', { milestoneId, amountMinor: 1 }).expect(201);
  const payment = response.body.data;
  const order = { id: payment.paypalOrderId, status: 'APPROVED', purchase_units: [{ custom_id: milestoneId, invoice_id: payment.id, amount: { currency_code: 'USD', value: '150.00' }, payments: { captures: [] as { id: string; status: string; amount: { currency_code: string; value: string } }[] } }] };
  const captured = structuredClone(order);
  captured.status = 'COMPLETED';
  captured.purchase_units[0].payments.captures = [{ id: `CAPTURE-${payment.id}`, status: 'COMPLETED', amount: { currency_code: 'USD', value: '150.00' } }];
  vi.mocked(gateway.get).mockResolvedValue(order);
  vi.mocked(gateway.capture).mockResolvedValue(captured);
  return { payment, order, captured };
}
beforeAll(async () => {
  execFileSync(process.execPath, ['../node_modules/tsx/dist/cli.mjs', 'scripts/migrate.ts'], { env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: 'pipe' });
  client = await register('CLIENT', 'client@test.local');
  freelancer = await register('FREELANCER', 'freelancer@test.local');
  stranger = await register('CLIENT', 'stranger@test.local');
  otherFreelancer = await register('FREELANCER', 'other@test.local');
}, 60_000);
beforeEach(() => {
  vi.mocked(gateway.create).mockReset().mockImplementation(async () => ({ id: `ORDER-${crypto.randomUUID()}`, status: 'CREATED' }));
  vi.mocked(gateway.get).mockReset(); vi.mocked(gateway.capture).mockReset();
});
afterAll(async () => { await db.$disconnect(); });

describe('authentication and private project access', () => {
  it('stores hashes, uses HttpOnly cookies and never returns password hashes', async () => {
    const response = await client.agent.get('/api/auth/me').expect(200);
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    const user = await db.user.findUniqueOrThrow({ where: { id: client.id } });
    expect(user.passwordHash).toMatch(/^\$2/);
    const session = await db.session.findFirstOrThrow({ where: { userId: client.id } });
    expect(session.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
  it('rejects anonymous requests, wrong passwords, duplicate email and CSRF', async () => {
    await request(app).get('/api/projects').expect(401);
    await request(app).post('/api/auth/login').send({ email: client.email, password: 'WrongPassword2026!' }).expect(401);
    await request(app).post('/api/auth/register').send({ name: 'Duplicate', email: client.email.toUpperCase(), password: 'StrongPassword2026!', role: 'CLIENT' }).expect(409);
    await client.agent.post('/api/projects').send({}).expect(403);
    await post(client, '/api/projects').set('Origin', 'https://hostile.example').expect(403);
  });
  it('expires sessions and invalidates logout on the server', async () => {
    const agent = request.agent(app);
    const login = await agent.post('/api/auth/login').send({ email: client.email, password: 'StrongPassword2026!' }).expect(200);
    expect(login.headers['set-cookie'][0]).toContain('HttpOnly');
    const cookie = login.headers['set-cookie'][0].split(';')[0].split('=')[1];
    await db.session.update({ where: { tokenHash: hashToken(cookie) }, data: { expiresAt: new Date(0) } });
    await agent.get('/api/auth/me').expect(401);
    const again = await agent.post('/api/auth/login').send({ email: client.email, password: 'StrongPassword2026!' }).expect(200);
    await agent.post('/api/auth/logout').set('X-CSRF-Token', again.body.data.csrfToken).expect(200);
    await agent.get('/api/auth/me').expect(401);
  });
  it('enforces role and ownership for projects, milestones, submissions and audit', async () => {
    const p = await project(); const m = await milestone(p);
    await post(freelancer, '/api/projects', {}).expect(403);
    await stranger.agent.get(`/api/projects/${p}`).expect(404);
    await otherFreelancer.agent.get(`/api/milestones/${m}`).expect(404);
    await post(otherFreelancer, `/api/milestones/${m}/submissions`, evidence).expect(404);
    await stranger.agent.get(`/api/projects/${p}/audit`).expect(404);
    await post(stranger, `/api/milestones/${m}/decision`, {}).expect(404);
  });
});
describe('budget, revision and decision workflow', () => {
  it('enforces integer budgets, allocation totals and agreement locks', async () => {
    const p = await project(); const m = await milestone(p, 60000);
    await post(client, `/api/projects/${p}/milestones`, { title: 'Extra', description: 'No budget left', amountMinor: 1, acceptanceCriteria: ['Test the app'] }).expect(409);
    await post(client, `/api/projects/${p}/milestones`, { title: 'Float', description: 'Bad amount', amountMinor: 1.5, acceptanceCriteria: ['Test the app'] }).expect(400);
    await client.agent.patch(`/api/projects/${p}`).set('X-CSRF-Token', client.csrf).send({ budgetMinor: 59999 }).expect(409);
    await post(freelancer, `/api/milestones/${m}/submissions`, evidence).expect(201);
    await client.agent.patch(`/api/milestones/${m}`).set('X-CSRF-Token', client.csrf).send({ title: 'Changed scope', description: 'Changed scope now', amountMinor: 1, acceptanceCriteria: ['Changed requirements'] }).expect(409);
    await client.agent.patch(`/api/projects/${p}`).set('X-CSRF-Token', client.csrf).send({ freelancerEmail: otherFreelancer.email }).expect(409);
  });
  it('preserves revisions, rejects stale decisions, and keeps AI advisory', async () => {
    const p = await project(); const m = await milestone(p);
    const first = await post(freelancer, `/api/milestones/${m}/submissions`, evidence).expect(201);
    await post(client, `/api/milestones/${m}/decision`, { submissionId: first.body.data.id, decision: 'APPROVED', notes: 'Too early' }).expect(409);
    const evaluation = await post(client, `/api/ai/submissions/${first.body.data.id}/evaluate`).expect(201);
    expect(evaluation.body.data.provider).toBe('mock');
    expect((await db.milestone.findUniqueOrThrow({ where: { id: m } })).status).toBe('SUBMITTED');
    await post(client, `/api/milestones/${m}/review`).expect(200);
    await post(client, `/api/milestones/${m}/decision`, { submissionId: first.body.data.id, decision: 'CHANGES_REQUESTED', notes: 'Please add mobile evidence.' }).expect(201);
    const second = await post(freelancer, `/api/milestones/${m}/submissions`, evidence).expect(201);
    expect(second.body.data.revisionNumber).toBe(2);
    await post(client, `/api/milestones/${m}/review`).expect(200);
    await post(client, `/api/milestones/${m}/decision`, { submissionId: first.body.data.id, decision: 'APPROVED', notes: 'Stale evidence' }).expect(409);
    await post(client, `/api/milestones/${m}/decision`, { submissionId: second.body.data.id, decision: 'APPROVED', notes: 'Inspected current evidence.' }).expect(201);
    await post(client, `/api/milestones/${m}/decision`, { submissionId: second.body.data.id, decision: 'APPROVED', notes: 'Repeated decision' }).expect(409);
    expect(await db.submission.count({ where: { milestoneId: m } })).toBe(2);
    expect(await db.auditLog.count({ where: { projectId: p } })).toBeGreaterThan(5);
  });
  it('returns editable AI proposals without persisting agreements', async () => {
    const p = await project();
    const response = await post(client, '/api/ai/milestones/draft', { title: 'Website', description: 'Accessible studio website', requirements: 'Mobile first', deliverables: 'Code and design', budgetMinor: 60000 }).expect(200);
    expect(response.body.data.simulated).toBe(true);
    expect(await db.milestone.count({ where: { projectId: p } })).toBe(0);
  });
});
describe('controlled PayPal contracts - never real payments', () => {
  it('creates server-priced orders, captures once, and persists exactly one receipt', async () => {
    const { milestoneId } = await approved();
    const { payment } = await orderFixture(milestoneId);
    const createBody = vi.mocked(gateway.create).mock.calls[0][0] as { purchase_units: { amount: { value: string } }[] };
    expect(createBody.purchase_units[0].amount.value).toBe('150.00');
    await post(client, `/api/payments/orders/${payment.paypalOrderId}/capture`).expect(200);
    await post(client, `/api/payments/orders/${payment.paypalOrderId}/capture`).expect(200);
    expect(gateway.capture).toHaveBeenCalledTimes(1);
    expect((await db.milestone.findUniqueOrThrow({ where: { id: milestoneId } })).status).toBe('PAID');
    expect(await db.payment.count({ where: { milestoneId, status: 'COMPLETED' } })).toBe(1);
    expect((await freelancer.agent.get('/api/payments/history').expect(200)).body.data.some((p: { id: string }) => p.id === payment.id)).toBe(true);
  });
  it('rejects unauthorized capture and unapproved payment', async () => {
    const p = await project(); const m = await milestone(p);
    await post(client, '/api/payments/orders', { milestoneId: m }).expect(409);
    const { milestoneId } = await approved(); const { payment } = await orderFixture(milestoneId);
    await post(stranger, `/api/payments/orders/${payment.paypalOrderId}/capture`).expect(404);
    await post(freelancer, `/api/payments/orders/${payment.paypalOrderId}/capture`).expect(403);
    await post(client, '/api/payments/orders/UNKNOWN/capture').expect(404);
    expect(gateway.capture).not.toHaveBeenCalled();
  });
  it.each(['amount', 'currency', 'order', 'pending', 'invoice'])('never marks paid for wrong %s', async mismatch => {
    const { milestoneId } = await approved(); const { payment, captured } = await orderFixture(milestoneId);
    if (mismatch === 'amount') captured.purchase_units[0].payments.captures[0].amount.value = '1.00';
    if (mismatch === 'currency') captured.purchase_units[0].payments.captures[0].amount.currency_code = 'EUR';
    if (mismatch === 'order') captured.id = 'WRONG';
    if (mismatch === 'pending') captured.purchase_units[0].payments.captures[0].status = 'PENDING';
    if (mismatch === 'invoice') captured.purchase_units[0].invoice_id = 'WRONG';
    vi.mocked(gateway.capture).mockResolvedValue(captured);
    await post(client, `/api/payments/orders/${payment.paypalOrderId}/capture`).expect(502);
    expect((await db.milestone.findUniqueOrThrow({ where: { id: milestoneId } })).status).not.toBe('PAID');
  });
  it('reconciles a capture timeout without recapturing a completed order', async () => {
    const { milestoneId } = await approved(); const { payment, captured } = await orderFixture(milestoneId);
    vi.mocked(gateway.capture).mockRejectedValueOnce(new Error('controlled timeout'));
    await post(client, `/api/payments/orders/${payment.paypalOrderId}/capture`).expect(500);
    expect((await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('UNCERTAIN');
    vi.mocked(gateway.get).mockResolvedValue(captured);
    await post(client, `/api/payments/orders/${payment.paypalOrderId}/capture`).expect(200);
    expect(gateway.capture).toHaveBeenCalledTimes(1);
  });
  it('serializes concurrent capture requests with a database lease', async () => {
    const { milestoneId } = await approved(); const { payment, captured } = await orderFixture(milestoneId);
    vi.mocked(gateway.capture).mockImplementation(async () => { await new Promise(resolve => setTimeout(resolve, 100)); return captured; });
    const responses = await Promise.all([post(client, `/api/payments/orders/${payment.paypalOrderId}/capture`), post(client, `/api/payments/orders/${payment.paypalOrderId}/capture`)]);
    expect(responses.map(r => r.status).sort()).toEqual([200, 409]);
    expect(gateway.capture).toHaveBeenCalledTimes(1);
  });
  it('reuses persistent creation IDs after an ambiguous network failure', async () => {
    const { milestoneId } = await approved();
    vi.mocked(gateway.create).mockRejectedValueOnce(new Error('controlled timeout')).mockResolvedValueOnce({ id: 'RETRY-ORDER', status: 'CREATED' });
    await post(client, '/api/payments/orders', { milestoneId }).expect(500);
    await post(client, '/api/payments/orders', { milestoneId }).expect(201);
    expect(vi.mocked(gateway.create).mock.calls[0][1]).toBe(vi.mocked(gateway.create).mock.calls[1][1]);
    expect(await db.payment.count({ where: { milestoneId } })).toBe(1);
  });
  it('requires buyer approval and does not record a false paid state', async () => {
    const { milestoneId } = await approved(); const { payment, order } = await orderFixture(milestoneId);
    order.status = 'CREATED'; vi.mocked(gateway.get).mockResolvedValue(order);
    await post(client, `/api/payments/orders/${payment.paypalOrderId}/capture`).expect(409);
    expect(gateway.capture).not.toHaveBeenCalled();
  });
  it('reports unconfigured Sandbox checkout truthfully through the API', async () => {
    const unconfigured = createApp(config, { db, paypal: { ...gateway, configured: false, clientId: '' } });
    const agent = request.agent(unconfigured);
    const login = await agent.post('/api/auth/login').send({ email: client.email, password: 'StrongPassword2026!' }).expect(200);
    const { milestoneId } = await approved();
    await agent.post('/api/payments/orders').set('X-CSRF-Token', login.body.data.csrfToken).send({ milestoneId }).expect(503);
    expect(await db.payment.count({ where: { milestoneId } })).toBe(0);
  });
  it('blocks expired create retries and preserves the original unresolved attempt', async () => {
    const { milestoneId } = await approved();
    vi.mocked(gateway.create).mockRejectedValueOnce(new Error('controlled timeout'));
    await post(client, '/api/payments/orders', { milestoneId }).expect(500);
    await db.payment.update({ where: { milestoneId }, data: { createdAt: new Date(Date.now() - 6 * 3600_000) } });
    await post(client, '/api/payments/orders', { milestoneId }).expect(409);
    expect(gateway.create).toHaveBeenCalledTimes(1);
  });
  it('rejects mismatched approved amounts before making a capture request', async () => {
    const { milestoneId } = await approved(); const { payment, order } = await orderFixture(milestoneId);
    order.purchase_units[0].amount.value = '0.01';
    vi.mocked(gateway.get).mockResolvedValue(order);
    await post(client, `/api/payments/orders/${payment.paypalOrderId}/capture`).expect(502);
    expect(gateway.capture).not.toHaveBeenCalled();
  });
  it('enforces globally unique capture IDs without paying a second milestone', async () => {
    const first = await approved(); const firstOrder = await orderFixture(first.milestoneId);
    await post(client, `/api/payments/orders/${firstOrder.payment.paypalOrderId}/capture`).expect(200);
    const second = await approved(); const secondOrder = await orderFixture(second.milestoneId);
    secondOrder.captured.purchase_units[0].payments.captures[0].id = firstOrder.captured.purchase_units[0].payments.captures[0].id;
    vi.mocked(gateway.capture).mockResolvedValue(secondOrder.captured);
    await post(client, `/api/payments/orders/${secondOrder.payment.paypalOrderId}/capture`).expect(409);
    expect((await db.milestone.findUniqueOrThrow({ where: { id: second.milestoneId } })).status).not.toBe('PAID');
  });
});
