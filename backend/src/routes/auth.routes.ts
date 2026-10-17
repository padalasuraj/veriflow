import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import type { Database } from '../config/database.js';
import type { Config } from '../config/env.js';
import { cookieName, cookieOptions, hashToken, identity, newSession, protect, publicUser } from '../middleware/auth.js';
import { requireCondition } from '../utils/errors.js';

const credentials = z.object({ email: z.email().max(254).transform(s => s.toLowerCase()), password: z.string().min(10).max(72).refine(s => Buffer.byteLength(s) <= 72, 'Password must be at most 72 UTF-8 bytes.') });
const registration = credentials.extend({ name: z.string().trim().min(2).max(100), role: z.enum(['CLIENT', 'FREELANCER']) });
export function authRoutes(db: Database, config: Config) {
  const router = Router();
  const limit = rateLimit({ windowMs: 15 * 60_000, limit: config.NODE_ENV === 'test' ? 1000 : 30, message: { error: { code: 'AUTH_RATE_LIMIT', message: 'Too many sign-in attempts. Try again later.' } } });
  const issue = async (userId: string, res: import('express').Response) => {
    const session = await newSession(db, userId);
    res.cookie(cookieName(config), session.token, { ...cookieOptions(config), maxAge: 7 * 86400_000 });
    return session.csrfToken;
  };
  router.post('/register', limit, async (req, res) => {
    const input = registration.parse(req.body);
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await db.user.create({ data: { name: input.name, email: input.email, role: input.role, passwordHash }, select: publicUser });
    const csrfToken = await issue(user.id, res);
    res.status(201).json({ data: { user, csrfToken } });
  });
  router.post('/login', limit, async (req, res) => {
    const input = credentials.parse(req.body);
    const user = await db.user.findUnique({ where: { email: input.email } });
    // A valid constant bcrypt hash avoids a fast missing-user path.
    const matches = await bcrypt.compare(input.password, user?.passwordHash ?? '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6Ttxp2nLSwoZdH1JwZ6FlC7xtu1W2');
    requireCondition(user && matches, 401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    if (req.identity) await db.session.deleteMany({ where: { tokenHash: hashToken(req.cookies[cookieName(config)]) } });
    const csrfToken = await issue(user.id, res);
    res.json({ data: { user: { id: user.id, name: user.name, email: user.email, role: user.role }, csrfToken } });
  });
  router.get('/me', protect, (req, res) => {
    const { csrfToken, ...user } = identity(req);
    res.json({ data: { user, csrfToken } });
  });
  router.post('/logout', protect, async (req, res) => {
    await db.session.deleteMany({ where: { tokenHash: hashToken(req.cookies[cookieName(config)]) } });
    res.clearCookie(cookieName(config), cookieOptions(config));
    res.json({ data: { loggedOut: true } });
  });
  return router;
}
