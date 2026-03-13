import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3005),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().trim().default('7d'),
  API_URL: z.string().trim().optional(),
  FRONTEND_URL: z.string().trim().optional(),
  DISABLE_RATE_LIMIT: z.enum(['true', 'false']).optional(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).optional(),
  CLOUDINARY_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');
  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = parsed.data;
