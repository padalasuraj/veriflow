import 'dotenv/config';
import { createApp } from './app.js';
import { envSchema } from './config/env.js';
import { db } from './config/database.js';

const result = envSchema.safeParse(process.env);
if (!result.success) {
  console.error('Invalid server configuration. Check backend/.env against backend/.env.example.');
  process.exit(1);
}
try {
  await db.user.count();
} catch {
  console.error('Database is unavailable or not migrated. Run npm run db:generate and npm run db:migrate from the repository root.');
  await db.$disconnect();
  process.exit(1);
}
const server = createApp(result.data).listen(result.data.PORT, () => {
  console.log(`VeriFlow API listening on http://localhost:${result.data.PORT}`);
  console.log(`AI mode: ${result.data.AI_MODE === 'mock' ? 'MOCK (simulated)' : 'REAL (requires provider access)'}. PayPal: Sandbox only.`);
});
server.on('error', () => { console.error('API could not start. Check that the configured port is available.'); process.exit(1); });
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => { void db.$disconnect().finally(() => process.exit(0)); });
    setTimeout(() => process.exit(1), 5000).unref();
  });
}
