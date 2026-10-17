# Devpost draft - human review required

Project: **VeriFlow AI**

Tagline: **Verify Work. Build Trust. Pay Smarter.**

Short description: A human-controlled milestone workspace connecting measurable agreements, versioned delivery evidence, advisory AI reports and server-verified PayPal Sandbox checkout.

## Inspiration and problem

Freelance work often reaches a payment discussion before both parties agree what done means. Evidence gets scattered across messages, and an unexplained score cannot resolve missing context. We wanted a shared workflow where uncertainty is visible and a human still makes the consequential decision.

## What it does

Clients define a project budget and assign a freelancer. They can review/edit an AI-proposed milestone plan or define the agreement manually. Freelancers submit evidence and preserve numbered revisions. Advisory reports compare criteria, missing evidence and unverified claims. Clients inspect the work, request changes or approve the latest submission. Sandbox checkout is designed to mark a milestone paid only after server-side capture verification. Audit and transaction histories are shared with the authorized participants.

**Current verification statement:** Local database/auth/project/review flows are implemented and tested. Mock AI is explicitly simulated. A real OpenAI adapter and PayPal Sandbox adapter are implemented but live credential-backed acceptance is still pending. Update this statement only after recording actual external results. No real freelancer payouts or escrow service are provided.

## How we built it / technologies

React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, React Hook Form, Zod and Lucide on the frontend. Node.js/Express/TypeScript, Prisma 7/SQLite, bcrypt, cookie sessions, CSRF controls, Helmet, CORS and rate limits on the backend. OpenAI strict structured-output requests support real planning/evaluation; a deterministic mock supports labeled offline development. PayPal Orders v2 and JavaScript SDK support Sandbox creation, buyer approval and capture. Vitest, Supertest, Testing Library, Playwright and GitHub Actions provide automated verification.

## AI contribution

Planning proposes editable scope/criteria/allocations. Evaluation organizes submitted statements against acceptance criteria and discloses missing evidence. Neither mode fetches reference URLs, and all reports disclose that limitation. Recommendations do not approve work or authorize money movement. Real-mode errors never silently become mock outputs.

## PayPal contribution

The backend owns the Sandbox order amount, records persistent request IDs, reconciles uncertain attempts, and verifies order/milestone/invoice/capture identity, completion, currency and amount. The browser SDK handles buyer approval; the browser callback alone cannot mark PAID. Controlled automated tests verify these contracts, but do not replace an actual Sandbox buyer acceptance run.

## Challenges and accomplishments

The implementation separates agreement, submission, advisory assessment, human decision and financial confirmation. It preserves revision history, blocks stale decisions, and keeps uncertain payment outcomes unresolved. Local tests exercise authorization and capture retry/concurrency behavior. Browser testing exposed a select-label association issue, which was corrected using explicit label/control IDs. Dependency verification caught and corrected a mismatched Prisma prerelease CLI before accepting the migration.

## Lessons and next steps

Evidence provenance and honest failure states matter as much as the happy path. Next gates are real AI acceptance, actual Sandbox buyer capture/dashboard comparison, reviewed public source and a real demonstration video. Further product work includes account recovery, external evidence inspection with safe boundaries, operational hardening and broader hosted-device testing.

## Links and demo instructions

- Configured GitHub remote: https://github.com/padalasuraj/veriflow.git (public visibility verified; latest local source has not been committed/pushed).
- Video: **PENDING - insert the actual public YouTube link after recording and review.**
- Hosted application: **Not deployed.** Follow README for local setup and local-only demo accounts.
- Walkthrough/narration: DEMO.md; architecture/API/security: linked from README.

## Submission checklist

- [x] MIT license present.
- [x] Source, local setup, migrations, seed and test instructions prepared.
- [x] Honest project story and under-three-minute demo script prepared.
- [ ] Confirm organizer eligibility, rules, deadline and required PayPal/AI criteria.
- [ ] Configure and verify a real AI plan/report; record evidence without secrets.
- [ ] Complete an actual Sandbox buyer approval/capture and dashboard comparison.
- [ ] Review all source and ignored files for credentials before authorizing publication.
- [ ] Commit/push reviewed source and verify the repository is public and accessible.
- [ ] Verify remote CI actually passes; a workflow file alone is not a passing run.
- [ ] Capture screenshots of actual dashboard, criteria, evidence, report, decision, Sandbox receipt and audit.
- [ ] Record, review and upload an actual public video shorter than three minutes.
- [ ] Replace link placeholders and recheck every claim against TEST_RESULTS.md.
- [ ] Human review and submission through Devpost.

User-supplied target: before November 13, 2026 at 1:30 AM IST. Confirm this against organizer rules. No external submission, publishing or video upload was performed.
