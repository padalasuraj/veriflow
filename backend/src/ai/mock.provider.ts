import type { AiProvider } from './provider.interface.js';
import type { PlanInput, EvaluationInput } from './schemas.js';
import { requireCondition } from '../utils/errors.js';

export const mockProvider: AiProvider = {
  mode: 'mock', model: 'deterministic-v1',
  async plan(input: PlanInput) {
    requireCondition(input.budgetMinor >= 3, 400, 'INVALID_BUDGET', 'At least three minor units are needed for this plan.');
    const first = Math.max(1, Math.floor(input.budgetMinor / 4));
    const second = Math.max(1, Math.floor(input.budgetMinor * 5 / 12));
    return { milestones: ['Design agreement', 'Implementation', 'Final verification'].map((title, i) => ({
      title: `${input.title}: ${title}`.slice(0, 150), description: `Simulated plan: ${input.deliverables.slice(0, 500)}. Stage: ${title}.`,
      amountMinor: [first, second, input.budgetMinor - first - second][i],
      acceptanceCriteria: [`Demonstrate ${title.toLowerCase()} against the agreed requirements.`, 'Provide reproducible evidence and client review notes.'],
      dependencies: i ? ['Client acceptance of the preceding milestone'] : [], risks: ['Simulated suggestion: review scope and allocation before saving.'],
    })) };
  },
  async evaluate(input: EvaluationInput) {
    return {
      criteria: input.acceptanceCriteria.map(criterion => ({ criterion, assessment: 'MISSING_EVIDENCE' as const, evidence: 'Only freelancer statements and URL strings were supplied; no independent inspection was performed.' })),
      evidenceSummary: `Simulated evaluation of submitted text: ${input.submission.description.slice(0, 300)}`,
      missingRequirements: [...input.acceptanceCriteria], unverifiedClaims: ['Submitted descriptions, notes and linked content have not been independently verified.'],
      risks: ['Textual claims alone cannot establish delivery quality.'], nextSteps: ['Client should inspect the deliverables and request reproducible evidence.'],
      recommendation: 'MORE_EVIDENCE_REQUIRED' as const,
      limitations: ['MOCK MODE: deterministic simulation, not a real AI assessment.', 'No repository or live website was fetched, inspected, or tested.'],
    };
  },
};
