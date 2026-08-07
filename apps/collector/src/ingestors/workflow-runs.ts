import { GithubWorkflowRunsResponseSchema } from '@ghcp-dash/contracts';
import { NoContentError } from '../github/client.js';
import { scopeUrls, type Scope } from '../github/scope.js';
import { upsertWorkflowRuns, type WorkflowRunDailyAggregate } from '../silver/upsert-workflow-runs.js';
import { collectPaginatedRepoResponses, ingestRepoJsonResponses, reposForDelivery, type RawRepoResponse } from './delivery-common.js';
import type { IngestContext, IngestResult } from './types.js';

export function ingestWorkflowRuns(context: IngestContext, scope: Scope, day: string): Promise<IngestResult> {
  return ingestRepoJsonResponses(context, 'workflow_runs', scope, day, async () => {
    const repos = await reposForDelivery(context, scope);
    const responses: RawRepoResponse[] = [];
    for (const repo of repos) {
      try {
        responses.push(...await collectPaginatedRepoResponses(context, repo, scopeUrls.repoWorkflowRuns(repo, day)));
      } catch (error) {
        if (!(error instanceof NoContentError)) throw error;
      }
    }
    return responses;
  }, async (responses) => upsertWorkflowRuns(context.database, scope.slug, aggregateWorkflowRuns(responses, day)));
}

interface WorkflowBucket {
  repoId: bigint;
  workflowId: bigint;
  day: string;
  successCount: number;
  failureCount: number;
  cancelledCount: number;
  durations: number[];
}

export function aggregateWorkflowRuns(responses: readonly RawRepoResponse[], day: string): WorkflowRunDailyAggregate[] {
  const buckets = new Map<string, WorkflowBucket>();
  for (const response of responses) {
    const parsed = GithubWorkflowRunsResponseSchema.safeParse(JSON.parse(response.text) as unknown);
    if (!parsed.success) throw new Error('Failed to parse workflow runs response', { cause: parsed.error });
    for (const run of parsed.data.workflow_runs) {
      if (run.created_at.slice(0, 10) !== day) continue;
      const key = `${response.repoId}:${run.workflow_id}`;
      const bucket = buckets.get(key) ?? { repoId: response.repoId, workflowId: BigInt(run.workflow_id), day, successCount: 0, failureCount: 0, cancelledCount: 0, durations: [] };
      if (run.conclusion === 'success') bucket.successCount += 1;
      if (run.conclusion === 'failure' || run.conclusion === 'timed_out') bucket.failureCount += 1;
      if (run.conclusion === 'cancelled') bucket.cancelledCount += 1;
      if (run.run_started_at) {
        const duration = Math.max(0, Math.round((Date.parse(run.updated_at) - Date.parse(run.run_started_at)) / 1000));
        if (Number.isFinite(duration)) bucket.durations.push(duration);
      }
      buckets.set(key, bucket);
    }
  }
  return [...buckets.values()].map((bucket) => ({
    repoId: bucket.repoId,
    workflowId: bucket.workflowId,
    day: bucket.day,
    successCount: bucket.successCount,
    failureCount: bucket.failureCount,
    cancelledCount: bucket.cancelledCount,
    medianDurationSec: percentile(bucket.durations, 0.5).toString(),
    p90DurationSec: percentile(bucket.durations, 0.9).toString(),
  }));
}

function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))] ?? 0;
}
