import { expect, test } from '@playwright/test';

test('controlled checkout UI waits for server verification and shows the receipt', async ({ page }) => {
  let completed = false;
  const project = { id: 'controlled-project', title: 'Controlled test project', currency: 'USD', clientId: 'test-client' };
  const payment = { id: 'controlled-payment', milestoneId: 'controlled', amountMinor: 15000, currency: 'USD', status: 'COMPLETED', paypalOrderId: 'TEST-ORDER', paypalCaptureId: 'TEST-CAPTURE' };
  await page.route('**/api/auth/me', route => route.fulfill({ json: { data: { user: { id: 'test-client', name: 'Test Client', email: 'test@example.com', role: 'CLIENT' }, csrfToken: 'test-csrf' } } }));
  await page.route('**/api/milestones/controlled', route => route.fulfill({ json: { data: { id: 'controlled', projectId: project.id, project, title: 'Controlled checkout', description: 'This browser test uses controlled responses only.', sequence: 1, amountMinor: 15000, status: completed ? 'PAID' : 'APPROVED', acceptanceCriteria: ['Inspect the controlled flow'], submissions: [], approvals: [], payment: completed ? payment : null } } }));
  await page.route('**/api/payments/config', route => route.fulfill({ json: { data: { configured: true, clientId: 'TEST-ONLY' } } }));
  await page.route('**/api/payments/orders', route => route.fulfill({ json: { data: { ...payment, status: 'READY', paypalCaptureId: null } } }));
  await page.route('**/api/payments/orders/TEST-ORDER/capture', async route => { completed = true; await route.fulfill({ json: { data: payment } }); });
  await page.route('https://www.paypal.com/sdk/js?*', route => route.fulfill({ contentType: 'application/javascript', body: `window.paypal = { Buttons: (options) => ({ render: async (element) => { const button = document.createElement('button'); button.textContent = 'Approve controlled test checkout'; button.onclick = async () => { const id = await options.createOrder(); await options.onApprove({ orderID: id }); }; element.append(button); }, close: async () => {} }) };` }));
  await page.goto('/milestones/controlled');
  await page.getByRole('button', { name: 'Load PayPal Sandbox checkout' }).click();
  await page.getByRole('button', { name: 'Approve controlled test checkout' }).click();
  await expect(page.getByText('Server-verified Sandbox capture. Test money only.')).toBeVisible();
  await expect(page.getByText('Capture: TEST-CAPTURE')).toBeVisible();
});
