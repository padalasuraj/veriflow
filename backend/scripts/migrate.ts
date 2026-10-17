import 'dotenv/config';
import { mkdirSync, closeSync, openSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

// Ensure a fresh SQLite file exists before invoking the Windows migration engine.
const path = resolve((process.env.DATABASE_URL ?? 'file:./prisma/dev.db').slice(5));
mkdirSync(dirname(path), { recursive: true });
closeSync(openSync(path, 'a'));
const require = createRequire(import.meta.url);
execFileSync(process.execPath, [join(dirname(require.resolve('prisma/package.json')), 'build/index.js'), 'migrate', 'deploy'], { stdio: 'inherit', env: process.env });
