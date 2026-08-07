import { z } from 'zod';
import { AUTH_MODES, DEFAULT_AUTH_COOKIE_NAME, DEFAULT_IDENTITY_HEADER_NAME, resolveAuthMode } from './auth-config';

const emptyToUndefined = (value: unknown) => (typeof value === 'string' && value.trim() === '' ? undefined : value);

const EnvSchema = z.object({
  DATABASE_URL: z.string().optional(),
  AUTH_MODE: z.preprocess(emptyToUndefined, z.enum(AUTH_MODES).optional()),
  DASHBOARD_PASSWORD: z.string().optional(),
  AUTH_COOKIE_NAME: z.preprocess(emptyToUndefined, z.string().optional().default(DEFAULT_AUTH_COOKIE_NAME)),
  AUTH_IDENTITY_HEADER: z.preprocess(emptyToUndefined, z.string().optional().default(DEFAULT_IDENTITY_HEADER_NAME)),
  SHOW_REAL_LOGINS: z.string().optional(),
});
export const env = EnvSchema.parse(process.env);
export const authMode = resolveAuthMode(env);
export const authEnabled = authMode !== 'open';
