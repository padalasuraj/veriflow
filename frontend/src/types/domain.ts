export interface User { id: string; name: string; email: string; role: 'CLIENT' | 'FREELANCER' }
export interface Session { user: User; csrfToken: string }
export type Status = 'DRAFT' | 'OPEN' | 'SUBMITTED' | 'UNDER_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'PAYMENT_PENDING' | 'PAYMENT_FAILED' | 'PAID';
export interface Project { id: string; title: string; description: string; requirements: string; deliverables: string; currency: string; budgetMinor: number; clientId: string; freelancerId: string | null; freelancer?: { id: string; name: string } | null; client?: { id: string; name: string }; milestones: Milestone[] }
export interface Payment { id: string; milestoneId: string; amountMinor: number; currency: string; status: string; paypalOrderId: string | null; paypalCaptureId: string | null; capturedAt: string | null; milestone?: { title: string; projectId: string } }
export interface Assessment { criteria: { criterion: string; assessment: string; evidence: string }[]; evidenceSummary: string; missingRequirements: string[]; unverifiedClaims: string[]; risks: string[]; nextSteps: string[]; recommendation: string; limitations: string[] }
export interface Evaluation { id: string; provider: string; model: string; recommendation: string; assessmentJson: Assessment; limitations: string }
export interface Submission { id: string; description: string; evidenceNotes: string; githubUrl: string | null; demoUrl: string | null; revisionNumber: number; createdAt: string; evaluations: Evaluation[] }
export interface Approval { id: string; submissionId: string; decision: string; notes: string; createdAt: string }
export interface Milestone { id: string; title: string; description: string; sequence: number; amountMinor: number; acceptanceCriteria: string[]; status: Status; projectId: string; project?: Project; submissions?: Submission[]; approvals?: Approval[]; payment?: Payment | null; _count?: { submissions: number } }
export interface AuditEvent { id: string; eventType: string; createdAt: string; actor: { name: string } }
export interface DraftMilestone { title: string; description: string; amountMinor: number; acceptanceCriteria: string[]; dependencies: string[]; risks: string[] }
export interface Proposal { milestones: DraftMilestone[]; mode: string; model: string; simulated: boolean }
