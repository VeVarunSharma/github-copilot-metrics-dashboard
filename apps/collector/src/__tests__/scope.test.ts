import { describe, expect, it } from 'vitest';
import { enterpriseScope, orgScope, requiredScopesFor, scopeUrls } from '../github/scope.js';

describe('scope URL builders', () => {
  it('builds org-scoped metrics URLs', () => {
    const scope = orgScope('octo');
    expect(scopeUrls.oneDayReport(scope, '2026-06-18')).toBe(
      '/orgs/octo/copilot/metrics/reports/organization-1-day?day=2026-06-18',
    );
    expect(scopeUrls.twentyEightDayLatest(scope)).toBe(
      '/orgs/octo/copilot/metrics/reports/organization-28-day/latest',
    );
    expect(scopeUrls.usersOneDay(scope, '2026-06-18')).toBe(
      '/orgs/octo/copilot/metrics/reports/users-1-day?day=2026-06-18',
    );
    expect(scopeUrls.userTeamsOneDay(scope, '2026-06-18')).toBe(
      '/orgs/octo/copilot/metrics/reports/user-teams-1-day?day=2026-06-18',
    );
    expect(scopeUrls.billingUsage(scope, '2026-06-18')).toBe(
      '/organizations/octo/settings/billing/usage?from=2026-06-18&to=2026-06-18',
    );
    expect(scopeUrls.aiCreditsUsage(scope, '2026-06-18')).toBe(
      '/organizations/octo/settings/billing/usage/ai-credits?from=2026-06-18&to=2026-06-18',
    );
    expect(scopeUrls.orgRepos(scope)).toBe('/orgs/octo/repos?per_page=100&type=all');
    expect(scopeUrls.repoReleases({ full_name: 'octo/repo' })).toBe('/repos/octo/repo/releases?per_page=100');
    expect(scopeUrls.repoWorkflowRuns({ full_name: 'octo/repo' }, '2026-06-18')).toBe('/repos/octo/repo/actions/runs?created=2026-06-18&per_page=100');
    expect(scopeUrls.repoCommits({ full_name: 'octo/repo' }, '2026-06-18')).toBe('/repos/octo/repo/commits?since=2026-06-18T00:00:00Z&until=2026-06-18T23:59:59Z&per_page=100');
  });

  it('builds enterprise-scoped metrics URLs with the enterprise prefix', () => {
    const scope = enterpriseScope('acme');
    expect(scopeUrls.oneDayReport(scope, '2026-06-18')).toBe(
      '/enterprises/acme/copilot/metrics/reports/enterprise-1-day?day=2026-06-18',
    );
    expect(scopeUrls.twentyEightDayLatest(scope)).toBe(
      '/enterprises/acme/copilot/metrics/reports/enterprise-28-day/latest',
    );
    expect(scopeUrls.usersOneDay(scope, '2026-06-18')).toBe(
      '/enterprises/acme/copilot/metrics/reports/users-1-day?day=2026-06-18',
    );
    expect(scopeUrls.userTeamsOneDay(scope, '2026-06-18')).toBe(
      '/enterprises/acme/copilot/metrics/reports/user-teams-1-day?day=2026-06-18',
    );
    expect(scopeUrls.billingUsage(scope, '2026-06-18')).toBe(
      '/enterprises/acme/settings/billing/usage?from=2026-06-18&to=2026-06-18',
    );
    expect(scopeUrls.aiCreditsUsage(scope, '2026-06-18')).toBe(
      '/enterprises/acme/settings/billing/usage/ai-credits?from=2026-06-18&to=2026-06-18',
    );
  });
});

describe('requiredScopesFor', () => {
  it('asks for read:org on org scopes', () => {
    const required = requiredScopesFor([orgScope('octo')]);
    expect(required.metrics).toEqual([['read:org']]);
    expect(required.billing).toEqual(['manage_billing:copilot']);
  });

  it('asks for read:enterprise OR manage_billing:copilot on enterprise scopes', () => {
    const required = requiredScopesFor([enterpriseScope('acme')]);
    expect(required.metrics).toEqual([['read:enterprise', 'manage_billing:copilot']]);
    expect(required.billing).toEqual(['manage_billing:copilot']);
  });

  it('handles a mixed list', () => {
    const required = requiredScopesFor([orgScope('octo'), enterpriseScope('acme')]);
    expect(required.metrics).toEqual([['read:org'], ['read:enterprise', 'manage_billing:copilot']]);
  });

  it('adds repo/public_repo when delivery ingestion is enabled', () => {
    const required = requiredScopesFor([orgScope('octo')], { delivery: true });
    expect(required.metrics).toEqual([['read:org'], ['repo', 'public_repo']]);
  });
});
