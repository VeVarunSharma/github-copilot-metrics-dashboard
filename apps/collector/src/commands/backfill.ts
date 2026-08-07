import { assertDate, clampFromDate, dateRange } from '../dates.js';
import { loadConfig } from '../config.js';
import { rebuildGold } from '../gold/rebuild.js';
import { listRepos } from '../github/repos.js';
import type { Scope } from '../github/scope.js';
import { ingestAiCredits } from '../ingestors/ai-credits.js';
import { ingestBilling } from '../ingestors/billing.js';
import { ingestCommits } from '../ingestors/commits.js';
import { ingestOrgDaily } from '../ingestors/org-daily.js';
import { ingestReleases } from '../ingestors/releases.js';
import { ingestUserTeamsDaily } from '../ingestors/user-teams-daily.js';
import { ingestUsersDaily } from '../ingestors/users-daily.js';
import { ingestWorkflowRuns } from '../ingestors/workflow-runs.js';
import type { IngestContext } from '../ingestors/types.js';
import { upsertRepos } from '../silver/upsert-repos.js';
import { createIngestContext, DEFAULT_COLLECTOR_CONCURRENCY, parsePositiveInt, runPool, type CommonOptions } from './context.js';
import { runCheck } from './check.js';

interface BackfillOptions extends CommonOptions {
  from?: string;
  to?: string;
}

type SourceFn = (context: IngestContext, scope: Scope, day: string) => Promise<unknown>;
const BASE_SOURCES: SourceFn[] = [ingestOrgDaily, ingestUsersDaily, ingestUserTeamsDaily, ingestBilling, ingestAiCredits];
const DELIVERY_SOURCES: SourceFn[] = [ingestReleases, ingestWorkflowRuns, ingestCommits];

export async function runBackfill(options: BackfillOptions): Promise<void> {
  if (options.check) {
    await runCheck(options);
    return;
  }
  if (!options.from || !options.to) throw new Error('backfill requires --from and --to');
  assertDate(options.from, '--from');
  assertDate(options.to, '--to');
  const clamped = clampFromDate(options.from);
  const from = clamped.from;
  if (clamped.clamped) console.warn(`Requested --from predates available history; clamped to ${clamped.min}`);
  if (from > options.to) throw new Error('--from must be on or before --to after clamping');

  const deliveryEnabled = Boolean(options.withDelivery) || loadConfig().ingestDelivery;
  const { context, scopes } = createIngestContext(options);
  const sources = deliveryEnabled ? [...BASE_SOURCES, ...DELIVERY_SOURCES] : BASE_SOURCES;
  if (deliveryEnabled) context.deliveryRepos = new Map();
  const concurrency = parsePositiveInt(options.concurrency, DEFAULT_COLLECTOR_CONCURRENCY, '--concurrency');
  for (const scope of scopes) {
    if (deliveryEnabled) {
      const repos = await listRepos(context.client, scope);
      context.deliveryRepos?.set(scope.slug, repos);
      if (!context.dryRun) await upsertRepos(context.database, scope, repos);
      context.logger.info({ scope: scope.kind, slug: scope.slug, repoCount: repos.length }, 'completed delivery repo discovery');
    }
    for (const day of dateRange(from, options.to)) {
      await runPool(sources, concurrency, async (source) => { await source(context, scope, day); });
      if (!context.dryRun) await rebuildGold(context.database, [{ orgId: scope.slug, day }]);
      context.logger.info({ scope: scope.kind, slug: scope.slug, day }, 'completed backfill day');
    }
  }
}
