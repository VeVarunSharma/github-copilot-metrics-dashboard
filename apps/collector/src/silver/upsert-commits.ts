import { factCommitDaily, type Database } from '@ghcp-dash/db';
import { ensureOrgExists } from './common.js';

export interface CommitDailyAggregate {
  repoId: bigint;
  authorUserId: bigint;
  day: string;
  commitCount: number;
  additionsSum: bigint;
  deletionsSum: bigint;
}

export async function upsertCommits(database: Database, orgId: string, rows: readonly CommitDailyAggregate[]): Promise<number> {
  await ensureOrgExists(database, orgId);
  for (const row of rows) {
    const values = { orgId, ...row };
    await database.insert(factCommitDaily).values(values).onConflictDoUpdate({
      target: [factCommitDaily.orgId, factCommitDaily.repoId, factCommitDaily.authorUserId, factCommitDaily.day],
      set: values,
    });
  }
  return rows.length;
}
