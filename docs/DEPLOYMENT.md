# Deployment: Vercel / Netlify + persistent backend

## Architecture

Host the React frontend on Vercel or Netlify and the Express/SQLite API on a persistent Node host. Frontend `/api` proxy rules keep browser cookies on the frontend origin. The backend accepts one exact `FRONTEND_ORIGIN`; use separate backend instances for separate frontend installations.

SQLite needs a persistent disk and one backend instance. An ephemeral/serverless filesystem cannot preserve this application's records. The supplied Render Blueprint uses a paid Starter service and disk; review the plan before provisioning. No hosted service has been created or tested during this work.

## 1. Backend

Create a Render Blueprint from `render.yaml`, or configure an equivalent persistent Node service:

| Setting | Value |
| --- | --- |
| Root | Repository root |
| Runtime | Node 24 |
| Build | `npm ci && npm run db:generate && npm run build -w backend` |
| Start | `npm run db:migrate && npm start` |
| Health | `/api/health` |
| Persistent disk | `/var/data` |
| `DATABASE_URL` | `file:/var/data/veriflow.db` |
| `NODE_ENV` | `production` |
| `FRONTEND_ORIGIN` | Actual final frontend HTTPS origin, no trailing slash |
| `PAYPAL_ENV` | `sandbox` |

Migrations run at startup when the disk is available. They are nondestructive and idempotent; never reset a database as part of deployment. Use SQLite-aware backups and test restoration.

Configure `AI_MODE=real`, `AI_API_KEY`, `AI_MODEL`, `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` privately on the backend for external integrations. Keep `AI_MODE=mock` only for a visibly labeled simulation. The Blueprint defaults to mock. Secrets must never be put in frontend variables or routing files.

Open `https://your-api-host/api/health`. Configured integration labels do not prove provider acceptance. Do not seed public demo credentials into production; register fresh accounts through the hosted frontend.

## 2. Configure routing before deployment

Run from the repository root with your actual backend HTTPS origin:

```powershell
node scripts/configure-hosting.mjs https://your-api.onrender.com
git add vercel.json netlify.toml
git commit -m "Configure hosted VeriFlow API origin"
git push origin main
```

The script validates the origin and updates both proxy files. Hosting routing is read before the build: this command must run before deploying. The initial `YOUR-BACKEND.example.invalid` target intentionally cannot serve requests.

## 3. Vercel

Import the repository using root `.`. Do not choose `frontend` as the project root.

`vercel.json` sets Vite, install `npm ci`, build `npm run build -w frontend`, output `frontend/dist`. The first rewrite forwards `/api/:path*` to the backend; the final rewrite provides SPA deep-route fallback. Open `/api/health` through the frontend domain and test registration/login.

## 4. Netlify

Import the repository with repository root as base. `netlify.toml` sets Node 24, build `npm run build -w frontend`, publish `frontend/dist`. API proxy rules precede the SPA fallback. Open `/api/health` through the frontend domain and test registration/login.

When changing the frontend domain, update backend `FRONTEND_ORIGIN` and restart. Preview origins need a matching dedicated backend configuration. Keep API rules ahead of the catch-all SPA rule so API requests never receive HTML.

## Hosted acceptance checklist

- Verify HTTPS, `/api/health` through the frontend and refresh of protected deep routes.
- Register client/freelancer identities, sign out/in and verify CSRF-protected writes.
- Create/assign a project, save milestones, submit/revise evidence, request AI review and record client decisions.
- Run real AI requests and record actual model/results without secrets.
- Complete Sandbox buyer approval/capture and compare receipt ID, amount and currency with the merchant dashboard.
- Exercise cancellation and reconciliation; do not treat timeouts as proof that no charge occurred.
- Restart/redeploy the backend and verify projects and receipts persist.
- Check mobile layout and private-resource access from an unrelated account.
- Configure backups, restore testing, monitoring and account support before broader use.

No hosted or credential-backed provider acceptance was performed locally. `NODE_ENV=production` enables Secure cookies and requires HTTPS; it does not enable real PayPal money. There are no escrow, payouts, refunds or webhook features.

## Local compiled API

Run `npm run db:generate`, `npm run db:migrate`, `npm run build`, then `npm start`. Start launches only the compiled API. `npm run verify:built` starts it on a temporary port, verifies health and stops it. For interactive local use, run `npm run dev` and open http://localhost:5173.

## Primary references

- [Vercel rewrites](https://vercel.com/docs/routing/rewrites)
- [Netlify rewrites/proxies](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/)
- [Render persistent disks](https://render.com/docs/disks)
- [Render Blueprint specification](https://render.com/docs/blueprint-spec)
