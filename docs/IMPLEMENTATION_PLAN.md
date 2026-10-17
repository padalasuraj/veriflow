# Implementation plan

October 17, 2026. Extend the existing npm workspace and Git repository; preserve source files and remote. No publishing, commits, destructive resets or external submissions.

1. Discovery/foundation: inspect existing README, scripts, configuration, source, Git state and tool versions. Preserve verified Phase 1 behavior.
2. Persistence: Prisma 7 with SQLite adapter, checked-in SQL migrations, deterministic non-destructive seed, foreign keys and unique payment identifiers.
3. Authentication: bcrypt, opaque expiring session cookies with hashed tokens, CSRF tokens and same-origin checks, role and ownership authorization.
4. Business workflow: projects and assignment, budget and milestone validation, versioned evidence, guarded transitions, human decisions and transactional audit records.
5. Frontend: protected routes, role dashboards, project/milestone forms, revision and evaluation reports, receipts, history, settings and responsive layouts.
6. AI: deterministic labeled mock and configurable real OpenAI structured-output adapter; validation, bounded requests, no URL fetching or invented evidence, no silent fallback.
7. Payments: Sandbox-only PayPal OAuth, Orders v2 server creation/capture, buyer approval SDK, persistent request IDs, capture reconciliation and identity/amount/currency verification. No runtime payment mock.
8. Product quality: accessible loading/error/empty states and audit timeline; retain existing visual identity.
9. QA: isolated migrated test database, Supertest roles/lifecycle/payment contracts, Vitest unit/component tests, Chromium live workflow, lint/typecheck/build.
10. Documentation: replace historical claims with verified implementation details; architecture, API, database, security, AI, PayPal and deployment guides.
11. Submission preparation: honest demo script, Devpost draft, final report and remaining human verification checklist. Never submit automatically.

External gates: real AI request and Sandbox buyer approval/capture cannot be verified without configured private credentials. Continue independent work and report these gates separately from automated tests.

## Execution state
Local implementation and verification through submission preparation are complete within the documented boundary. 50 Vitest tests and 3 Chromium tests passed, plus typecheck/lint/build/migration/seed/reconnect/compiled startup. Actual real AI/Sandbox acceptance and human publication/video/submission remain open gates. See TEST_RESULTS.md, PROGRESS.md and FINAL_REPORT.md for evidence; this plan is not a claim of full external acceptance.

