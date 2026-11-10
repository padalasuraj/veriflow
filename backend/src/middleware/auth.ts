import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { RequestHandler, Request } from 'express';
import type { Role } from '@prisma/client';
import type { Database } from '../config/database.js';
import type { Config } from '../config/env.js';
import { ApiError, requireCondition } from '../utils/errors.js';

export const publicUser = { id: true, name: true, email: true, role: true, isDemo: true } as const;
const identityUser = { ...publicUser, demoGroupId: true } as const;
export type Identity = { id: string; name: string; email: string; role: Role; isDemo: boolean; demoGroupId: string | null; csrfToken: string };
declare module 'express-serve-static-core' {
  interface Request { identity?: Identity }
}
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export const cookieName = (config: Config) => config.NODE_ENV === 'production' ? '__Host-veriflow_session' : 'veriflow_session';
export const cookieOptions = (config: Config) => ({ httpOnly: true, secure: config.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' });
export const demoSessionDuration = 100 * 365 * 24 * 60 * 60_000;
export const demoCookieDuration = 400 * 24 * 60 * 60_000;

export async function newSession(db: Database, userId: string, duration = 7 * 86400_000) {
  const token = randomBytes(32).toString('hex');
  const csrfToken = randomBytes(32).toString('hex');
  await db.session.create({ data: { userId, tokenHash: hashToken(token), csrfToken, expiresAt: new Date(Date.now() + duration) } });
  return { token, csrfToken };
}

export function authentication(db: Database, config: Config): RequestHandler {
  return async (req, res, next) => {
    const token: unknown = req.cookies?.[cookieName(config)];
    if (typeof token === 'string' && /^[a-f0-9]{64}$/.test(token)) {
      const session = await db.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: { select: identityUser } } });
      if (session && session.expiresAt.getTime() > Date.now()) {
        req.identity = { ...session.user, csrfToken: session.csrfToken };
        if (session.user.isDemo && !['/api/auth/demo-role', '/api/auth/logout'].includes(req.path)) {
          res.cookie(cookieName(config), token, { ...cookieOptions(config), maxAge: demoCookieDuration });
        }
      }
    }
    next();
  };
}

export const protect: RequestHandler = (req, _res, next) => {
  if (!req.identity) throw new ApiError(401, 'UNAUTHENTICATED', 'Please log in.');
  next();
};
export const identity = (req: Request) => {
  requireCondition(req.identity, 401, 'UNAUTHENTICATED', 'Please log in.');
  return req.identity;
};
export function requireRole(req: Request, role: Role) {
  const user = identity(req);
  requireCondition(user.role === role, 403, 'FORBIDDEN', 'Your role cannot perform this action.');
  return user;
}

export function csrf(config: Config): RequestHandler {
  return (req, _res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const origin = req.get('origin');
    requireCondition(!origin || origin === config.FRONTEND_ORIGIN, 403, 'CSRF', 'Request origin is not allowed.');
    requireCondition(req.get('sec-fetch-site') !== 'cross-site', 403, 'CSRF', 'Cross-site request rejected.');
    if (req.method === 'POST' && req.path === '/api/auth/demo') return next();
    if (req.identity) {
      const token = req.get('x-csrf-token') ?? '';
      const expected = req.identity.csrfToken;
      const receivedBytes = Buffer.from(token);
      const expectedBytes = Buffer.from(expected);
      requireCondition(receivedBytes.length === expectedBytes.length && timingSafeEqual(receivedBytes, expectedBytes), 403, 'CSRF', 'Refresh your session and try again.');
    }
    next();
  };
}
