import { factWorkflowRunDaily, type Database } from '@ghcp-dash/db';
import { ensureOrgExists } from './common.js';

export interface WorkflowRunDailyAggregate {
  repoId: bigint;
  workflowId: bigint;
  day: string;
  successCount: number;
  failureCount: number;
  cancelledCount: number;
  medianDurationSec: string;
  p90DurationSec: string;
}

export async function upsertWorkflowRuns(database: Database, orgId: string, rows: readonly WorkflowRunDailyAggregate[]): Promise<number> {
  await ensureOrgExists(database, orgId);
  for (const row of rows) {
    const values = { orgId, ...row };
    await database.insert(factWorkflowRunDaily).values(values).onConflictDoUpdate({
      target: [factWorkflowRunDaily.orgId, factWorkflowRunDaily.repoId, factWorkflowRunDaily.workflowId, factWorkflowRunDaily.day],
      set: values,
    });
  }
  return rows.length;
}
