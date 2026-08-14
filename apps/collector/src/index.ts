#!/usr/bin/env node
import { Command } from 'commander';
import { runBackfill } from './commands/backfill.js';
import { runConfigCheck } from './commands/config-check.js';
import { runCollect } from './commands/collect.js';
import { runExportParquet } from './commands/export-parquet.js';
import { runGold } from './commands/gold.js';
import { runSeed } from './commands/seed.js';
import { DEFAULT_COLLECTOR_CONCURRENCY } from './commands/context.js';

function addCommonOptions(command: Command): Command {
  return command
    .option('--check', 'health check only')
    .option('--dry-run', 'execute without DB writes')
    .option('--concurrency <number>', 'parallel fetches per scope', String(DEFAULT_COLLECTOR_CONCURRENCY))
    .option('--verbose', 'enable debug logging')
    .option('--max-retries <number>', 'maximum GitHub retry attempts', '5')
    .option('--orgs <slugs>', 'comma-separated org slugs (overrides GITHUB_ORGS)')
    .option('--enterprise <slug>', 'enterprise slug (overrides GITHUB_ENTERPRISE)')
    .option('--with-delivery', 'include Phase 1 delivery ingestors (requires repo or public_repo scope)');
}

const program = new Command();
program
  .name('ghcp-collector')
  .description('GitHub Copilot Metrics Dashboard ingestion CLI')
  .version('0.1.0')
  .showHelpAfterError();

addCommonOptions(program.command('collect').description("collect yesterday's UTC data")).action(async (options) => runCollect(options));
addCommonOptions(program.command('backfill').description('backfill a day range').requiredOption('--from <date>', 'YYYY-MM-DD').requiredOption('--to <date>', 'YYYY-MM-DD')).action(async (options) => runBackfill(options));
addCommonOptions(program.command('config-check').description('validate collector configuration without calling GitHub')).action(async (options) => runConfigCheck(options));
addCommonOptions(program.command('seed').description('seed latest 28-day report, then daily backfill')).action(async (options) => runSeed(options));
addCommonOptions(program.command('gold').description('rebuild gold tables from silver')).action(async (options) => runGold(options));
addCommonOptions(program.command('export-parquet').description('export silver tables to parquet').option('--out <dir>', 'output directory', './exports')).action(async (options) => runExportParquet(options));

program.action(async () => runCollect(program.opts()));

try {
  await program.parseAsync(process.argv);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
}

// Force exit so the open Postgres pool / pino transport worker don't keep the
// event loop alive forever. Commands that need to await background work should
// do so explicitly before returning.
process.exit(process.exitCode ?? 0);
