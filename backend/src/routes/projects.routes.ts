import { Router } from 'express';
import { z } from 'zod';
import type { Database } from '../config/database.js';
import { identity, protect, requireRole } from '../middleware/auth.js';
import { audit, projectAccess } from '../services/access.js';
import { currencySchema, minorSchema } from '../utils/money.js';
import { requireCondition } from '../utils/errors.js';

const projectSchema = z.object({
  title: z.string().trim().min(3).max(150), description: z.string().trim().min(10).max(8000),
  requirements: z.string().trim().min(3).max(8000), deliverables: z.string().trim().min(3).max(4000),
  currency: currencySchema, budgetMinor: minorSchema, freelancerEmail: z.email().optional(),
});
export const milestoneSchema = z.object({
  title: z.string().trim().min(3).max(150), description: z.string().trim().min(3).max(4000),
  amountMinor: minorSchema, acceptanceCriteria: z.array(z.string().trim().min(3).max(500)).min(1).max(20),
  status: z.enum(['DRAFT', 'OPEN']).default('OPEN'),
});

export function projectRoutes(db: Database) {
  const router = Router();
  router.use(protect);
  router.get('/', async (req, res) => {
    const user = identity(req);
    const projects = await db.project.findMany({ where: { OR: [{ clientId: user.id }, { freelancerId: user.id }] }, orderBy: { createdAt: 'desc' }, take: 100, include: { milestones: { orderBy: { sequence: 'asc' } }, freelancer: { select: { name: true } } } });
    res.json({ data: projects });
  });
  router.post('/', async (req, res) => {
    const user = requireRole(req, 'CLIENT');
    const input = projectSchema.parse(req.body);
    const freelancer = input.freelancerEmail ? await db.user.findUnique({ where: { email: input.freelancerEmail.toLowerCase() } }) : null;
    requireCondition(!input.freelancerEmail || freelancer?.role === 'FREELANCER', 400, 'INVALID_FREELANCER', 'Use the email of a registered freelancer.');
    const { freelancerEmail: _email, ...data } = input;
    void _email;
    const project = await db.$transaction(async tx => {
      const created = await tx.project.create({ data: { ...data, clientId: user.id, freelancerId: freelancer?.id } });
      await tx.auditLog.create({ data: audit(user.id, created.id, 'PROJECT_CREATED') });
      return created;
    });
    res.status(201).json({ data: project });
  });
  router.get('/:id', async (req, res) => {
    const project = await projectAccess(db, String(req.params.id), identity(req));
    const milestones = await db.milestone.findMany({ where: { projectId: project.id }, orderBy: { sequence: 'asc' }, include: { payment: true, _count: { select: { submissions: true } } } });
    res.json({ data: { ...project, milestones } });
  });
  router.patch('/:id', async (req, res) => {
    const user = requireRole(req, 'CLIENT');
    const project = await projectAccess(db, String(req.params.id), user, true);
    const input = projectSchema.partial().parse(req.body);
    const freelancer = input.freelancerEmail ? await db.user.findUnique({ where: { email: input.freelancerEmail.toLowerCase() } }) : null;
    requireCondition(!input.freelancerEmail || freelancer?.role === 'FREELANCER', 400, 'INVALID_FREELANCER', 'Use the email of a registered freelancer.');
    const { freelancerEmail, ...data } = input;
    const updated = await db.$transaction(async tx => {
      const milestones = await tx.milestone.findMany({ where: { projectId: project.id }, include: { _count: { select: { submissions: true } } } });
      const total = milestones.reduce((sum, m) => sum + m.amountMinor, 0);
      requireCondition(input.budgetMinor === undefined || input.budgetMinor >= total, 409, 'BUDGET_EXCEEDED', 'Budget cannot be lower than allocated milestones.');
      requireCondition(!input.currency || input.currency === project.currency || milestones.length === 0, 409, 'CURRENCY_LOCKED', 'Currency cannot change after milestones exist.');
      requireCondition(!freelancerEmail || freelancer?.id === project.freelancerId || milestones.every(m => m._count.submissions === 0), 409, 'ASSIGNMENT_LOCKED', 'Assignment cannot change after evidence is submitted.');
      const result = await tx.project.update({ where: { id: project.id }, data: { ...data, ...(freelancerEmail ? { freelancerId: freelancer!.id } : {}) } });
      await tx.auditLog.create({ data: audit(user.id, project.id, 'PROJECT_UPDATED') });
      return result;
    });
    res.json({ data: updated });
  });
  router.get('/:id/milestones', async (req, res) => {
    const project = await projectAccess(db, String(req.params.id), identity(req));
    res.json({ data: await db.milestone.findMany({ where: { projectId: project.id }, orderBy: { sequence: 'asc' } }) });
  });
  router.post('/:id/milestones', async (req, res) => {
    const user = requireRole(req, 'CLIENT');
    const project = await projectAccess(db, String(req.params.id), user, true);
    const input = milestoneSchema.parse(req.body);
    const milestone = await db.$transaction(async tx => {
      const totals = await tx.milestone.aggregate({ where: { projectId: project.id }, _sum: { amountMinor: true }, _max: { sequence: true } });
      const current = await tx.project.findUniqueOrThrow({ where: { id: project.id } });
      requireCondition((totals._sum.amountMinor ?? 0) + input.amountMinor <= current.budgetMinor, 409, 'BUDGET_EXCEEDED', 'Milestone allocation exceeds the project budget.');
      const created = await tx.milestone.create({ data: { ...input, projectId: project.id, sequence: (totals._max.sequence ?? 0) + 1 } });
      await tx.auditLog.create({ data: audit(user.id, project.id, 'MILESTONE_CREATED', created.id) });
      return created;
    });
    res.status(201).json({ data: milestone });
  });
  router.get('/:id/audit', async (req, res) => {
    const project = await projectAccess(db, String(req.params.id), identity(req));
    const offset = z.coerce.number().int().min(0).default(0).parse(req.query.offset);
    res.json({ data: await db.auditLog.findMany({ where: { projectId: project.id }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: offset, take: 100, include: { actor: { select: { name: true } } } }) });
  });
  return router;
}
