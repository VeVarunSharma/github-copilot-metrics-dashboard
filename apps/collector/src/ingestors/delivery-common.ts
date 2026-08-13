import { writeBronzeNdjson } from '../bronze/storage.js';
import { claimIngestionRun, failIngestionRun, finalizeIngestionRun } from '../checkpoint/ingestion-run.js';
import { NoContentError } from '../github/client.js';
import { listRepos } from '../github/repos.js';
import type { Scope } from '../github/scope.js';
import { ensureOrgExists } from '../silver/common.js';
import { upsertRepos } from '../silver/upsert-repos.js';
import type { IngestContext, IngestResult } from './types.js';

export interface RawRepoResponse {
  repoId: bigint;
  repoName: string;
  text: string;
}

export async function reposForDelivery(context: IngestContext, scope: Scope): Promise<Awaited<ReturnType<typeof listRepos>>> {
  const cached = context.deliveryRepos?.get(scope.slug);
  if (cached) return cached;
  const repos = await listRepos(context.client, scope);
  if (!context.dryRun) await upsertRepos(context.database, scope, repos);
  context.deliveryRepos?.set(scope.slug, repos);
  return repos;
}

export async function ingestRepoJsonResponses<T>(
  context: IngestContext,
  source: string,
  scope: Scope,
  day: string,
  fetchResponses: () => Promise<RawRepoResponse[]>,
  parseAndPersist: (responses: RawRepoResponse[]) => Promise<number>,
): Promise<IngestResult> {
  const orgId = scope.slug;
  if (!context.dryRun) await ensureOrgExists(context.database, orgId);
  const claimed = await claimIngestionRun(context.database, source, orgId, day, context.dryRun);
  if (claimed.skipped) return { source, orgId, day, rowsWritten: 0, status: 'success' };

  try {
    const responses = await fetchResponses();
    if (responses.length === 0) {
      await finalizeIngestionRun(context.database, claimed.runId, 'no_content', 0, undefined, context.dryRun, context.logger);
      return { source, orgId, day, rowsWritten: 0, status: 'no_content' };
    }
    const raw = responses.map((response) => response.text.endsWith('\n') ? response.text : `${response.text}\n`).join('');
    const bronzePath = await writeBronzeNdjson(context.bronzeDir, source, orgId, day, raw);
    const rowsWritten = context.dryRun ? 0 : await parseAndPersist(responses);
    await finalizeIngestionRun(context.database, claimed.runId, 'success', rowsWritten, bronzePath, context.dryRun, context.logger);
    return { source, orgId, day, rowsWritten, status: 'success', bronzePath };
  } catch (error) {
    if (error instanceof NoContentError) {
      await finalizeIngestionRun(context.database, claimed.runId, 'no_content', 0, undefined, context.dryRun, context.logger);
      return { source, orgId, day, rowsWritten: 0, status: 'no_content' };
    }
    await failIngestionRun(context.database, claimed.runId, error, context.dryRun, context.logger);
    throw error;
  }
}

export async function collectPaginatedRepoResponses(context: IngestContext, repo: { id: number; name: string; full_name: string }, firstUrl: string): Promise<RawRepoResponse[]> {
  const responses: RawRepoResponse[] = [];
  let url: string | undefined = firstUrl;
  while (url) {
    const response = await context.client.request(url);
    const text = await response.text();
    responses.push({ repoId: BigInt(repo.id), repoName: repo.name, text });
    url = nextLink(response.headers);
  }
  return responses;
}

function nextLink(headers: Headers): string | undefined {
  const link = headers.get('Link');
  if (!link) return undefined;
  for (const part of link.split(',')) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/);
    if (match?.[1]) return match[1];
  }
  return undefined;
}
