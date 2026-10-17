import type { MilestoneStatus } from '@prisma/client';
import { requireCondition } from '../utils/errors.js';

const transitions: Record<MilestoneStatus, MilestoneStatus[]> = {
  DRAFT: ['OPEN'], OPEN: ['SUBMITTED'], SUBMITTED: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['CHANGES_REQUESTED', 'APPROVED'], CHANGES_REQUESTED: ['SUBMITTED'],
  APPROVED: ['PAYMENT_PENDING'], PAYMENT_PENDING: ['PAID', 'PAYMENT_FAILED'],
  PAYMENT_FAILED: ['PAYMENT_PENDING'], PAID: [],
};
export function assertTransition(from: MilestoneStatus, to: MilestoneStatus) {
  requireCondition(transitions[from].includes(to), 409, 'INVALID_TRANSITION', `Cannot move ${from} to ${to}.`);
}
