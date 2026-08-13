import { loadConfig } from '../config.js';
import { enterpriseScope, orgScope, type Scope } from '../github/scope.js';
import { parsePositiveInt, type CommonOptions } from './context.js';

function splitList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function resolveScopes(options: CommonOptions, envScopes: Scope[]): Scope[] {
  const overrideOrgs = splitList(options.orgs);
  const overrideEnterprise = options.enterprise?.trim().toLowerCase();

  if (overrideOrgs.length === 0 && !overrideEnterprise) return envScopes;

  return [
    ...overrideOrgs.map((slug) => orgScope(slug)),
    ...(overrideEnterprise ? [enterpriseScope(overrideEnterprise)] : []),
  ];
}

export async function runConfigCheck(options: CommonOptions): Promise<void> {
  const config = loadConfig();
  parsePositiveInt(options.concurrency, 4, '--concurrency');
  parsePositiveInt(options.maxRetries, 5, '--max-retries');

  const scopes = resolveScopes(options, config.scopes);
  if (scopes.length === 0) {
    throw new Error('No scopes resolved. Set GITHUB_ORGS or GITHUB_ENTERPRISE in .env, or pass --orgs/--enterprise.');
  }

  console.log(
    JSON.stringify({
      status: 'ok',
      databaseUrl: 'configured',
      githubToken: 'configured',
      githubApiBaseUrl: config.githubApiBaseUrl,
      bronzeDir: config.bronzeDir,
      scopes: scopes.map((scope) => `${scope.kind}:${scope.slug}`),
      deliveryIngestion: Boolean(options.withDelivery) || config.ingestDelivery,
    }),
  );
}
