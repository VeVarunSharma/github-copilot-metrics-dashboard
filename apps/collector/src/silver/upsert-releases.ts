import { factReleaseDaily, type Database } from '@ghcp-dash/db';
import { ensureOrgExists } from './common.js';

export interface ReleaseDailyAggregate {
  repoId: bigint;
  day: string;
  releaseCount: number;
  prereleaseCount: number;
  latestTagAt: Date | null;
}

export async function upsertReleases(database: Database, orgId: string, rows: readonly ReleaseDailyAggregate[]): Promise<number> {
  await ensureOrgExists(database, orgId);
  for (const row of rows) {
    const values = { orgId, ...row };
    await database.insert(factReleaseDaily).values(values).onConflictDoUpdate({
      target: [factReleaseDaily.orgId, factReleaseDaily.repoId, factReleaseDaily.day],
      set: values,
    });
  }
  return rows.length;
}
