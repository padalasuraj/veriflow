import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import type { Database } from '../config/database.js';
import type { Config } from '../config/env.js';
import { cookieName, cookieOptions, demoCookieDuration, demoSessionDuration, hashToken, identity, newSession, protect, publicUser } from '../middleware/auth.js';
import { requireCondition } from '../utils/errors.js';

const credentials = z.object({ email: z.email().max(254).transform(s => s.toLowerCase()), password: z.string().min(10).max(72).refine(s => Buffer.byteLength(s) <= 72, 'Password must be at most 72 UTF-8 bytes.') });
const registration = credentials.extend({ name: z.string().trim().min(2).max(100), role: z.enum(['CLIENT', 'FREELANCER']) });
const sessionUser = (user: { id: string; name: string; email: string; role: 'CLIENT' | 'FREELANCER'; isDemo: boolean }) => ({
  id: user.id, name: user.name, email: user.email, role: user.role, isDemo: user.isDemo,
});

export function authRoutes(db: Database, config: Config) {
  const router = Router();
  const limit = rateLimit({ windowMs: 15 * 60_000, limit: config.NODE_ENV === 'test' ? 1000 : 30, message: { error: { code: 'AUTH_RATE_LIMIT', message: 'Too many sign-in attempts. Try again later.' } } });
  const demoLimit = rateLimit({ windowMs: 60 * 60_000, limit: config.NODE_ENV === 'test' ? 1000 : 10, message: { error: { code: 'DEMO_RATE_LIMIT', message: 'Too many demo workspaces were started from this connection. Try again later.' } } });
  const issue = async (userId: string, res: import('express').Response, maxAge = 7 * 86400_000, sessionDuration = maxAge) => {
    const session = await newSession(db, userId, sessionDuration);
    res.cookie(cookieName(config), session.token, { ...cookieOptions(config), maxAge });
    return session.csrfToken;
  };
  router.post('/demo', demoLimit, async (req, res) => {
    if (req.identity?.isDemo) {
      res.json({ data: { user: sessionUser(req.identity), csrfToken: req.identity.csrfToken } });
      return;
    }
    if (req.identity) await db.session.deleteMany({ where: { tokenHash: hashToken(req.cookies[cookieName(config)]) } });
    const demoGroupId = randomUUID();
    const client = await db.$transaction(async tx => {
      const client = await tx.user.create({ data: {
        name: 'Demo Client', email: `${demoGroupId}.client@demo.invalid`, passwordHash: 'DEMO_SESSION_ONLY',
        role: 'CLIENT', isDemo: true, demoGroupId,
      } });
      const freelancer = await tx.user.create({ data: {
        name: 'Demo Freelancer', email: `${demoGroupId}.freelancer@demo.invalid`, passwordHash: 'DEMO_SESSION_ONLY',
        role: 'FREELANCER', isDemo: true, demoGroupId,
      } });
      await tx.project.create({ data: {
        title: 'Studio website launch', description: 'Design and build an accessible, responsive website for a small creative studio.',
        requirements: 'Responsive at mobile and desktop widths. Keyboard-accessible navigation and contact form validation.',
        deliverables: 'Design files, React source, deployed preview, and handover notes.',
        clientId: client.id, freelancerId: freelancer.id, currency: 'USD', budgetMinor: 60000,
        milestones: { create: [
          { title: 'UI Design', description: 'Agree on responsive layouts and visual direction.', sequence: 1, amountMinor: 15000, acceptanceCriteria: ['Provide desktop and mobile layouts.', 'Include navigation, contact form, and contrast specifications.'] },
          { title: 'Frontend Implementation', description: 'Implement the approved website with React.', sequence: 2, amountMinor: 25000, acceptanceCriteria: ['Navigation is keyboard accessible.', 'Contact form validates email and required fields.', 'Layout adapts at 390px and 1440px.'] },
          { title: 'Final Delivery', description: 'Deliver tested source and handover documentation.', sequence: 3, amountMinor: 20000, acceptanceCriteria: ['Provide reproducible build and test commands.', 'Deliver source repository and deployment instructions.'] },
        ] },
        auditLogs: { create: { actorId: client.id, eventType: 'DEMO_PROJECT_STARTED', metadataJson: { persistentDemo: true } } },
      } });
      return client;
    });
    const csrfToken = await issue(client.id, res, demoCookieDuration, demoSessionDuration);
    res.status(201).json({ data: { user: sessionUser(client), csrfToken } });
  });
  router.post('/demo-role', protect, async (req, res) => {
    const current = identity(req);
    requireCondition(current.isDemo && current.demoGroupId, 403, 'DEMO_ONLY', 'Role switching is only available in a demo workspace.');
    const { role } = z.object({ role: z.enum(['CLIENT', 'FREELANCER']) }).parse(req.body);
    const partner = await db.user.findFirst({ where: { demoGroupId: current.demoGroupId, isDemo: true, role } });
    requireCondition(partner, 404, 'DEMO_ROLE_NOT_FOUND', 'The requested demo role is unavailable.');
    await db.session.deleteMany({ where: { tokenHash: hashToken(req.cookies[cookieName(config)]) } });
    const csrfToken = await issue(partner.id, res, demoCookieDuration, demoSessionDuration);
    res.json({ data: { user: sessionUser(partner), csrfToken } });
  });
  router.post('/register', limit, async (req, res) => {
    const input = registration.parse(req.body);
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await db.user.create({ data: { name: input.name, email: input.email, role: input.role, passwordHash }, select: publicUser });
    const csrfToken = await issue(user.id, res);
    res.status(201).json({ data: { user: sessionUser(user), csrfToken } });
  });
  router.post('/login', limit, async (req, res) => {
    const input = credentials.parse(req.body);
    const user = await db.user.findUnique({ where: { email: input.email }, select: { ...publicUser, passwordHash: true } });
    // A valid constant bcrypt hash avoids a fast missing-user path.
    const matches = await bcrypt.compare(input.password, user && !user.isDemo ? user.passwordHash : '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6Ttxp2nLSwoZdH1JwZ6FlC7xtu1W2');
    requireCondition(user && !user.isDemo && matches, 401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    if (req.identity) await db.session.deleteMany({ where: { tokenHash: hashToken(req.cookies[cookieName(config)]) } });
    const csrfToken = await issue(user.id, res);
    res.json({ data: { user: sessionUser(user), csrfToken } });
  });
  router.get('/me', protect, (req, res) => {
    const current = identity(req);
    res.json({ data: { user: sessionUser(current), csrfToken: current.csrfToken } });
  });
  router.post('/logout', protect, async (req, res) => {
    await db.session.deleteMany({ where: { tokenHash: hashToken(req.cookies[cookieName(config)]) } });
    res.clearCookie(cookieName(config), cookieOptions(config));
    res.json({ data: { loggedOut: true } });
  });
  return router;
}
