import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';
import { enterpriseScope, orgScope, type Scope } from './github/scope.js';

// Walk up from cwd to find a .env file at the workspace root. This lets the
// collector be invoked from anywhere — root, apps/collector, or via pnpm filter
// (which sets cwd to apps/collector).
function loadEnvFromWorkspaceRoot(): void {
  let dir = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    const candidate = resolve(dir, '.env');
    if (existsSync(candidate)) {
      loadDotenv({ path: candidate });
      return;
    }
    const parent = dirname(dir);
    if (parent === dir) return;
    dir = parent;
  }
}
loadEnvFromWorkspaceRoot();

const EnvSchema = z
  .object({
    GITHUB_TOKEN: z.string().min(1, 'GITHUB_TOKEN is required'),
    GITHUB_ORGS: z.string().optional(),
    GITHUB_ENTERPRISE: z.string().optional(),
    DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
    NODE_ENV: z.string().optional(),
    LOG_LEVEL: z.string().optional(),
    GITHUB_API_BASE_URL: z.string().url().default('https://api.github.com'),
    BRONZE_DIR: z.string().default('./data/bronze'),
    GITHUB_INGEST_DELIVERY: z.string().optional(),
  })
  .refine(
    (env) => Boolean((env.GITHUB_ORGS ?? '').trim()) || Boolean((env.GITHUB_ENTERPRISE ?? '').trim()),
    { message: 'At least one of GITHUB_ORGS or GITHUB_ENTERPRISE must be set', path: ['GITHUB_ORGS'] },
  );

export interface CollectorConfig {
  githubToken: string;
  githubOrgs: string[];
  githubEnterprise: string | undefined;
  scopes: Scope[];
  databaseUrl: string;
  nodeEnv: string;
  logLevel?: string;
  githubApiBaseUrl: string;
  bronzeDir: string;
  ingestDelivery: boolean;
}

function splitList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function loadConfig(): CollectorConfig {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new Error(`Invalid collector configuration: ${details}`);
  }

  const githubOrgs = splitList(parsed.data.GITHUB_ORGS);
  const githubEnterprise = parsed.data.GITHUB_ENTERPRISE?.trim().toLowerCase() || undefined;
  const scopes: Scope[] = [
    ...githubOrgs.map((slug) => orgScope(slug)),
    ...(githubEnterprise ? [enterpriseScope(githubEnterprise)] : []),
  ];

  return {
    githubToken: parsed.data.GITHUB_TOKEN,
    githubOrgs,
    githubEnterprise,
    scopes,
    databaseUrl: parsed.data.DATABASE_URL,
    nodeEnv: parsed.data.NODE_ENV ?? 'development',
    logLevel: parsed.data.LOG_LEVEL,
    githubApiBaseUrl: parsed.data.GITHUB_API_BASE_URL,
    bronzeDir: parsed.data.BRONZE_DIR,
    ingestDelivery: parsed.data.GITHUB_INGEST_DELIVERY === 'true',
  };
}
