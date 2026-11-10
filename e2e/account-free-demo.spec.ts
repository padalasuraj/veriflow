import { expect, test } from '@playwright/test';

test('visitor completes the demo workflow without creating an account', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Try the demo without an account' }).click();
  await expect(page.getByRole('heading', { name: 'Hello, Demo.' })).toBeVisible();
  await expect(page.getByText('Persistent demo workspace')).toBeVisible();
  await expect(page.getByText(/saved and does not expire/i)).toBeVisible();

  await page.getByRole('link', { name: /UI Design/ }).click();
  const milestoneUrl = page.url();
  await page.getByRole('button', { name: 'Switch to freelancer view' }).click();
  await expect(page.getByLabel('What did you deliver?')).toBeVisible();
  await page.getByLabel('What did you deliver?').fill('Delivered the responsive design with desktop and mobile layouts.');
  await page.getByLabel('Evidence and reproduction notes').fill('Review the desktop and mobile layouts against each acceptance criterion.');
  await page.getByRole('button', { name: 'Submit evidence' }).click();
  await expect(page.getByRole('heading', { name: 'Evidence · revision 1' })).toBeVisible();

  await page.getByRole('button', { name: 'Switch to client view' }).click();
  await expect(page.getByRole('button', { name: 'Start review' })).toBeVisible();
  await page.getByRole('button', { name: 'Start review' }).click();
  await page.getByRole('button', { name: 'Request AI evidence assessment' }).click();
  await expect(page.getByRole('heading', { name: 'Evidence assessment' })).toBeVisible();
  await page.getByLabel('Decision', { exact: true }).selectOption('APPROVED');
  await page.getByLabel('Decision notes').fill('Reviewed the sample submission in the demo workspace.');
  await page.getByRole('button', { name: 'Record client decision' }).click();
  await expect(page.getByText('Checkout is disabled in the account-free demo.')).toBeVisible();
  expect(page.url()).toContain(milestoneUrl.split('/').pop());
  await page.reload();
  await expect(page.getByText('approved', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Evidence assessment' })).toBeVisible();
});
