import { z } from 'zod';
import { minorSchema } from '../utils/money.js';

export const planSchema = z.object({
  milestones: z.array(z.object({ title: z.string().min(3).max(150), description: z.string().min(3).max(4000), amountMinor: minorSchema,
    acceptanceCriteria: z.array(z.string().min(3).max(500)).min(1).max(20), dependencies: z.array(z.string()), risks: z.array(z.string()) })).min(1).max(10),
});
export const evaluationSchema = z.object({
  criteria: z.array(z.object({ criterion: z.string(), assessment: z.enum(['SUPPORTED_BY_STATEMENT', 'MISSING_EVIDENCE', 'POTENTIAL_MISMATCH']), evidence: z.string() })).min(1).max(20),
  evidenceSummary: z.string(), missingRequirements: z.array(z.string()), unverifiedClaims: z.array(z.string()), risks: z.array(z.string()), nextSteps: z.array(z.string()),
  recommendation: z.enum(['READY_FOR_HUMAN_REVIEW', 'MORE_EVIDENCE_REQUIRED', 'POTENTIAL_MISMATCH']), limitations: z.array(z.string()).min(1),
});
export type Plan = z.infer<typeof planSchema>;
export type Evaluation = z.infer<typeof evaluationSchema>;
export interface PlanInput { title: string; description: string; requirements: string; deliverables: string; budgetMinor: number }
export interface EvaluationInput { title: string; description: string; acceptanceCriteria: string[]; submission: { description: string; evidenceNotes: string; githubUrl?: string | null; demoUrl?: string | null } }
