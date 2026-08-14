import { GitHubClient } from './client.js';
import { requiredScopesFor, type Scope } from './scope.js';

export interface TokenValidationResult {
  login?: string;
  scopes: string[];
  missingMetricsScopes: string[];
  missingBillingScopes: string[];
}

export async function validateToken(client: GitHubClient, scopes: readonly Scope[] = [], options: { delivery?: boolean } = {}): Promise<TokenValidationResult> {
  const response = await client.request('/user');
  const tokenScopes = (response.headers.get('X-OAuth-Scopes') ?? '')
    .split(',')
    .map((scope) => scope.trim())
    .filter(Boolean);

  const required = requiredScopesFor(scopes, options);

  // Metrics: each scope MAY accept any one of a set of scopes (OR semantics).
  const missingMetricsScopes: string[] = [];
  for (const accepted of required.metrics) {
    if (!accepted.some((s) => tokenScopes.includes(s))) {
      missingMetricsScopes.push(accepted.join(' OR '));
    }
  }

  const missingBillingScopes = required.billing.filter((s) => !tokenScopes.includes(s));

  if (missingMetricsScopes.length > 0) {
    throw new Error(
      `GITHUB_TOKEN is missing required scopes for metrics ingestion: ${missingMetricsScopes.join('; ')}. ` +
        `Token has: [${tokenScopes.join(', ')}].`,
    );
  }

  const body = (await response.json()) as { login?: string };
  return { login: body.login, scopes: tokenScopes, missingMetricsScopes, missingBillingScopes };
}
