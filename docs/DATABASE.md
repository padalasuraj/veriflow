# Database

Prisma 7.10.1 uses the better-sqlite3 adapter. `backend/src/config/database.ts` constructs clients; `backend/prisma.config.ts` resolves the CLI URL to the same backend-relative file. Default: `backend/prisma/dev.db`. Local databases, WAL files and journals are ignored by Git.

## Initialization and migrations

From root: `npm.cmd run db:generate`, `npm.cmd run db:migrate`, `npm.cmd run db:seed`. Migration deployment uses `backend/scripts/migrate.ts` to safely create a missing parent directory/empty SQLite file before invoking Prisma. It never resets or deletes an existing database. Checked-in migration `backend/prisma/migrations/20261017161842_init/migration.sql` creates tables, foreign keys and indexes. New schema work should generate another migration, never rewrite an already applied migration.

The seed upserts demo users and a fixed demo project with empty update operations. Existing passwords and workflow state remain unchanged. It creates three open milestones with amounts 15000/25000/20000 USD minor units and refuses production mode. See README for local credentials. Run the seed twice to check that no second project is created.

## Entities and relationships

| Model | Purpose and constraints |
| --- | --- |
| User | Unique normalized email, bcrypt password hash, CLIENT/FREELANCER role, timestamps |
| Session | User FK, unique SHA-256 token hash, per-session CSRF token, seven-day expiry; indexed by user/expiry |
| Project | Client FK, optional assigned freelancer FK, scope/requirements/deliverables, currency and integer budget; ownership indexes |
| Milestone | Project FK, ordered sequence unique within project, amount, JSON criteria, enum state and timestamps |
| Submission | Milestone and freelancer FKs, description/notes/URL references, unique revision number per milestone |
| AiEvaluation | Submission FK, provider/model, validated JSON report, recommendation/limitations; history index |
| Approval | Current submission and client/milestone FKs, human decision and notes; decision history index |
| Payment | Unique milestone and approval, unique PayPal order/capture IDs, unique create/capture request IDs, amount/currency snapshot, status/lease/capture time |
| AuditLog | Actor/project/optional milestone FKs, event and bounded server-generated JSON metadata; project timeline index |

Money is validated as positive integer minor units up to 100000000 per project/milestone. Two-decimal currencies only. Foreign keys and unique constraints are database-enforced; budgets, role relationships and allowed transitions are application-enforced inside transactions. Direct database writes bypass application validation and are an operator responsibility.

Submission creation, decisions, agreement edits and confirmed captures include their state/audit updates in transactions. Allocation validation runs in the milestone-write transaction. SQLite is intended for local/single-instance use; multi-instance production concurrency and backup/recovery need additional testing and a deployment plan.

No deletion API exists for historical financial/work records. Sessions can be deleted on logout. Expired sessions are rejected but not automatically purged; add an operator retention policy before production. Automated API tests use an isolated migrated file under the OS temporary directory and preserve user development data.
