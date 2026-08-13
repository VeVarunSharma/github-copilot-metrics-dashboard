import { rebuildGold } from '../gold/rebuild.js';
import { createIngestContext, type CommonOptions } from './context.js';
import { runCheck } from './check.js';

export async function runGold(options: CommonOptions): Promise<void> {
  if (options.check) {
    await runCheck(options);
    return;
  }
  const { context } = createIngestContext(options);
  if (context.dryRun) {
    context.logger.info('dry run: gold rebuild skipped');
    return;
  }
  const rows = await rebuildGold(context.database);
  context.logger.info({ rows }, 'gold rebuild complete');
}
