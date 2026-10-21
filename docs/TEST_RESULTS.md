# Executed test results

Date: October 17, 2026 (Asia/Kolkata). Local Windows PowerShell, Node.js v24.19.0, npm 11.17.0. These results describe actual local execution, not remote CI or hosted/provider acceptance.

## Final local results

| Command / check | Actual outcome |
| --- | --- |
| node --version; npm.cmd --version | v24.19.0 / 11.17.0 |
| npm.cmd install and workspace dependency installs | Completed; Prisma CLI corrected to 7.10.1 to match client/adapter |
| npm.cmd approve-scripts esbuild bcrypt better-sqlite3 @prisma/engines prisma | Approved specific installed dependency script versions in package.json |
| npm.cmd run db:generate | Prisma Client 7.10.1 generated |
| npm.cmd exec -w backend -- prisma migrate dev --name init | Created and applied checked-in initial migration after creating/resolving the SQLite file |
| npm.cmd run db:migrate | Passed; repeated deployment reported no pending migration |
| npm.cmd run db:seed | Passed on repeated runs; non-destructive demo upserts |
| npm.cmd run db:verify | Passed: client/freelancer relationships, 60000 total budget, 15000/25000/20000 allocation, one demo project/three milestones after reconnect |
| npm.cmd test | **50 passed: 3 frontend component tests + 47 backend unit/API tests**, four test files total |
| npm.cmd run typecheck | Passed frontend, backend including seed/migration/smoke scripts, and root Playwright/tool TypeScript checks |
| npm.cmd run lint | Passed |
| npm.cmd run build | Passed Vite frontend and compiled TypeScript backend |
| npm.cmd run dev | Both development services started; live health response returned ok and honest configuration labels |
| npm.cmd run test:e2e | **3 Chromium tests passed**: live health, live two-user workflow and explicitly controlled checkout UI |
| npm.cmd exec -w backend -- tsx scripts/smoke-built.ts (also available as npm.cmd run verify:built) | Compiled API started on an isolated temporary port; GET /api/health passed; child process stopped |
| npm.cmd audit --omit=dev | Reported zero known production dependency vulnerabilities |
| git check-ignore for .env, .env.production, backend/.env, frontend/.env.local, SQLite db/WAL | All representative paths ignored |
| Scoped source scan for common OpenAI/private-key patterns | No matches; this heuristic is not a complete secret audit |
| git ls-remote origin | Read-only check returned HEAD/main at 699cb44d0451f625ed7c4d3c7c9391fc2a9307dd |
| Unauthenticated GitHub repository API read | padalasuraj/veriflow reported private=false and default_branch=main |

The configured GitHub repository is public, but local implementation files remain untracked and were not committed or pushed. Remote source equality and remote Actions execution are not claimed.

## Coverage and evidence

Backend tests use a fresh temporary SQLite database and actual migrations. They cover session hashing/expiry/logout/CSRF, roles and private access, money/lifecycle, project/milestone creation/locks, revisions, stale decisions, report persistence and unchanged AI decision state. Controlled PayPal tests cover server-priced orders, stored request IDs, capture success/failure/mismatches, duplicate/concurrent capture, authorization, approval requirements, timeout reconciliation, expired retries and unique capture IDs. No payment fixture is available as a runtime API feature.

The live browser workflow registers separate client/freelancer identities, creates a project and assigned agreement from an editable mock AI plan, submits/revises evidence, requests advisory evaluation, records human approval, verifies persistent history, exercises logout/login and confirms no horizontal overflow at 390px. It verifies the visible unconfigured PayPal message, not a live payment. Dashboard screenshot: ignored test-results/client-dashboard.png, inspected locally.

The separate checkout browser test intercepts the SDK and API responses and checks that the receipt appears only after a server-completion response. It is explicitly a controlled UI contract test, not a PayPal Sandbox acceptance test.

## Failures observed and fixed

1. The initial dependency request selected Prisma 8 release-candidate CLI alongside Prisma 7 client. Stopped that install and installed compatible Prisma 7.10.1; generation, migration and runtime adapter were subsequently verified.
2. Initial fresh-file Windows migration returned a schema-engine error. Created/resolved the SQLite file and added a safe migration wrapper; isolated test migrations and repeated deployment now pass.
3. Existing Express error middleware had an unused required fourth argument. Retained four-argument behavior and marked intentional use. Later auth type augmentation used namespace syntax rejected by ESLint; replaced it with module augmentation. Lint now passes.
4. A PayPal transport unit test reused a consumed Response fixture. Changed the fixture to return fresh HTTP responses; the transport contract then passed.
5. First full browser runs timed out while selecting the client decision. Focused tracing exposed ambiguous implicit select labeling. The shared field component now uses explicit label/control IDs; the workflow passes, retaining its original decision assertions. Action timeouts and safe context teardown preserve useful failure details.

## Nonfatal warnings

Vite/Rollup reports two upstream Zod comment annotation warnings; it removes those comments and completes the production bundle. Playwright reports NO_COLOR/FORCE_COLOR environment warnings; these do not fail the tests. No warning was suppressed to hide a failure.

## Not executed / remaining acceptance

- Real credential-backed OpenAI planning/evaluation: **not executed**, private key/model access unavailable.
- Actual Sandbox buyer approval/capture/dashboard comparison: **not executed**, merchant credentials and buyer interaction unavailable.
- Hosted deployment/TLS/cross-browser production acceptance: **not executed**.
- Remote GitHub Actions: **not executed/verified** by this run.
- Video upload and Devpost submission: **not performed**; drafts require human review.

Configure keys privately using README, then follow AI_ENGINE.md and PAYPAL.md acceptance instructions. Do not infer external success from local mocks or configuration labels.

### Fresh-server launch check
A further run stopped the prior development runner and let Playwright start both services from its webServer configuration. The initial parallel cold-start run passed the full workflow but timed out in the health/checkout browser setup. The browser configuration now waits separately for API health and Vite, uses one worker to limit concurrent startup load, and allows a 60-second default timeout. The fresh-server rerun passed all three tests (28.2 seconds). Playwright started the services itself and completed its teardown. Root tool TypeScript and lint checks were rerun after the configuration change.


## Reverification — October 21, 2026 (Asia/Kolkata)

- `npm run lint`, `npm run typecheck`: passed (lint rerun after adding documentation scripts).
- `npm test`: 3 frontend + 47 backend = **50 passing tests**.
- `npm run build`: frontend Vite and backend TypeScript builds passed. Upstream Zod annotation warnings remain nonfatal.
- `db:generate`, `db:migrate`, `db:seed`, `db:verify`: passed; existing data preserved.
- `npm run test:e2e`: **3 passed in 10.2 seconds**, including two-user revisions, advisory review and client approval.
- `npm run verify:built`: compiled API started on a temporary port and returned healthy.
- `node scripts/capture-docs.mjs`: four real application screenshots captured in docs/images; project image visually inspected.
- `node scripts/create-diagrams.mjs`: accessible workflow/architecture SVGs generated.

External OpenAI/PayPal acceptance and hosted deployment remain unexecuted. Hosting configurations are preparation, not evidence of a deployed application. Earlier unpublished-source statements above are historical; see the final chat for current commit/push status.
