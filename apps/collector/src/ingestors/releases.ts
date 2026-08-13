import { GithubReleasesResponseSchema } from '@ghcp-dash/contracts';
import { NoContentError } from '../github/client.js';
import { scopeUrls, type Scope } from '../github/scope.js';
import { upsertReleases, type ReleaseDailyAggregate } from '../silver/upsert-releases.js';
import { collectPaginatedRepoResponses, ingestRepoJsonResponses, reposForDelivery, type RawRepoResponse } from './delivery-common.js';
import type { IngestContext, IngestResult } from './types.js';

export function ingestReleases(context: IngestContext, scope: Scope, day: string): Promise<IngestResult> {
  return ingestRepoJsonResponses(context, 'releases', scope, day, async () => {
    const repos = await reposForDelivery(context, scope);
    const responses: RawRepoResponse[] = [];
    for (const repo of repos) {
      try {
        responses.push(...await collectPaginatedRepoResponses(context, repo, scopeUrls.repoReleases(repo)));
      } catch (error) {
        if (!(error instanceof NoContentError)) throw error;
      }
    }
    return responses;
  }, async (responses) => upsertReleases(context.database, scope.slug, aggregateReleases(responses, day)));
}

export function aggregateReleases(responses: readonly RawRepoResponse[], day: string): ReleaseDailyAggregate[] {
  const byRepo = new Map<string, ReleaseDailyAggregate>();
  for (const response of responses) {
    const parsed = GithubReleasesResponseSchema.safeParse(JSON.parse(response.text) as unknown);
    if (!parsed.success) throw new Error('Failed to parse releases response', { cause: parsed.error });
    for (const release of parsed.data) {
      if (!release.published_at || release.published_at.slice(0, 10) !== day) continue;
      const key = response.repoId.toString();
      const current = byRepo.get(key) ?? { repoId: response.repoId, day, releaseCount: 0, prereleaseCount: 0, latestTagAt: null };
      current.releaseCount += 1;
      if (release.prerelease) current.prereleaseCount += 1;
      const publishedAt = new Date(release.published_at);
      if (!current.latestTagAt || publishedAt > current.latestTagAt) current.latestTagAt = publishedAt;
      byRepo.set(key, current);
    }
  }
  return [...byRepo.values()];
}
