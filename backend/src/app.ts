import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { envSchema } from './config/env.js';
import { db as defaultDb, type Database } from './config/database.js';
import { authentication, csrf, identity, protect } from './middleware/auth.js';
import { authRoutes } from './routes/auth.routes.js';
import { projectRoutes } from './routes/projects.routes.js';
import { milestoneRoutes } from './routes/milestones.routes.js';
import { aiRoutes } from './routes/ai.routes.js';
import { paymentRoutes } from './routes/payments.routes.js';
import { realProvider } from './ai/real.provider.js';
import { mockProvider } from './ai/mock.provider.js';
import type { AiProvider } from './ai/provider.interface.js';
import { paypalClient, type PayPalGateway } from './paypal/client.js';
import { ApiError, requireCondition } from './utils/errors.js';
import { milestoneAccess } from './services/access.js';

export function createApp(config = envSchema.parse(process.env), dependencies: { db?: Database; ai?: AiProvider; paypal?: PayPalGateway } = {}) {
  const db = dependencies.db ?? defaultDb;
  const ai = dependencies.ai ?? (config.AI_MODE === 'real' ? realProvider(config) : mockProvider);
  const paypal = dependencies.paypal ?? paypalClient(config);
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.FRONTEND_ORIGIN, credentials: true }));
  app.use(rateLimit({ windowMs: 60_000, limit: config.NODE_ENV === 'test' ? 10000 : 300, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again shortly.' } } }));
  app.use(express.json({ limit: '100kb' }));
  app.get('/api/health', (_req, res) => {
    res.json({ data: {
      status: 'ok', service: 'veriflow-api', version: '0.1.0',
      integrations: { ai: config.AI_MODE === 'mock' ? 'mock_simulated' : config.AI_API_KEY ? 'real_configured_not_verified' : 'real_unconfigured', paypal: paypal.configured ? 'sandbox_configured_not_verified' : 'sandbox_unconfigured', database: 'sqlite_configured' },
    } });
  });
  app.use(cookieParser());
  app.use(authentication(db, config));
  app.use(csrf(config));
  app.use('/api/auth', authRoutes(db, config));
  app.use('/api/projects', projectRoutes(db));
  app.use('/api/milestones', milestoneRoutes(db));
  app.use('/api/ai', aiRoutes(db, ai));
  app.use('/api/payments', paymentRoutes(db, paypal));
  app.get('/api/submissions/:id', protect, async (req, res) => {
    const submission = await db.submission.findUnique({ where: { id: String(req.params.id) }, include: { evaluations: { orderBy: { createdAt: 'desc' } } } });
    requireCondition(submission, 404, 'NOT_FOUND', 'Submission not found.');
    await milestoneAccess(db, submission.milestoneId, identity(req));
    res.json({ data: submission });
  });
  app.use((_req, res) => { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } }); });
  const handleError: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    void _next; // Express requires four arguments to recognize error middleware.
    if (error instanceof ApiError) { res.status(error.status).json({ error: { code: error.code, message: error.message } }); return; }
    if (error instanceof ZodError) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Check the submitted fields.', fields: error.issues.map(i => ({ path: i.path.join('.'), message: i.message })) } }); return; }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const conflict = ['P2002', 'P2034', 'P2028', 'P1008'].includes(error.code);
      res.status(conflict ? 409 : 500).json({ error: { code: conflict ? 'CONFLICT' : 'DATABASE_ERROR', message: conflict ? 'This record already exists or was changed by another request. Refresh and retry.' : 'The database operation could not be completed.' } }); return;
    }
    const status = typeof error === 'object' && error !== null && 'status' in error ? error.status : 500;
    if (status === 400 || status === 413) {
      res.status(status).json({ error: { code: 'INVALID_REQUEST', message: status === 413 ? 'Request body too large.' : 'Invalid JSON body.' } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } });
  };
  app.use(handleError);
  return app;
}
