# Local and hosted deployment

## Local Windows

Use Node 24 LTS. From root run npm.cmd install, copy backend/.env.example only when backend/.env is absent, then npm.cmd run db:generate, npm.cmd run db:migrate, npm.cmd run db:seed and npm.cmd run dev. Frontend: http://localhost:5173; backend: http://localhost:3001/api/health. Use localhost consistently for cookies/origin. Separate scripts are npm.cmd run dev -w backend and npm.cmd run dev -w frontend.

SQLite defaults to backend/prisma/dev.db. The CLI config resolves the same backend-relative path as the runtime adapter. Back up the database with SQLite-aware tooling before schema changes; never reset a user's database as a deployment step. Migration deployment is nondestructive and idempotent. Seeding preserves existing data and is local-only.

## Production build

Run npm.cmd run db:generate and npm.cmd run build. Artifacts: frontend/dist and backend/dist. npm.cmd start runs the compiled API from the backend working directory. It does not serve frontend assets. Keep Prisma/client/native dependencies available in the backend runtime; generate for the target platform and apply migrations before starting the API.

A hosted setup needs HTTPS, a static server with SPA fallback to frontend/dist/index.html, and a same-origin /api reverse proxy to Express. Inject backend secrets through the host's private environment. Set NODE_ENV=production and FRONTEND_ORIGIN to the exact HTTPS origin. Secure __Host- cookies require TLS and Path=/ with no Domain. Configure a deployment-specific Content Security Policy permitting required PayPal script/frame/connect origins on the frontend host. No hosted deployment has been executed or verified.

Use a persistent volume for SQLite and a single application instance until concurrency/operational testing justifies a different architecture. Do not use ephemeral hosting disks for financial/workflow records. Configure reliable backups, restore drills, health/uptime monitoring and private credential rotation. Test cookie/CSRF, buyer popup flow and browser deep links on the actual hosted origin. Do not seed public demo passwords into a public production instance.

The PayPal adapter accepts sandbox only. Production NODE_ENV does not mean live PayPal payments. Real OpenAI calls and Sandbox buyer capture still need explicit provider acceptance tests. There are no webhooks, refunds, escrow or freelancer payouts.

Docker/cloud hosting is optional and not required. This run has not provisioned accounts, deployed a site or changed Git remotes. CI is configured but remote CI execution remains unverified.
