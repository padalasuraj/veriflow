import type { Config } from '../config/env.js';
import { ApiError, requireCondition } from '../utils/errors.js';

export interface PayPalGateway {
  configured: boolean;
  clientId: string;
  create(body: unknown, requestId: string): Promise<unknown>;
  get(orderId: string): Promise<unknown>;
  capture(orderId: string, requestId: string): Promise<unknown>;
}
export function paypalClient(config: Config, transport: typeof fetch = fetch): PayPalGateway {
  const base = 'https://api-m.sandbox.paypal.com';
  let token = '';
  let expires = 0;
  const configured = Boolean(config.PAYPAL_CLIENT_ID && config.PAYPAL_CLIENT_SECRET);
  async function accessToken() {
    requireCondition(configured, 503, 'PAYPAL_UNCONFIGURED', 'PayPal Sandbox credentials are missing on the backend.');
    if (token && Date.now() < expires) return token;
    const response = await transport(`${base}/v1/oauth2/token`, { method: 'POST', signal: AbortSignal.timeout(15_000), headers: { Authorization: `Basic ${Buffer.from(`${config.PAYPAL_CLIENT_ID}:${config.PAYPAL_CLIENT_SECRET}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' });
    requireCondition(response.ok, 502, 'PAYPAL_AUTH_ERROR', 'PayPal Sandbox authentication failed. Check server credentials.');
    const body = await response.json();
    requireCondition(typeof body.access_token === 'string' && typeof body.expires_in === 'number', 502, 'PAYPAL_INVALID_RESPONSE', 'PayPal authentication returned an invalid response.');
    token = body.access_token;
    expires = Date.now() + Math.max(0, body.expires_in - 60) * 1000;
    return token;
  }
  async function call(path: string, method: string, body?: unknown, requestId?: string) {
    try {
      const access = await accessToken();
      const response = await transport(`${base}${path}`, { method, signal: AbortSignal.timeout(20_000), headers: {
        Authorization: `Bearer ${access}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(requestId ? { 'PayPal-Request-Id': requestId } : {}),
      }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      requireCondition(response.ok, 502, 'PAYPAL_REQUEST_FAILED', 'PayPal Sandbox could not complete this request. Retry to reconcile the same order.');
      return await response.json() as unknown;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(502, 'PAYPAL_UNAVAILABLE', 'PayPal request timed out or could not be reached. No payment success has been assumed.');
    }
  }
  return { configured, clientId: config.PAYPAL_CLIENT_ID,
    create: (body, id) => call('/v2/checkout/orders', 'POST', body, id),
    get: id => call(`/v2/checkout/orders/${encodeURIComponent(id)}`, 'GET'),
    capture: (id, requestId) => call(`/v2/checkout/orders/${encodeURIComponent(id)}/capture`, 'POST', {}, requestId),
  };
}
