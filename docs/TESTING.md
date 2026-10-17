# Testing

From root: npm.cmd run db:generate; npm.cmd run lint; npm.cmd run typecheck; npm.cmd test; npm.cmd run build. Install Chromium once with npm.cmd exec playwright install chromium, then npm.cmd run test:e2e. Run these as individual commands to inspect failures. CI installs Chromium with Linux system dependencies.

## Layers

- backend/src/app.test.ts: baseline health/configuration honesty, headers, CORS, missing routes, invalid JSON and unsafe env.
- backend/src/tests/domain.test.ts: integer money, allowed states, AI deterministic/schema/structured-request/error behavior, Sandbox-only transport and capture identity/amount/currency/status verification.
- backend/src/tests/workflow.test.ts: isolated SQLite migration, registration/login/session expiry/logout/CSRF, roles and private access, allocation and editing locks, revisions/stale decisions/advisory reports, persistent orders, duplicate/concurrent capture, failures, mismatches, recovery, safe retry window and unique capture constraints.
- frontend/src/tests/App.test.tsx: connected status, recoverable API error and unknown route using controlled fetch responses.
- e2e/health.spec.ts: live Vite-to-Express API proxy and page health display in Chromium.
- e2e/workflow.spec.ts: live API/persistence and two separate browser identities; registration, planning/save, assignment, evidence, changes request, revision, advisory report, human approval, missing Sandbox configuration, history, mobile overflow check and logout/login.
- e2e/checkout.spec.ts: explicitly controlled SDK/API interception; verifies browser callback waits for server completion and shows the receipt. It is not a real PayPal test.

The API workflow suite creates a unique database under the OS temp directory, applies actual migrations and injects external providers. It never resets development data or calls external payment APIs. The browser workflow creates unique local accounts/projects and preserves their history. Use AI_MODE=mock with PayPal credentials absent for the offline browser suite. Playwright can launch npm run dev or reuse an already running dev server; ensure reused servers belong to this checkout and use the documented configuration. Failed browser tests keep contextual artifacts under ignored test-results; the full workflow also saves a dashboard screenshot there.

## Manual real AI acceptance - pending

Privately set AI_MODE=real and AI_API_KEY/model, restart, request a draft and an evidence assessment, verify schema/allocation/limitations and visible provider provenance. Record provider/model/date, actual observations and failures without secrets. Verify a provider failure never switches to mock. No real provider request has been performed during this implementation.

## Manual PayPal acceptance - pending

Privately configure a Sandbox REST merchant app and separate Personal buyer. Independently approve the latest submission, create/approve/capture through the UI, compare persistent capture ID/amount/currency with the Sandbox merchant dashboard, refresh/reconcile and confirm exactly one completed payment/audit event. Separately test buyer cancellation, rejection and network recovery. Never treat frontend callbacks or mocks as evidence of a real capture. Exact setup is in PAYPAL.md.

## Reporting

TEST_RESULTS.md contains executed commands/results, including initial failures and fixes. Remote GitHub Actions, hosted browser compatibility, real AI and live Sandbox buyer acceptance are separate unverified gates. Do not mark skipped/unexecuted checks as passed. No public upload, deployment or submission is part of automated tests.
