import type { Prisma } from '@prisma/client';
import type { Database } from '../config/database.js';
import type { Identity } from '../middleware/auth.js';
import { requireCondition } from '../utils/errors.js';

export async function projectAccess(db: Database, id: string, user: Identity, clientOnly = false) {
  const project = await db.project.findUnique({ where: { id }, include: { client: { select: { id: true, name: true } }, freelancer: { select: { id: true, name: true } } } });
  requireCondition(project && (project.clientId === user.id || (!clientOnly && project.freelancerId === user.id)), 404, 'NOT_FOUND', 'Project not found.');
  return project;
}
export async function milestoneAccess(db: Database, id: string, user: Identity, clientOnly = false) {
  const milestone = await db.milestone.findUnique({ where: { id } });
  requireCondition(milestone, 404, 'NOT_FOUND', 'Milestone not found.');
  const project = await projectAccess(db, milestone.projectId, user, clientOnly);
  return { milestone, project };
}
export const audit = (actorId: string, projectId: string, eventType: string, milestoneId?: string, metadataJson: Prisma.InputJsonValue = {}) => ({ actorId, projectId, eventType, milestoneId, metadataJson });
