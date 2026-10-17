import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';

const probe = createServer();
probe.listen(0, '127.0.0.1');
await once(probe, 'listening');
const address = probe.address();
if (!address || typeof address === 'string') throw new Error('Unable to select a smoke-test port.');
const port = address.port;
await new Promise<void>(resolve => probe.close(() => resolve()));
const child = spawn(process.execPath, ['dist/server.js'], { env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
try {
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Compiled API startup timed out.')), 15_000);
    child.stdout.on('data', (data: Buffer) => {
      if (data.toString().includes('VeriFlow API listening')) { clearTimeout(timeout); resolve(); }
    });
    child.once('error', error => { clearTimeout(timeout); reject(error); });
    child.once('exit', code => { clearTimeout(timeout); reject(new Error(`Compiled API exited before verification (${code}). Check database migration/configuration.`)); });
  });
  const response = await fetch(`http://127.0.0.1:${port}/api/health`);
  const body = await response.json();
  if (!response.ok || body.data?.status !== 'ok') throw new Error('Compiled health check failed.');
  console.log('Compiled API startup and GET /api/health verified against the migrated local database.');
} finally {
  child.kill();
}
