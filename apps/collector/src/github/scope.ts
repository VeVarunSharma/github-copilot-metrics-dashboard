/**
 * Scope abstraction for org vs enterprise ingestion.
 *
 * The GitHub Copilot Metrics API exposes the same data at two scope levels:
 *   - organization: /orgs/{org}/copilot/metrics/reports/...
 *   - enterprise:   /enterprises/{enterprise}/copilot/metrics/reports/...
 *
 * The response shapes are equivalent (a `day_totals[]` array), so the same
 * Zod schemas and silver upserts apply to both. The only differences are:
 *   - URL prefixes
 *   - Required token scopes
 *   - The enterprise report endpoints end in `-enterprise-1-day` etc.
 *
 * We persist enterprise data under the same `org_id` column (using the
 * enterprise slug as the key) so the web app needs no awareness of scope.
 */

export type Scope =
  | { readonly kind: 'org'; readonly slug: string }
  | { readonly kind: 'enterprise'; readonly slug: string };

export function orgScope(slug: string): Scope {
  return { kind: 'org', slug };
}

export function enterpriseScope(slug: string): Scope {
  return { kind: 'enterprise', slug };
}

/** Pluralized path prefix: `/orgs/<slug>` or `/enterprises/<slug>`. */
function metricsRoot(scope: Scope): string {
  return scope.kind === 'org' ? `/orgs/${scope.slug}` : `/enterprises/${scope.slug}`;
}

/** Billing endpoints use a slightly different prefix for orgs. */
function billingRoot(scope: Scope): string {
  return scope.kind === 'org'
    ? `/organizations/${scope.slug}`
    : `/enterprises/${scope.slug}`;
}

/** Token of the report-name variant: "organization" vs "enterprise". */
function reportPrefix(scope: Scope): 'organization' | 'enterprise' {
  return scope.kind === 'org' ? 'organization' : 'enterprise';
}

export const scopeUrls = {
  oneDayReport(scope: Scope, day: string): string {
    return `${metricsRoot(scope)}/copilot/metrics/reports/${reportPrefix(scope)}-1-day?day=${day}`;
  },
  twentyEightDayLatest(scope: Scope): string {
    return `${metricsRoot(scope)}/copilot/metrics/reports/${reportPrefix(scope)}-28-day/latest`;
  },
  usersOneDay(scope: Scope, day: string): string {
    return `${metricsRoot(scope)}/copilot/metrics/reports/users-1-day?day=${day}`;
  },
  userTeamsOneDay(scope: Scope, day: string): string {
    return `${metricsRoot(scope)}/copilot/metrics/reports/user-teams-1-day?day=${day}`;
  },
  billingUsage(scope: Scope, day: string): string {
    return `${billingRoot(scope)}/settings/billing/usage?from=${day}&to=${day}`;
  },
  aiCreditsUsage(scope: Scope, day: string): string {
    return `${billingRoot(scope)}/settings/billing/usage/ai-credits?from=${day}&to=${day}`;
  },
  orgRepos(scope: Scope): string {
    if (scope.kind !== 'org') throw new Error('Repository enumeration is only supported for organization scopes');
    return `${metricsRoot(scope)}/repos?per_page=100&type=all`;
  },
  repoReleases(repo: { full_name: string }): string {
    return `/repos/${repo.full_name}/releases?per_page=100`;
  },
  repoWorkflowRuns(repo: { full_name: string }, day: string): string {
    return `/repos/${repo.full_name}/actions/runs?created=${day}&per_page=100`;
  },
  repoCommits(repo: { full_name: string }, day: string): string {
    return `/repos/${repo.full_name}/commits?since=${day}T00:00:00Z&until=${day}T23:59:59Z&per_page=100`;
  },
};

/**
 * Required GitHub token scopes for a given target scope.
 *
 * Metrics endpoints:
 *   - org:        read:org
 *   - enterprise: read:enterprise OR manage_billing:copilot
 * Billing/AI-credits endpoints (both org and enterprise):
 *   - manage_billing:copilot
 *
 * We split metrics scopes (required) from billing scopes (recommended-but-
 * optional, since the dashboard degrades gracefully when billing returns
 * 404 / no_content).
 */
export function requiredScopesFor(scopes: readonly Scope[], options: { delivery?: boolean } = {}): {
  metrics: string[][];
  billing: string[];
} {
  const metrics: string[][] = [];
  for (const scope of scopes) {
    if (scope.kind === 'org') {
      metrics.push(['read:org']);
    } else {
      metrics.push(['read:enterprise', 'manage_billing:copilot']);
    }
  }
  if (options.delivery) metrics.push(['repo', 'public_repo']);
  return {
    metrics,
    billing: ['manage_billing:copilot'],
  };
}
