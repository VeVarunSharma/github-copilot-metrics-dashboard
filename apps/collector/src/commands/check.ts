import { createDb, pingDb } from '@ghcp-dash/db';
import { loadConfig } from '../config.js';
import { validateToken } from '../github/auth.js';
import { GitHubClient } from '../github/client.js';
import { createLogger } from '../logger.js';
import type { CommonOptions } from './context.js';

export async function runCheck(options: CommonOptions): Promise<void> {
  const logger = createLogger(Boolean(options.verbose));
  const config = loadConfig();
  const database = createDb(config.databaseUrl);
  const dbOk = await pingDb(database);
  if (!dbOk) throw new Error('Database ping failed');
  const client = new GitHubClient({
    token: config.githubToken,
    baseUrl: config.githubApiBaseUrl,
    maxRetries: 1,
    timeoutMs: 10_000,
    logger,
  });
  const result = await validateToken(client, config.scopes, { delivery: Boolean(options.withDelivery) || config.ingestDelivery });
  if (result.missingBillingScopes.length > 0) {
    logger.warn(
      { missing: result.missingBillingScopes },
      'GITHUB_TOKEN is missing recommended scopes for billing/AI-credits ingestion; those endpoints will be skipped',
    );
  }
  logger.info(
    {
      login: result.login,
      scopes: config.scopes.map((s) => `${s.kind}:${s.slug}`),
      tokenScopes: result.scopes,
    },
    'collector check passed',
  );
}
