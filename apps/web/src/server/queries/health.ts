import { and, desc, eq, isNotNull } from 'drizzle-orm';
import { pingDb, db, ingestionRun } from '@ghcp-dash/db';
import type { HealthResponse } from '@ghcp-dash/contracts';

const STALE_AFTER_HOURS = 26;
const STALE_AFTER_MS = STALE_AFTER_HOURS * 60 * 60 * 1000;

type IngestionFreshness = Pick<
  HealthResponse,
  | 'lastSuccessfulIngestionCompletedAt'
  | 'lastSuccessfulIngestionTargetDay'
  | 'staleDataStatus'
  | 'staleDataWarning'
  | 'staleAfterHours'
>;

const unknownFreshness = (warning: string | null): IngestionFreshness => ({
  lastSuccessfulIngestionCompletedAt: null,
  lastSuccessfulIngestionTargetDay: null,
  staleDataStatus: 'unknown',
  staleDataWarning: warning,
  staleAfterHours: STALE_AFTER_HOURS,
});

async function queryIngestionFreshness(): Promise<IngestionFreshness> {
  try {
    const rows = await db
      .select({
        completedAt: ingestionRun.completedAt,
        targetDay: ingestionRun.targetDay,
      })
      .from(ingestionRun)
      .where(and(eq(ingestionRun.status, 'success'), isNotNull(ingestionRun.completedAt)))
      .orderBy(desc(ingestionRun.completedAt))
      .limit(1);

    const latest = rows[0];
    if (!latest?.completedAt) {
      return unknownFreshness('No successful ingestion runs have been recorded yet.');
    }

    const completedAt = latest.completedAt;
    const stale = Date.now() - completedAt.getTime() > STALE_AFTER_MS;

    return {
      lastSuccessfulIngestionCompletedAt: completedAt.toISOString(),
      lastSuccessfulIngestionTargetDay: latest.targetDay,
      staleDataStatus: stale ? 'stale' : 'fresh',
      staleDataWarning: stale
        ? `Last successful ingestion completed more than ${STALE_AFTER_HOURS} hours ago.`
        : null,
      staleAfterHours: STALE_AFTER_HOURS,
    };
  } catch (error) {
    console.warn('Ingestion freshness query failed', error);
    return unknownFreshness('Unable to read ingestion freshness from the database.');
  }
}

export async function queryHealth(): Promise<HealthResponse> {
  const dbStatus = process.env.DATABASE_URL ? await pingDb(db) : undefined;
  const dbCheck = dbStatus === undefined ? 'unconfigured' : dbStatus ? 'ok' : 'error';
  const readiness = dbCheck === 'ok' ? 'ok' : 'degraded';
  const freshness = dbCheck === 'ok'
    ? await queryIngestionFreshness()
    : unknownFreshness(null);

  return {
    status: readiness,
    schemaVersion: 1,
    liveness: 'ok',
    readiness,
    checks: { db: dbCheck },
    ...freshness,
  };
}
