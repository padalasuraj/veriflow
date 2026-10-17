export interface Health {
  status: 'ok';
  service: string;
  version: string;
  integrations: Record<'ai' | 'paypal' | 'database', string>;
}

export async function getHealth(): Promise<Health> {
  const response = await fetch('/api/health', { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error('The API is unavailable. Start the backend and try again.');
  const body = await response.json();
  if (body?.data?.status !== 'ok' || !body.data.integrations) throw new Error('The API returned an unexpected response.');
  return body.data;
}

let csrfToken = '';
export const setCsrfToken = (value: string) => { csrfToken = value; };
export class ApiError extends Error {
  constructor(message: string, public status: number, public code: string) { super(message); }
}
export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const response = await fetch(`/api${path}`, { method: options.method ?? 'GET', credentials: 'same-origin', signal: AbortSignal.timeout(60_000), headers: { 'Content-Type': 'application/json', ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}) }, ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }) });
  const payload = await response.json();
  if (!response.ok) throw new ApiError(payload.error?.message ?? 'Request failed. Please retry.', response.status, payload.error?.code ?? 'REQUEST_FAILED');
  return payload.data as T;
}
