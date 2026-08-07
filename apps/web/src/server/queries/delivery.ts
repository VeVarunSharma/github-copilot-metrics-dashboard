import { eq } from 'drizzle-orm';
import { db, dimRepo, factCommitDaily, factDoraDaily, factReleaseDaily } from '@ghcp-dash/db';
import type { DeliveryResponse } from '@ghcp-dash/contracts';
import type { DateRange } from '@/lib/date-range';
import { inRange, n, safeDiv, safeQuery } from './common';

const empty: DeliveryResponse = {
  headlines: {
    deploymentFrequency: null,
    leadTimeMin: null,
    changeFailureRate: null,
    mttrMin: null,
    commitsPerDay: 0,
  },
  trend: [],
  releases: [],
  leadTimeDistribution: [],
  perRepo: [],
};

function averageNullable(values: unknown[]) {
  const nums = values.filter((v) => v != null).map(n);
  return nums.length === 0 ? null : nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

function daysInclusive(range: DateRange) {
  const start = new Date(`${range.from}T00:00:00Z`);
  const end = new Date(`${range.to}T00:00:00Z`);
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1);
}

export async function queryDelivery(orgId: string, range: DateRange): Promise<DeliveryResponse> {
  return safeQuery(empty, async () => {
    const [doraRows, releaseRows, commitRows, repoRows] = await Promise.all([
      db.select().from(factDoraDaily).where(inRange(factDoraDaily, orgId, range)),
      db.select().from(factReleaseDaily).where(inRange(factReleaseDaily, orgId, range)),
      db.select().from(factCommitDaily).where(inRange(factCommitDaily, orgId, range)),
      db.select().from(dimRepo).where(eq(dimRepo.orgId, orgId)),
    ]);

    const commitsPerDay = safeDiv(
      commitRows.reduce((sum, row) => sum + n(row.commitCount), 0),
      daysInclusive(range),
    );

    const releasesByDay = new Map<string, number>();
    const releasesByRepo = new Map<string, number>();
    for (const row of releaseRows) {
      const day = String(row.day);
      const repoId = String(row.repoId);
      const releaseCount = n(row.releaseCount);
      releasesByDay.set(day, (releasesByDay.get(day) ?? 0) + releaseCount);
      releasesByRepo.set(repoId, (releasesByRepo.get(repoId) ?? 0) + releaseCount);
    }

    const repoNameById = new Map(repoRows.map((row) => [String(row.repoId), row.name]));

    return {
      headlines: {
        deploymentFrequency: averageNullable(doraRows.map((row) => row.deploymentFrequency)),
        leadTimeMin: averageNullable(doraRows.map((row) => row.leadTimeMin)),
        changeFailureRate: averageNullable(doraRows.map((row) => row.changeFailureRate)),
        mttrMin: averageNullable(doraRows.map((row) => row.mttrMin)),
        commitsPerDay,
      },
      trend: doraRows
        .map((row) => ({
          day: String(row.day),
          deploymentFrequency: row.deploymentFrequency == null ? null : n(row.deploymentFrequency),
          leadTimeMin: row.leadTimeMin == null ? null : n(row.leadTimeMin),
          changeFailureRate: row.changeFailureRate == null ? null : n(row.changeFailureRate),
          mttrMin: row.mttrMin == null ? null : n(row.mttrMin),
        }))
        .sort((a, b) => a.day.localeCompare(b.day)),
      releases: [...releasesByDay.entries()]
        .map(([day, count]) => ({ day, count }))
        .sort((a, b) => a.day.localeCompare(b.day)),
      leadTimeDistribution: doraRows
        .map((row) => ({
          day: String(row.day),
          p50: row.leadTimeMin == null ? null : n(row.leadTimeMin),
          p90: null,
        }))
        .sort((a, b) => a.day.localeCompare(b.day)),
      perRepo: [...releasesByRepo.entries()]
        .map(([repoId, count]) => ({
          repoId,
          repoName: repoNameById.get(repoId) ?? `repo-${repoId}`,
          deploymentFrequency: safeDiv(count, daysInclusive(range)),
          leadTimeMin: null,
        }))
        .sort((a, b) => b.deploymentFrequency - a.deploymentFrequency),
    };
  });
}
