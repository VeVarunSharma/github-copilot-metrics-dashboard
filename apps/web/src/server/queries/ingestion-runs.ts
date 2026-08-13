import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { db, ingestionRun } from '@ghcp-dash/db';
import type { IngestionRunsResponse } from '@ghcp-dash/contracts';
import type { DateRange } from '@/lib/date-range';
import { safeQuery } from './common';
export async function queryIngestionRuns(orgId: string, range: DateRange, limit = 30): Promise<IngestionRunsResponse> { return safeQuery({ runs: [] }, async () => { const rows = await db.select().from(ingestionRun).where(and(eq(ingestionRun.orgId, orgId), gte(ingestionRun.targetDay, range.from), lte(ingestionRun.targetDay, range.to))).orderBy(desc(ingestionRun.startedAt)).limit(limit); return { runs: rows.map(r => ({ runId: r.runId, source: r.source, targetDay: r.targetDay, status: r.status, completedAt: r.completedAt?.toISOString() ?? null, bronzePath: r.bronzePath, errorMessage: r.errorMessage, attempts: r.attempts, rowsWritten: r.rowsWritten, startedAt: r.startedAt.toISOString() })) }; }); }
