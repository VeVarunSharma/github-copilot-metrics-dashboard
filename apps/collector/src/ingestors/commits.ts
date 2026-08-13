import { GithubCommitsResponseSchema } from '@ghcp-dash/contracts';
import { NoContentError } from '../github/client.js';
import { scopeUrls, type Scope } from '../github/scope.js';
import { upsertCommits, type CommitDailyAggregate } from '../silver/upsert-commits.js';
import { collectPaginatedRepoResponses, ingestRepoJsonResponses, reposForDelivery, type RawRepoResponse } from './delivery-common.js';
import type { IngestContext, IngestResult } from './types.js';

export function ingestCommits(context: IngestContext, scope: Scope, day: string): Promise<IngestResult> {
  return ingestRepoJsonResponses(context, 'commits', scope, day, async () => {
    const repos = await reposForDelivery(context, scope);
    const responses: RawRepoResponse[] = [];
    for (const repo of repos) {
      try {
        responses.push(...await collectPaginatedRepoResponses(context, repo, scopeUrls.repoCommits(repo, day)));
      } catch (error) {
        if (!(error instanceof NoContentError)) throw error;
      }
    }
    return responses;
  }, async (responses) => upsertCommits(context.database, scope.slug, aggregateCommits(responses, day)));
}

export function aggregateCommits(responses: readonly RawRepoResponse[], day: string): CommitDailyAggregate[] {
  const buckets = new Map<string, CommitDailyAggregate>();
  for (const response of responses) {
    const parsed = GithubCommitsResponseSchema.safeParse(JSON.parse(response.text) as unknown);
    if (!parsed.success) throw new Error('Failed to parse commits response', { cause: parsed.error });
    for (const commit of parsed.data) {
      if (!commit.author || commit.commit.author.date.slice(0, 10) !== day) continue;
      const key = `${response.repoId}:${commit.author.id}`;
      const bucket = buckets.get(key) ?? {
        repoId: response.repoId,
        authorUserId: BigInt(commit.author.id),
        day,
        commitCount: 0,
        additionsSum: 0n,
        deletionsSum: 0n,
      };
      bucket.commitCount += 1;
      // The list commits response omits stats; per-commit stat fetching is deferred for v1.
      bucket.additionsSum += 0n;
      bucket.deletionsSum += 0n;
      buckets.set(key, bucket);
    }
  }
  return [...buckets.values()];
}
