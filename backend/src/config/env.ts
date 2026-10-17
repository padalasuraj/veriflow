import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  FRONTEND_ORIGIN: z.url().default('http://localhost:5173').refine(value => {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && url.origin === value;
  }, 'FRONTEND_ORIGIN must be an HTTP(S) origin without a trailing slash'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().startsWith('file:').default('file:./prisma/dev.db'),
  AI_MODE: z.enum(['mock', 'real']).default('mock'),
  AI_MODEL: z.string().default('gpt-4.1-mini'),
  AI_API_KEY: z.string().default(''),
  PAYPAL_ENV: z.literal('sandbox').default('sandbox'),
  PAYPAL_CLIENT_ID: z.string().default(''),
  PAYPAL_CLIENT_SECRET: z.string().default(''),
});

export type Config = z.infer<typeof envSchema>;
