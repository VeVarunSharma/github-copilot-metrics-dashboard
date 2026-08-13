import { exportSilverParquet } from '../parquet/writer.js';
import { createIngestContext, type CommonOptions } from './context.js';
import { runCheck } from './check.js';

interface ExportOptions extends CommonOptions {
  out?: string;
}

export async function runExportParquet(options: ExportOptions): Promise<void> {
  if (options.check) {
    await runCheck(options);
    return;
  }
  const { context } = createIngestContext(options);
  if (context.dryRun) {
    context.logger.info('dry run: parquet export skipped');
    return;
  }
  const count = await exportSilverParquet(context.database, options.out ?? './exports');
  context.logger.info({ count, out: options.out ?? './exports' }, 'parquet export complete');
}
