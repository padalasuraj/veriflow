import { expect, test } from '@playwright/test';

test('frontend displays live backend health through the Vite proxy', async ({ page, request }) => {
  const response = await request.get('/api/health');
  expect(response.ok()).toBeTruthy();
  expect((await response.json()).data.integrations).toEqual({
    ai: 'mock_simulated', paypal: 'sandbox_unconfigured', database: 'sqlite_configured',
  });
  await page.goto('/');
  await expect(page.getByText(/API connected/)).toBeVisible();
  await expect(page.getByText('mock_simulated', { exact: true })).toBeVisible();
  await expect(page.getByText('sandbox_unconfigured', { exact: true })).toBeVisible();
});
