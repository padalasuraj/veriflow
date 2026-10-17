# Security controls and boundaries

The application is a local hackathon build, not an audited payment/escrow service. Live payments are rejected by configuration. Sandbox test money is not a freelancer payout.

## Implemented

- Bcrypt cost 12; registration validates password length and UTF-8 byte limit before hashing. Password hashes never appear in API responses.
- Random 32-byte session tokens stored only as SHA-256 hashes; seven-day server expiry; HttpOnly, SameSite=Lax cookies. Production cookies use Secure and __Host- prefix. Logout deletes the server session and clears the cookie.
- Authenticated writes require session CSRF tokens with timing-safe comparison; exact-origin and Fetch Metadata checks reject cross-site writes. JSON-only parsers prevent anonymous form posts from supplying accepted credentials.
- Server-side role/ownership checks cover projects, milestones, evidence, reports, decisions, receipts and audit. Unrelated private IDs return 404. Browser protection improves UX but is not authorization.
- Zod validation, 100 KB JSON limit, bounded text/URL/amounts, integer money, two-decimal currency allowlist and generic unexpected errors.
- Helmet headers; no Express version header. Exact-origin CORS; general API, authentication and AI rate limits. CORS is not authorization.
- Immutable submission revisions and historical approval/payment records; database uniqueness and FKs; transactional lifecycle and audit writes.
- Fixed official HTTPS AI and Sandbox PayPal endpoints, bounded requests, private credentials only on the backend. URL references are not fetched, preventing this feature from becoming a server-side arbitrary URL fetcher.
- Database-priced orders, persistent idempotency IDs, capture lease, reconciliation-first retry and independent capture verification before PAID.
- .gitignore protects .env variants, databases/journals, generated reports and logs. Only documented nonsecret example templates/demo accounts are public.

## Known production work

TLS, deployment-specific CSP and reverse proxy configuration, trustworthy proxy/rate-limit setup, production secret injection, backup/restore drills, retained audit policy, monitoring, dependency maintenance and multi-instance concurrency testing are still required. Never seed public demo accounts in production. SQLite is intended for local/single-instance development. No account recovery, email verification, MFA, organization management, webhook validation, refunds or payout compliance workflow is implemented.

Expired sessions are rejected but not periodically purged. Add retention/cleanup procedures before public deployment. Public registration accepts a chosen client/freelancer role; this is not identity or business verification. Submitted content is visible to both assigned participants. Real AI sends submitted text to OpenAI; users must avoid unnecessary confidential/personal information. A model can still make incorrect claims despite schema/prompt controls; server-added limitations and human decisions remain essential.

Credentials were not printed or committed by this run. No git commit/push/publish was performed. Automated tests exercise roles, CSRF, expiry/logout, input failures, state locks and payment checks; they are not a professional security audit. Exact commands/results are recorded in TEST_RESULTS.md.
