import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { createApp } from './app.js';
import { envSchema } from './config/env.js';

const app = createApp(envSchema.parse({ NODE_ENV: 'test' }));
describe('foundation API', () => {
  it('reports availability without claiming external integrations work', async () => {
    const response = await request(app).get('/api/health').expect(200);
    expect(response.body.data.status).toBe('ok');
    expect(response.body.data.integrations).toEqual({ ai: 'mock_simulated', paypal: 'sandbox_unconfigured', database: 'sqlite_configured' });
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
  it('allows the configured browser origin', async () => {
    const response = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });
  it('does not grant another origin browser access', async () => {
    const response = await request(app).get('/api/health').set('Origin', 'https://untrusted.example');
    expect(response.headers['access-control-allow-origin']).not.toBe('https://untrusted.example');
  });
  it('returns consistent missing-route errors', async () => {
    const response = await request(app).get('/api/missing').expect(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
  it('rejects malformed JSON safely', async () => {
    const response = await request(app).post('/api/missing').set('Content-Type', 'application/json').send('{').expect(400);
    expect(response.body.error.code).toBe('INVALID_REQUEST');
    expect(JSON.stringify(response.body)).not.toContain('SyntaxError');
  });
  it('rejects unsafe configuration', () => {
    expect(envSchema.safeParse({ PORT: 0 }).success).toBe(false);
    expect(envSchema.safeParse({ FRONTEND_ORIGIN: 'https://example.com/path' }).success).toBe(false);
  });
});
