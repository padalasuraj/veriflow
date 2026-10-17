# API contract

Base: http://localhost:3001/api (or relative /api through Vite). Success: `{ "data": ... }`. Error: `{ "error": { "code": "...", "message": "...", "fields": [] } }`; fields appears for validation failures. No private credential/hash is returned. JSON requests are limited to 100 KB.

Authentication uses HttpOnly cookies. Registration/login return `{ user: { id, name, email, role }, csrfToken }`. Fetch GET /auth/me after a page refresh and send its csrfToken as X-CSRF-Token on authenticated writes. Origin must be the configured frontend origin when supplied. Roles and ownership are checked on the backend. Unknown/unauthorized private resources return 404; anonymous access returns 401.

## Routes

| Method and path | Permission | Input / result |
| --- | --- | --- |
| GET /health | Public | Availability/configuration labels; does not assert external services work |
| POST /auth/register | Public JSON, rate limited | name, email, password, role CLIENT/FREELANCER; creates session |
| POST /auth/login | Public JSON, rate limited | email, password; creates expiring session |
| GET /auth/me | Signed in | user and per-session CSRF token |
| POST /auth/logout | Signed in + CSRF | Invalidates current session |
| GET /projects | Participant | Up to 100 authorized projects with milestones |
| POST /projects | Client + CSRF | Project brief/budget/currency and optional registered freelancerEmail |
| GET /projects/:id | Participant | Project, participants and ordered milestones |
| PATCH /projects/:id | Owning client + CSRF | Partial project fields / freelancerEmail; lock rules enforced |
| GET /projects/:id/milestones | Participant | Ordered agreements |
| POST /projects/:id/milestones | Owning client + CSRF | title, description, amountMinor, acceptanceCriteria[], optional DRAFT/OPEN status |
| GET /milestones/:id | Participant | Agreement, project, revisions/reports, decisions and payment |
| PATCH /milestones/:id | Owning client + CSRF | Complete milestone edit; allowed only DRAFT/OPEN before submissions |
| POST /milestones/:id/submissions | Assigned freelancer + CSRF | description, evidenceNotes, optional HTTP(S) githubUrl/demoUrl; new numbered revision |
| GET /milestones/:id/submissions | Participant | Revision history with evaluations |
| GET /submissions/:id | Participant | One revision with reports |
| POST /milestones/:id/review | Owning client + CSRF | SUBMITTED -> UNDER_REVIEW; no AI dependency |
| POST /milestones/:id/decision | Owning client + CSRF | Current submissionId, decision APPROVED/CHANGES_REQUESTED, notes |
| POST /ai/milestones/draft | Client + CSRF + AI limit | title/description/requirements/deliverables/budgetMinor; editable suggestion, no persistence |
| POST /ai/submissions/:id/evaluate | Participant + CSRF + AI limit | Saved advisory evaluation; never changes decision/payment state |
| GET /payments/config | Signed in | Sandbox configured flag and public client ID only |
| POST /payments/orders | Owning client + CSRF | milestoneId only; database-priced persistent order |
| POST /payments/orders/:orderId/capture | Owning client + CSRF | Captures/reconciles stored buyer-approved order; verified receipt |
| GET /payments/history | Participant | Up to 100 authorized payment attempts with milestone labels |
| GET /payments/:id | Participant | Persistent attempt/receipt |
| GET /projects/:id/audit?offset=0 | Participant | Up to 100 audit events; offset supports older events |

There are no delete routes for project/evidence/payment history. List windows are bounded; only the audit endpoint currently exposes an offset. Larger-scale list pagination is future work.

## Examples

Project request:

```json
{
  "title": "Studio website",
  "description": "Build an accessible responsive website.",
  "requirements": "Keyboard navigation and mobile layouts",
  "deliverables": "Source, design and preview",
  "budgetMinor": 60000,
  "currency": "USD",
  "freelancerEmail": "freelancer@veriflow.local"
}
```

Milestone request:

```json
{
  "title": "UI Design",
  "description": "Deliver the agreed design layouts.",
  "amountMinor": 15000,
  "acceptanceCriteria": ["Provide mobile and desktop layouts."],
  "status": "OPEN"
}
```

Health example in default local mode:

```json
{"data":{"status":"ok","service":"veriflow-api","version":"0.1.0","integrations":{"ai":"mock_simulated","paypal":"sandbox_unconfigured","database":"sqlite_configured"}}}
```

Database configured is a configuration label, not a runtime migration probe. Configured external adapters are labeled configured_not_verified until independently accepted; health does not track a live verification history.

Decision body: `{ "submissionId": "current-id", "decision": "APPROVED", "notes": "Independently inspected the current delivery." }`. No user ID proves identity. IDs in the route/body are resources only; session ownership governs access.

## Errors

- 400 VALIDATION_ERROR / INVALID_REQUEST / INVALID_FREELANCER: correct submitted fields/JSON.
- 401 UNAUTHENTICATED / INVALID_CREDENTIALS: sign in or use valid credentials.
- 403 FORBIDDEN / CSRF: role restriction or session/origin mismatch.
- 404 NOT_FOUND: missing/private resource or unknown route.
- 409 INVALID_TRANSITION / STALE_SUBMISSION / CONFLICT / BUDGET_EXCEEDED / MILESTONE_LOCKED / ASSIGNMENT_LOCKED / CURRENCY_LOCKED / PAYMENT_BUSY / RECONCILIATION_REQUIRED: refresh and follow the relevant business/recovery rule.
- 413 INVALID_REQUEST: body exceeds limit; 429 rate-limit errors: wait before retrying.
- 502 AI_* / PAYPAL_* / PAYMENT_VERIFICATION_FAILED: upstream or verification failure, never proof of a successful payment.
- 503 AI_UNCONFIGURED / PAYPAL_UNCONFIGURED: configure the private backend integration.
- 500 INTERNAL_ERROR / DATABASE_ERROR: operation failed; no stack trace or secret is returned.

AI schema and PayPal verification details are in AI_ENGINE.md and PAYPAL.md. Actual automated coverage is in TEST_RESULTS.md.
