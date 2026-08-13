import { desc, eq } from 'drizzle-orm';
import { db, ingestionRun, settings, VALUE_TRANSLATION_KNOBS_KEY } from '@ghcp-dash/db';
import type { SettingsResponse, KnobsBody, UpdateKnobsResponse } from '@ghcp-dash/contracts';
import { getKnobs, mergeWithDefaultKnobs, safeQuery } from './common';

const RECOMPUTE_NOT_STARTED_MESSAGE = 'Knobs were saved. Gold value rows were not recomputed by this web endpoint; run the collector gold rebuild to apply them.';

export async function querySettings(): Promise<SettingsResponse> { const knobs = await getKnobs(); return safeQuery({ knobs, lastIngestionRun: [], showRealLogins: process.env.SHOW_REAL_LOGINS === 'true' }, async () => { const runs = await db.select().from(ingestionRun).orderBy(desc(ingestionRun.startedAt)).limit(30); return { knobs, lastIngestionRun: runs.map(r => ({ runId: r.runId, source: r.source, targetDay: r.targetDay, status: r.status, completedAt: r.completedAt?.toISOString() ?? null })), showRealLogins: process.env.SHOW_REAL_LOGINS === 'true' }; }); }
export async function updateKnobs(body: KnobsBody): Promise<UpdateKnobsResponse> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured');
  }
  const updatedAt = new Date();
  const value = mergeWithDefaultKnobs(body) as unknown as Record<string, unknown>;
  await db.insert(settings).values({ key: VALUE_TRANSLATION_KNOBS_KEY, value, updatedAt }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt } });
  return { ok: true, savedAt: updatedAt.toISOString(), recompute: { status: 'not_started', message: RECOMPUTE_NOT_STARTED_MESSAGE } };
}
