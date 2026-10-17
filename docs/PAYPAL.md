# PayPal Sandbox integration

This implementation is Sandbox-only PayPal Checkout using Orders v2. It is not escrow or PayPal Payouts, and does not send real freelancer payouts. Runtime code contains no fake payment-success provider. Controlled test doubles exist only in automated tests.

## Account setup

1. Sign in to [PayPal Developer](https://developer.paypal.com/) using your own account.
2. In Testing Tools / Sandbox Accounts, create a Business merchant and a separate Personal buyer. Inspect the account details to obtain the buyer's Sandbox login.
3. In Apps & Credentials, select Sandbox and create a REST app associated with the Business account.
4. Set PAYPAL_ENV=sandbox, PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET privately in backend/.env. Never use live credentials or share the secret in source, screenshots or chat.
5. Restart the API. The authenticated GET `/api/payments/config` returns only the public client ID and whether both credentials are configured. Missing configuration disables browser checkout and returns PAYPAL_UNCONFIGURED on order creation.

## Flow and implementation

- Client independently accepts the latest submission while UNDER_REVIEW.
- POST `/api/payments/orders` takes only milestoneId. Server checks ownership, status and current approval and snapshots database amount/currency. A unique payment row and stable UUID create/capture request IDs are persisted first.
- `paypal/client.ts` exchanges the private REST credentials at `https://api-m.sandbox.paypal.com/v1/oauth2/token`. Tokens are kept in server memory with expiry; private credentials never reach React.
- Server creates a CAPTURE order at `/v2/checkout/orders`, with custom_id=milestone ID, invoice_id=local payment ID and exact database-priced amount. PayPal-Request-Id is the persisted create UUID.
- `PayPalCheckout.tsx` loads the official JavaScript SDK with the public client ID/currency. Its createOrder callback calls the backend; the Sandbox Personal buyer approves in PayPal's UI.
- onApprove calls server capture; it cannot set PAID itself. Server retrieves the stored order first. It validates order ID and custom/invoice identifiers; an approved order must also match amount/currency before capture.
- Server captures with its persistent capture UUID. `verification.ts` requires a COMPLETED order with exactly one COMPLETED capture, exact milestone/invoice IDs, exact order ID and exact amount/currency. Partial/pending/mismatched captures are rejected.
- One transaction stores the unique capture ID, marks payment COMPLETED and milestone PAID, and writes SANDBOX_PAYMENT_CONFIRMED. Both participants can view receipts/history.

## Idempotency, concurrency and recovery

There is one payment per milestone, one payment per approval, and unique PayPal order/capture/request IDs. Duplicate completed capture requests return the stored receipt without calling PayPal again. A 90-second database lease prevents concurrent capture calls. External HTTP timeouts are bounded; leases survive a process interruption and can be retried after expiry.

Before any retry the server GETs the existing order. A completed order can be reconciled without a new capture. Ambiguous failures produce UNCERTAIN or VERIFY_FAILED and never PAID. Creation retries reuse the same request body/request ID. The application refuses unresolved create/capture attempts older than five hours rather than risk using an expired idempotency window. An already completed order can still be reconciled from PayPal after that window. Do not manually create a replacement order without verifying the original outcome.

The implementation deliberately provides no automatic replacement for a declined/expired order, no refunds/webhooks and no financial record deletion. Operator reconciliation, account restrictions and unusual settlement outcomes remain limitations. Failed payment attempts use PAYMENT_FAILED on the milestone; a successful retry/reconciliation ultimately becomes PAID. Stored pending orders remain payable through the same order.

## Live acceptance checklist - not yet performed

- Configure a Sandbox merchant REST app and separate buyer; do not record secrets.
- Submit evidence, review it and approve as the project client.
- Load Sandbox checkout and approve as the Personal buyer.
- Record local milestone/payment IDs, Sandbox order/capture IDs, amount, currency and date.
- Compare the server receipt with the merchant Sandbox dashboard. Refresh/reconcile and confirm a single completed payment and audit event.
- Test cancellation and failure separately. Neither is a verified payment.
- Record results in TEST_RESULTS.md. Do not describe controlled mocked responses as live acceptance.

Automated tests cover request pricing/idempotency, success, failures, amount/currency/order/identity/status mismatches, duplicates, concurrent capture, unauthorized access, buyer approval requirement and timeout reconciliation. The browser checkout contract test intercepts SDK/API responses and never contacts PayPal. Live Sandbox verification is blocked until credentials and buyer interaction are supplied.

References: [official Checkout integration](https://developer.paypal.com/docs/checkout/standard/integrate/), [Orders v2](https://developer.paypal.com/docs/api/orders/v2/), [REST idempotency](https://developer.paypal.com/api/rest/reference/idempotency/).
