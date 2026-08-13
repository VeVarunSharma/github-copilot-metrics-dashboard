import { yesterdayUtc } from '../dates.js';
import { runBackfill } from './backfill.js';
import type { CommonOptions } from './context.js';

export async function runCollect(options: CommonOptions): Promise<void> {
  const day = yesterdayUtc();
  await runBackfill({ ...options, from: day, to: day });
}
