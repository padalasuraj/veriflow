import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  timeout: 60_000,
  use: { baseURL: 'http://localhost:5173', browserName: 'chromium' },
  webServer: [
    { command: 'npm run dev -w backend', url: 'http://localhost:3001/api/health', reuseExistingServer: !process.env.CI, timeout: 60_000 },
    { command: 'npm run dev -w frontend', url: 'http://localhost:5173', reuseExistingServer: !process.env.CI, timeout: 60_000 },
  ],
});
