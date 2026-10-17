import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import { resolve } from 'node:path';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: { url: `file:${resolve((process.env.DATABASE_URL ?? 'file:./prisma/dev.db').slice(5)).replaceAll('\\', '/')}` },
});
