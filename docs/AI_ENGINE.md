# AI engine

Two explicit modes share `AiProvider` (`backend/src/ai/provider.interface.ts`). `AI_MODE=mock` selects `mock.provider.ts`; `AI_MODE=real` selects `real.provider.ts`. There is no automatic fallback. Configuration lives only in backend/.env.

## Planner

POST `/api/ai/milestones/draft`, client role only. Inputs: title, description, requirements, deliverables and integer budget. Output: 1-10 suggested milestones with title, description, integer amount, criteria, dependencies and risks, plus mode/model/simulated provenance. `schemas.ts` validates the result; allocation must total the input budget. The React project page shows editable suggestion forms and saves only on an explicit action. The AI endpoint creates no agreements.

Mock planning deterministically distributes a budget across design, implementation and final verification (for 60000: 15000/25000/20000). It is a simulation, not an AI inference or guarantee of appropriate scope.

## Evidence evaluation

POST `/api/ai/submissions/:id/evaluate`, either authorized project participant. Input includes the milestone criteria and only the supplied submission description, evidence notes and optional URL strings. The provider receives no password, session, payment secret or unrelated project data.

Output includes an assessment per original criterion, textual support, evidence summary, missing requirements, unverified claims, risks, next steps, limitations and one advisory recommendation: READY_FOR_HUMAN_REVIEW, MORE_EVIDENCE_REQUIRED or POTENTIAL_MISMATCH. Criterion names/count/order must match the agreement. A report is saved with provider/model and an audit event. It never changes review, approval or payment state. Historical revisions can have their own reports; human decisions must reference the latest submission.

Neither mode fetches repositories or websites. The server appends a nonremovable limitation stating that no link was fetched, inspected or tested. Claims supported by submitted statements are not independently verified facts. The mock conservatively labels all criteria as missing independent evidence and always discloses simulation.

## Real provider and failure behavior

The real adapter uses OpenAI Chat Completions at the fixed official HTTPS endpoint, strict JSON schema derived from Zod, `max_completion_tokens: 3500`, and a 30-second timeout. `AI_API_KEY` is private; `AI_MODEL` defaults to gpt-4.1-mini and must support the chosen API/schema features. The system prompt treats inputs as untrusted data, prohibits invented inspections and preserves human control. Model output is parsed and revalidated on the server. Refusals, truncated responses, transport failures and invalid JSON return truthful errors. Prompts cannot eliminate prompt injection or hallucinations; client review remains required.

Each project participant can request reports, subject to an AI limit of 10 requests/minute per IP and general API/input limits. This local demo does not implement per-account billing quotas, content retention agreements or organization-level privacy controls.

## Verification

Unit tests check deterministic outputs, schemas, credential absence, structured request shape, refusals, HTTP failures, timeout and invalid JSON. API tests verify persistence, editable drafts and unchanged milestone state. Browser tests show the mock label and evidence limitations. No real provider request has been verified. To accept real mode, privately configure a key/model, generate and review a real draft/report, and record model/date/results without secrets in TEST_RESULTS.md.

Reference: [official OpenAI structured output documentation](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=chat).
