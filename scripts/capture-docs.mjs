import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

// Captures real local UI; requires npm run dev and npm run db:seed.
mkdirSync('docs/images', { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await page.goto('http://localhost:5173');
  await page.getByText(/API connected/).waitFor();
  await page.screenshot({ path: 'docs/images/landing.png', fullPage: true });
  await page.goto('http://localhost:5173/login');
  await page.getByLabel('Email', { exact: true }).fill('client@veriflow.local');
  await page.getByLabel('Password').fill('VeriflowDemo2026!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('heading', { name: /Hello/ }).waitFor();
  await page.screenshot({ path: 'docs/images/dashboard.png', fullPage: true });
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await page.getByText('Studio website launch', { exact: true }).click();
  await page.getByRole('heading', { name: 'Studio website launch', exact: true }).waitFor();
  await page.screenshot({ path: 'docs/images/project.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'docs/images/mobile-project.png', fullPage: true });
  console.log('Captured landing, dashboard, project and mobile project from the running application.');
} finally {
  await browser.close();
}
