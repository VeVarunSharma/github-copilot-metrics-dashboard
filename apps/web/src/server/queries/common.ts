import { and, eq, gte, lte, desc } from 'drizzle-orm';
import { db, dimOrg, settings, VALUE_TRANSLATION_KNOBS_KEY, type ValueEstimator } from '@ghcp-dash/db';
import type { OrgsResponse } from '@ghcp-dash/contracts';
import { DEFAULT_KNOBS, type ValueKnobs } from '@ghcp-dash/value';
import type { DateRange } from '@/lib/date-range';

export const n = (v: unknown): number => typeof v === 'bigint' ? Number(v) : typeof v === 'number' ? v : typeof v === 'string' ? Number(v) || 0 : 0;
export const safeDiv = (a: number, b: number) => b === 0 ? 0 : a / b;
export const safeDivOrNull = (a: number, b: number): number | null => b === 0 ? null : a / b;
export const inRange = <T extends { orgId: any; day: any }>(table: T, orgId: string, range: DateRange) => and(eq(table.orgId, orgId), gte(table.day, range.from), lte(table.day, range.to));
export async function safeQuery<T>(fallback: T, fn: () => Promise<T>): Promise<T> { try { if (!process.env.DATABASE_URL) return fallback; return await fn(); } catch (error) { console.warn('DB query failed, returning empty data', error); return fallback; } }
export function mergeWithDefaultKnobs(knobs: Partial<ValueKnobs> = {}): ValueKnobs { return { ...DEFAULT_KNOBS, ...knobs, blend: { ...DEFAULT_KNOBS.blend, ...(knobs.blend ?? {}) } }; }
export async function getKnobs(): Promise<ValueKnobs> { return safeQuery(DEFAULT_KNOBS, async () => { const rows = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, VALUE_TRANSLATION_KNOBS_KEY)).limit(1); return mergeWithDefaultKnobs(rows[0]?.value as Partial<ValueKnobs> | undefined); }); }
export async function getOrgs(): Promise<OrgsResponse> { return safeQuery({ orgs: [] }, async () => { const rows = await db.select().from(dimOrg).orderBy(desc(dimOrg.lastSeenDay)); return { orgs: rows.map((r) => ({ id: r.orgId, displayName: r.displayName ?? r.orgId, firstSeenDay: r.firstSeenDay, lastSeenDay: r.lastSeenDay })) }; }); }
export function estimatorLabel(estimator: ValueEstimator | string) { return estimator[0]?.toUpperCase() + estimator.slice(1); }
