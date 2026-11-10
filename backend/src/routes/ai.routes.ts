import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import type { Database } from '../config/database.js';
import type { AiProvider } from '../ai/provider.interface.js';
import { mockProvider } from '../ai/mock.provider.js';
import { evaluationSchema, planSchema } from '../ai/schemas.js';
import { identity, protect, requireRole } from '../middleware/auth.js';
import { audit, milestoneAccess } from '../services/access.js';
import { requireCondition } from '../utils/errors.js';
import { minorSchema } from '../utils/money.js';

export function aiRoutes(db: Database, ai: AiProvider) {
  const router = Router();
  router.use(protect, rateLimit({ windowMs: 60_000, limit: 10, message: { error: { code: 'AI_RATE_LIMIT', message: 'AI request limit reached. Try again in a minute.' } } }));
  router.post('/milestones/draft', async (req, res) => {
    const user = requireRole(req, 'CLIENT');
    const provider = user.isDemo ? mockProvider : ai;
    const input = z.object({ title: z.string().min(3).max(150), description: z.string().min(10).max(8000), requirements: z.string().min(3).max(8000), deliverables: z.string().min(3).max(4000), budgetMinor: minorSchema }).parse(req.body);
    const proposal = planSchema.parse(await provider.plan(input));
    requireCondition(proposal.milestones.reduce((sum, m) => sum + m.amountMinor, 0) === input.budgetMinor, 502, 'AI_ALLOCATION_INVALID', 'AI allocation did not match the budget. Retry or define milestones manually.');
    res.json({ data: { ...proposal, mode: provider.mode, model: provider.model, simulated: provider.mode === 'mock' } });
  });
  router.post('/submissions/:id/evaluate', async (req, res) => {
    const user = identity(req);
    const provider = user.isDemo ? mockProvider : ai;
    const submission = await db.submission.findUnique({ where: { id: String(req.params.id) } });
    requireCondition(submission, 404, 'NOT_FOUND', 'Submission not found.');
    const { milestone, project } = await milestoneAccess(db, submission.milestoneId, user);
    const criteria = z.array(z.string()).parse(milestone.acceptanceCriteria);
    const result = evaluationSchema.parse(await provider.evaluate({ title: milestone.title, description: milestone.description, acceptanceCriteria: criteria, submission: { description: submission.description, evidenceNotes: submission.evidenceNotes, githubUrl: submission.githubUrl, demoUrl: submission.demoUrl } }));
    requireCondition(result.criteria.length === criteria.length && result.criteria.every((item, i) => item.criterion === criteria[i]), 502, 'AI_CRITERIA_INVALID', 'AI response did not assess the agreed criteria.');
    // These limitations are server-owned and cannot be removed by a model response.
    result.limitations.push('Only submitted text and URL strings were assessed. No repository or live website was fetched, inspected, or tested.');
    if (provider.mode === 'mock') result.limitations.push('SIMULATED: deterministic mock provider.');
    const evaluation = await db.$transaction(async tx => {
      const created = await tx.aiEvaluation.create({ data: { submissionId: submission.id, provider: provider.mode === 'mock' ? 'mock' : 'openai', model: provider.model, assessmentJson: result, recommendation: result.recommendation, limitations: result.limitations.join('\n') } });
      // Advisory reports never change human decision or payment state.
      await tx.auditLog.create({ data: audit(user.id, project.id, 'AI_EVALUATED', milestone.id, { submissionId: submission.id, mode: provider.mode }) });
      return created;
    });
    res.status(201).json({ data: evaluation });
  });
  return router;
}
