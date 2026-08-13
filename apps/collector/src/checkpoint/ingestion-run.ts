import { randomUUID } from 'node:crypto';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { ingestionRun, type Database } from '@ghcp-dash/db';
import { createLogger, type Logger } from '../logger.js';

export type IngestionStatus = 'running' | 'success' | 'failed' | 'no_content' | 'partial';

let defaultLogger: Logger | undefined;

export interface ClaimedRun {
  runId: string;
  skipped: boolean;
  attempts: number;
}

export async function claimIngestionRun(database: Database, source: string, orgId: string, targetDay: string | null, dryRun = false): Promise<ClaimedRun> {
  if (dryRun) return { runId: randomUUID(), skipped: false, attempts: 1 };
  const dayCondition = targetDay === null ? isNull(ingestionRun.targetDay) : eq(ingestionRun.targetDay, targetDay);
  const existing: Array<{ status: string; runId: string; attempts: number }> = await database
    .select()
    .from(ingestionRun)
    .where(and(eq(ingestionRun.source, source), eq(ingestionRun.orgId, orgId), dayCondition))
    .orderBy(desc(ingestionRun.startedAt));

  if (existing.some((run) => run.status === 'success')) {
    return { runId: existing[0]?.runId ?? randomUUID(), skipped: true, attempts: existing[0]?.attempts ?? 1 };
  }

  const attempts = (existing[0]?.attempts ?? 0) + 1;
  const runId = randomUUID();
  await database.insert(ingestionRun).values({
    runId,
    source,
    orgId,
    targetDay,
    startedAt: new Date(),
    completedAt: null,
    status: 'running',
    rowsWritten: 0,
    bronzePath: null,
    errorMessage: null,
    attempts,
  });
  return { runId, skipped: false, attempts };
}

export async function finalizeIngestionRun(
  database: Database,
  runId: string,
  status: Exclude<IngestionStatus, 'running'>,
  rowsWritten: number,
  bronzePath?: string,
  dryRun = false,
  logger?: Logger,
): Promise<void> {
  if (dryRun) return;
  const completedAt = new Date();
  const rows = await database
    .update(ingestionRun)
    .set({ status, rowsWritten, bronzePath, completedAt, errorMessage: null })
    .where(eq(ingestionRun.runId, runId))
    .returning({
      status: ingestionRun.status,
      source: ingestionRun.source,
      orgId: ingestionRun.orgId,
      targetDay: ingestionRun.targetDay,
      rowsWritten: ingestionRun.rowsWritten,
      startedAt: ingestionRun.startedAt,
      completedAt: ingestionRun.completedAt,
      attempts: ingestionRun.attempts,
    });
  emitIngestionRunFinalized(logger ?? getDefaultLogger(), rows[0]);
}

export async function failIngestionRun(database: Database, runId: string, error: unknown, dryRun = false, logger?: Logger): Promise<void> {
  if (dryRun) return;
  const message = error instanceof Error ? error.message : String(error);
  const completedAt = new Date();
  const rows = await database
    .update(ingestionRun)
    .set({ status: 'failed', completedAt, errorMessage: message })
    .where(eq(ingestionRun.runId, runId))
    .returning({
      status: ingestionRun.status,
      source: ingestionRun.source,
      orgId: ingestionRun.orgId,
      targetDay: ingestionRun.targetDay,
      rowsWritten: ingestionRun.rowsWritten,
      startedAt: ingestionRun.startedAt,
      completedAt: ingestionRun.completedAt,
      attempts: ingestionRun.attempts,
    });
  emitIngestionRunFinalized(logger ?? getDefaultLogger(), rows[0]);
}

function getDefaultLogger(): Logger {
  defaultLogger ??= createLogger();
  return defaultLogger;
}

function emitIngestionRunFinalized(
  logger: Logger,
  run:
    | {
        status: string;
        source: string;
        orgId: string | null;
        targetDay: string | null;
        rowsWritten: number;
        startedAt: Date;
        completedAt: Date | null;
        attempts: number;
      }
    | undefined,
): void {
  if (!run) return;
  const completedAt = run.completedAt ?? new Date();
  logger.info(
    {
      event: 'ingestion_run_finalized',
      status: run.status,
      source: run.source,
      orgId: run.orgId ?? '',
      targetDay: run.targetDay,
      rowsWritten: run.rowsWritten,
      durationMs: Math.max(0, completedAt.getTime() - run.startedAt.getTime()),
      attempts: run.attempts,
    },
    'ingestion run finalized',
  );
}
