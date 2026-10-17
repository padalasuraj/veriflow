import type { Plan, Evaluation, PlanInput, EvaluationInput } from './schemas.js';

export interface AiProvider {
  mode: 'mock' | 'real';
  model: string;
  plan(input: PlanInput): Promise<Plan>;
  evaluate(input: EvaluationInput): Promise<Evaluation>;
}
