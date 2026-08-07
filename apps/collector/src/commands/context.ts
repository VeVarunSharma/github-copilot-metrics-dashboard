import { createDb } from '@ghcp-dash/db';
import { loadConfig } from '../config.js';
import { GitHubClient } from '../github/client.js';
import { enterpriseScope, orgScope, type Scope } from '../github/scope.js';
import { createLogger } from '../logger.js';
import type { IngestContext } from '../ingestors/types.js';

export interface CommonOptions {
  check?: boolean;
  dryRun?: boolean;
  concurrency?: string | number;
  verbose?: boolean;
  maxRetries?: string | number;
  /** Comma-separated org slugs to override env. */
  orgs?: string;
  /** Optional enterprise slug to override env. */
  enterprise?: string;
  withDelivery?: boolean;
}

export const DEFAULT_COLLECTOR_CONCURRENCY = 4;

export function parsePositiveInt(value: string | number | undefined, fallback: number, name: string): number {
  if (value === undefined) return fallback;
  const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer`);
  return parsed;
}

function splitList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function createIngestContext(options: CommonOptions): { context: IngestContext; scopes: Scope[] } {
  const config = loadConfig();
  const logger = createLogger(Boolean(options.verbose));
  const database = createDb(config.databaseUrl);
  const client = new GitHubClient({
    token: config.githubToken,
    baseUrl: config.githubApiBaseUrl,
    maxRetries: parsePositiveInt(options.maxRetries, 5, '--max-retries'),
    logger,
  });

  const overrideOrgs = splitList(options.orgs);
  const overrideEnterprise = options.enterprise?.trim().toLowerCase();

  const scopes: Scope[] = (
    overrideOrgs.length > 0 || overrideEnterprise
      ? [
          ...overrideOrgs.map((slug) => orgScope(slug)),
          ...(overrideEnterprise ? [enterpriseScope(overrideEnterprise)] : []),
        ]
      : config.scopes
  );

  if (scopes.length === 0) {
    throw new Error('No scopes resolved. Set GITHUB_ORGS or GITHUB_ENTERPRISE in .env, or pass --orgs/--enterprise.');
  }

  return { context: { client, database, bronzeDir: config.bronzeDir, dryRun: Boolean(options.dryRun), logger }, scopes };
}

export async function runPool<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  async function runOne(): Promise<void> {
    for (;;) {
      const index = next;
      next += 1;
      const item = items[index];
      if (item === undefined) return;
      await worker(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => runOne()));
}
