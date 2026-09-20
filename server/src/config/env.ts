import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/servicedesk_pro'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters long').default('dev_jwt_secret_min_16_chars_sample'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters long').default('dev_refresh_jwt_secret_min_16_chars_sample'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  AI_SERVICE_URL: z.string().default('http://localhost:8000'),
  INTERNAL_AI_SECRET: z.string().default('internal_shared_secret_token_change_in_production')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[Configuration Error] Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
