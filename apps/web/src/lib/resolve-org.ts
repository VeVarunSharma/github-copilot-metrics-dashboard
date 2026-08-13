import { desc } from 'drizzle-orm';
import { db, dimOrg } from '@ghcp-dash/db';

/**
 * Resolve the `orgId` query param against the actual orgs in the DB.
 *
 * If `requested` is a real org id, return it.
 * Otherwise, prefer the demo org if present; else return the most recently
 * active org; else null (caller should render an empty-state page).
 */
export async function resolveOrgId(requested?: string): Promise<string | null> {
  if (!process.env.DATABASE_URL) return requested ?? null;
  try {
    const rows = await db.select({ orgId: dimOrg.orgId }).from(dimOrg).orderBy(desc(dimOrg.lastSeenDay));
    const ids = rows.map((r) => r.orgId);
    if (requested && ids.includes(requested)) return requested;
    if (ids.includes('demo-org')) return 'demo-org';
    return ids[0] ?? null;
  } catch (error) {
    console.warn('resolveOrgId failed', error);
    return requested ?? null;
  }
}

/** Synchronous fallback when we already have the org list (avoids re-querying). */
export function pickDefaultOrg(orgs: ReadonlyArray<{ id: string }>, requested?: string): string | null {
  const ids = orgs.map((o) => o.id);
  if (requested && ids.includes(requested)) return requested;
  if (ids.includes('demo-org')) return 'demo-org';
  return ids[0] ?? null;
}
