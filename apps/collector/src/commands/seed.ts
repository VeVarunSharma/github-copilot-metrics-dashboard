import { addDays, yesterdayUtc } from '../dates.js';
import { rebuildGold } from '../gold/rebuild.js';
import { ingestOrg28DayLatest } from '../ingestors/org-28-day.js';
import { createIngestContext, DEFAULT_COLLECTOR_CONCURRENCY, parsePositiveInt, runPool, type CommonOptions } from './context.js';
import { runBackfill } from './backfill.js';
import { runCheck } from './check.js';

export async function runSeed(options: CommonOptions): Promise<void> {
  if (options.check) {
    await runCheck(options);
    return;
  }
  const { context, scopes } = createIngestContext(options);
  const concurrency = parsePositiveInt(options.concurrency, DEFAULT_COLLECTOR_CONCURRENCY, '--concurrency');
  await runPool(scopes, concurrency, async (scope) => { await ingestOrg28DayLatest(context, scope); });
  if (!context.dryRun) await rebuildGold(context.database);
  const to = yesterdayUtc();
  const from = addDays(to, -27);
  await runBackfill({ ...options, from, to });
}
