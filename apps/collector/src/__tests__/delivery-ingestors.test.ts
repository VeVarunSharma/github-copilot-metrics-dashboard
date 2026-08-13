import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '@ghcp-dash/db';
import { GitHubClient } from '../github/client.js';
import { orgScope } from '../github/scope.js';
import { ingestCommits } from '../ingestors/commits.js';
import { ingestReleases } from '../ingestors/releases.js';
import type { IngestContext } from '../ingestors/types.js';
import type { Logger } from '../logger.js';
import { ingestWorkflowRuns } from '../ingestors/workflow-runs.js';
import { upsertCommits } from '../silver/upsert-commits.js';
import { upsertReleases } from '../silver/upsert-releases.js';
import { upsertWorkflowRuns } from '../silver/upsert-workflow-runs.js';

const checkpoint = vi.hoisted(() => ({
  claimIngestionRun: vi.fn(async () => ({ runId: 'run-1', skipped: false, attempts: 1 })),
  finalizeIngestionRun: vi.fn(async () => undefined),
  failIngestionRun: vi.fn(async () => undefined),
}));

vi.mock('../checkpoint/ingestion-run.js', () => checkpoint);
vi.mock('../silver/common.js', () => ({ ensureOrgExists: vi.fn(async () => undefined) }));
vi.mock('../silver/upsert-repos.js', () => ({ upsertRepos: vi.fn(async (_db, _scope, repos) => repos.length) }));
vi.mock('../silver/upsert-releases.js', () => ({ upsertReleases: vi.fn(async (_db, _org, rows) => rows.length) }));
vi.mock('../silver/upsert-workflow-runs.js', () => ({ upsertWorkflowRuns: vi.fn(async (_db, _org, rows) => rows.length) }));
vi.mock('../silver/upsert-commits.js', () => ({ upsertCommits: vi.fn(async (_db, _org, rows) => rows.length) }));

const bronzeDir = join(process.cwd(), 'apps/collector/.test-bronze');
const originalFetch = globalThis.fetch;

function context(): IngestContext {
  return {
    client: new GitHubClient({ token: 'secret', baseUrl: 'https://api.example.test', maxRetries: 1 }),
    database: {} as Database,
    bronzeDir,
    dryRun: false,
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as unknown as Logger,
  };
}

function reposResponse() {
  return [{ id: 42, name: 'repo', full_name: 'octo/repo', default_branch: 'main', archived: false, fork: false, private: true, pushed_at: '2026-06-21T00:00:00Z' }];
}

beforeEach(async () => {
  await rm(bronzeDir, { recursive: true, force: true });
  vi.clearAllMocks();
  checkpoint.claimIngestionRun.mockResolvedValue({ runId: 'run-1', skipped: false, attempts: 1 });
});

afterEach(async () => {
  globalThis.fetch = originalFetch;
  await rm(bronzeDir, { recursive: true, force: true });
});

describe('delivery ingestors', () => {
  it('aggregates releases for the target day and is idempotent', async () => {
    globalThis.fetch = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.pathname === '/orgs/octo/repos') return new Response(JSON.stringify(reposResponse()), { status: 200 });
      if (url.pathname === '/repos/octo/repo/releases') {
        return new Response(JSON.stringify([
          { id: 1, tag_name: 'v1', name: 'v1', draft: false, prerelease: false, created_at: '2026-06-21T01:00:00Z', published_at: '2026-06-21T02:00:00Z', html_url: 'https://example.test/r/1' },
          { id: 2, tag_name: 'v2-rc', name: 'v2-rc', draft: false, prerelease: true, created_at: '2026-06-21T03:00:00Z', published_at: '2026-06-21T04:00:00Z', html_url: 'https://example.test/r/2' },
          { id: 3, tag_name: 'old', name: 'old', draft: false, prerelease: false, created_at: '2026-06-20T03:00:00Z', published_at: '2026-06-20T04:00:00Z', html_url: 'https://example.test/r/3' },
        ]), { status: 200 });
      }
      throw new Error(`unexpected URL ${url.href}`);
    }) as typeof fetch;

    const result = await ingestReleases(context(), orgScope('octo'), '2026-06-21');

    expect(result.rowsWritten).toBe(1);
    expect(upsertReleases).toHaveBeenCalledWith(expect.anything(), 'octo', [{ repoId: 42n, day: '2026-06-21', releaseCount: 2, prereleaseCount: 1, latestTagAt: new Date('2026-06-21T04:00:00Z') }]);

    vi.clearAllMocks();
    checkpoint.claimIngestionRun.mockResolvedValue({ runId: 'run-1', skipped: true, attempts: 1 });
    const rerun = await ingestReleases(context(), orgScope('octo'), '2026-06-21');
    expect(rerun.status).toBe('success');
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(upsertReleases).not.toHaveBeenCalled();
  });

  it('treats a 204 delivery endpoint as no_content', async () => {
    globalThis.fetch = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.pathname === '/orgs/octo/repos') return new Response(JSON.stringify(reposResponse()), { status: 200 });
      if (url.pathname === '/repos/octo/repo/releases') return new Response(null, { status: 204 });
      throw new Error(`unexpected URL ${url.href}`);
    }) as typeof fetch;

    const result = await ingestReleases(context(), orgScope('octo'), '2026-06-21');

    expect(result.status).toBe('no_content');
    expect(result.rowsWritten).toBe(0);
    expect(upsertReleases).not.toHaveBeenCalled();
  });

  it('aggregates workflow run conclusions and durations by workflow', async () => {
    globalThis.fetch = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.pathname === '/orgs/octo/repos') return new Response(JSON.stringify(reposResponse()), { status: 200 });
      if (url.pathname === '/repos/octo/repo/actions/runs') {
        return new Response(JSON.stringify({ total_count: 4, workflow_runs: [
          { id: 1, workflow_id: 100, status: 'completed', conclusion: 'success', run_attempt: 1, created_at: '2026-06-21T01:00:00Z', run_started_at: '2026-06-21T01:00:00Z', updated_at: '2026-06-21T01:01:00Z' },
          { id: 2, workflow_id: 100, status: 'completed', conclusion: 'failure', run_attempt: 1, created_at: '2026-06-21T02:00:00Z', run_started_at: '2026-06-21T02:00:00Z', updated_at: '2026-06-21T02:03:00Z' },
          { id: 3, workflow_id: 100, status: 'completed', conclusion: 'cancelled', run_attempt: 1, created_at: '2026-06-21T03:00:00Z', run_started_at: '2026-06-21T03:00:00Z', updated_at: '2026-06-21T03:05:00Z' },
          { id: 4, workflow_id: 200, status: 'completed', conclusion: 'timed_out', run_attempt: 1, created_at: '2026-06-21T04:00:00Z', run_started_at: '2026-06-21T04:00:00Z', updated_at: '2026-06-21T04:10:00Z' },
        ] }), { status: 200 });
      }
      throw new Error(`unexpected URL ${url.href}`);
    }) as typeof fetch;

    const result = await ingestWorkflowRuns(context(), orgScope('octo'), '2026-06-21');

    expect(result.rowsWritten).toBe(2);
    expect(upsertWorkflowRuns).toHaveBeenCalledWith(expect.anything(), 'octo', [
      { repoId: 42n, workflowId: 100n, day: '2026-06-21', successCount: 1, failureCount: 1, cancelledCount: 1, medianDurationSec: '180', p90DurationSec: '300' },
      { repoId: 42n, workflowId: 200n, day: '2026-06-21', successCount: 0, failureCount: 1, cancelledCount: 0, medianDurationSec: '600', p90DurationSec: '600' },
    ]);
  });

  it('aggregates commits by matched author without persisting SHAs', async () => {
    globalThis.fetch = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.pathname === '/orgs/octo/repos') return new Response(JSON.stringify(reposResponse()), { status: 200 });
      if (url.pathname === '/repos/octo/repo/commits') {
        return new Response(JSON.stringify([
          { sha: 'a', commit: { author: { name: 'A', email: 'a@example.test', date: '2026-06-21T01:00:00Z' }, committer: { name: 'A', email: 'a@example.test', date: '2026-06-21T01:00:00Z' }, message: 'one' }, author: { id: 7, login: 'ann' } },
          { sha: 'b', commit: { author: { name: 'A', email: 'a@example.test', date: '2026-06-21T02:00:00Z' }, committer: { name: 'A', email: 'a@example.test', date: '2026-06-21T02:00:00Z' }, message: 'two' }, author: { id: 7, login: 'ann' } },
          { sha: 'c', commit: { author: { name: 'B', email: 'b@example.test', date: '2026-06-21T03:00:00Z' }, committer: { name: 'B', email: 'b@example.test', date: '2026-06-21T03:00:00Z' }, message: 'three' }, author: { id: 8, login: 'bea' } },
          { sha: 'd', commit: { author: { name: 'U', email: 'u@example.test', date: '2026-06-21T04:00:00Z' }, committer: { name: 'U', email: 'u@example.test', date: '2026-06-21T04:00:00Z' }, message: 'skip' }, author: null },
        ]), { status: 200 });
      }
      throw new Error(`unexpected URL ${url.href}`);
    }) as typeof fetch;

    const result = await ingestCommits(context(), orgScope('octo'), '2026-06-21');

    expect(result.rowsWritten).toBe(2);
    const rows = vi.mocked(upsertCommits).mock.calls[0]?.[2];
    expect(rows).toEqual([
      { repoId: 42n, authorUserId: 7n, day: '2026-06-21', commitCount: 2, additionsSum: 0n, deletionsSum: 0n },
      { repoId: 42n, authorUserId: 8n, day: '2026-06-21', commitCount: 1, additionsSum: 0n, deletionsSum: 0n },
    ]);
    expect(rows?.flatMap((row) => Object.keys(row))).not.toContain('sha');
  });
});
