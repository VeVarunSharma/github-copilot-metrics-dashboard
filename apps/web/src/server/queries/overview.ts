import { eq, and, gte, lte } from 'drizzle-orm';
import { db, factOrgDaily, factValueDaily, factRoiDaily, factBillingDaily, factAiCreditsDaily } from '@ghcp-dash/db';
import type { OverviewResponse } from '@ghcp-dash/contracts';
import type { DateRange } from '@/lib/date-range';
import { getKnobs, n, safeDiv, safeQuery, estimatorLabel } from './common';
import { computeUnitEconomics } from './unit-economics';

const defaultBlend = { activity: 0, output: 0, delivery: 1 };

function basisLabel(blend: { activity: number; output: number; delivery: number }): string {
  const active = (Object.entries(blend) as [string, number][]).filter(([, w]) => w > 0);
  if (active.length === 1 && active[0]) return estimatorLabel(active[0][0]);
  if (active.length === 0) return 'None';
  return 'Blended';
}

const empty = (currency = 'USD'): OverviewResponse => ({
  headlines: { hoursSavedMtd: 0, dollarsSavedMtd: 0, roiRatio: 0, netValue: 0, totalSpendMtd: 0, dollarPerMergedPr: null, basis: { label: basisLabel(defaultBlend), blend: defaultBlend }, currency },
  sub: { activeUsers: 0, acceptanceRate: 0, prsByCopilot: 0 },
  dailySaved: [],
  estimatorBreakdown: [],
  spendVsValue: [],
  weekOverWeekDeltas: { activeUsersDelta: 0, acceptanceRateDelta: 0, dollarsSavedDelta: 0, prsByCopilotDelta: 0 },
});

function ymd(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shiftDays(day: string, days: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return ymd(date);
}

function summarizeOrg(rows: (typeof factOrgDaily.$inferSelect)[]) {
  const sorted = [...rows].sort((a, b) => String(a.day).localeCompare(String(b.day)));
  const accepted = rows.reduce((s, r) => s + n(r.codeAcceptanceActivityCount), 0);
  const generated = rows.reduce((s, r) => s + n(r.codeGenerationActivityCount), 0);
  return {
    activeUsers: sorted.at(-1)?.monthlyActiveUsers ?? 0,
    acceptanceRate: safeDiv(accepted, generated),
    prsByCopilot: rows.reduce((s, r) => s + n(r.prTotalMergedCreatedByCopilot) + n(r.prTotalReviewedByCopilot), 0),
  };
}

export async function queryOverview(orgId: string, range: DateRange): Promise<OverviewResponse> {
  const knobs = await getKnobs();
  return safeQuery(empty(knobs.currency), async () => {
    const currentWeek = { from: shiftDays(range.to, -6), to: range.to };
    const priorWeek = { from: shiftDays(currentWeek.from, -7), to: shiftDays(currentWeek.from, -1) };
    const [orgRows, valueRows, roiRows, billingRows, aiRows, currentWeekOrgRows, priorWeekOrgRows, currentWeekRoiRows, priorWeekRoiRows] = await Promise.all([
      db.select().from(factOrgDaily).where(and(eq(factOrgDaily.orgId, orgId), gte(factOrgDaily.day, range.from), lte(factOrgDaily.day, range.to))),
      db.select().from(factValueDaily).where(and(eq(factValueDaily.orgId, orgId), gte(factValueDaily.day, range.from), lte(factValueDaily.day, range.to))),
      db.select().from(factRoiDaily).where(and(eq(factRoiDaily.orgId, orgId), gte(factRoiDaily.day, range.from), lte(factRoiDaily.day, range.to))),
      db.select().from(factBillingDaily).where(and(eq(factBillingDaily.orgId, orgId), gte(factBillingDaily.day, range.from), lte(factBillingDaily.day, range.to))),
      db.select().from(factAiCreditsDaily).where(and(eq(factAiCreditsDaily.orgId, orgId), gte(factAiCreditsDaily.day, range.from), lte(factAiCreditsDaily.day, range.to))),
      db.select().from(factOrgDaily).where(and(eq(factOrgDaily.orgId, orgId), gte(factOrgDaily.day, currentWeek.from), lte(factOrgDaily.day, currentWeek.to))),
      db.select().from(factOrgDaily).where(and(eq(factOrgDaily.orgId, orgId), gte(factOrgDaily.day, priorWeek.from), lte(factOrgDaily.day, priorWeek.to))),
      db.select().from(factRoiDaily).where(and(eq(factRoiDaily.orgId, orgId), gte(factRoiDaily.day, currentWeek.from), lte(factRoiDaily.day, currentWeek.to))),
      db.select().from(factRoiDaily).where(and(eq(factRoiDaily.orgId, orgId), gte(factRoiDaily.day, priorWeek.from), lte(factRoiDaily.day, priorWeek.to))),
    ]);

    const hoursSavedMtd = roiRows.reduce((s, r) => s + n(r.hoursSavedBlended), 0);
    const dollarsSavedMtd = roiRows.reduce((s, r) => s + n(r.dollarsSavedBlended), 0);
    const totalSpend = roiRows.reduce((s, r) => s + n(r.totalSpend), 0);
    const netValue = roiRows.reduce((s, r) => s + n(r.netValue), 0);
    const sub = summarizeOrg(orgRows);

    const days = new Map<string, { day: string; activity: number; output: number; delivery: number }>();
    for (const r of valueRows) {
      const day = String(r.day);
      const row = days.get(day) ?? { day, activity: 0, output: 0, delivery: 0 };
      row[r.estimator] = n(r.dollarsSaved);
      days.set(day, row);
    }

    const byEstimator = new Map<string, { estimator: string; hoursSaved: number; dollarsSaved: number }>();
    for (const r of valueRows) {
      const cur = byEstimator.get(r.estimator) ?? { estimator: r.estimator, hoursSaved: 0, dollarsSaved: 0 };
      cur.hoursSaved += n(r.hoursSaved);
      cur.dollarsSaved += n(r.dollarsSaved);
      byEstimator.set(r.estimator, cur);
    }

    const spendMap = new Map<string, { day: string; seatCost: number; premiumSpend: number; aiCreditSpend: number; dollarsSavedBlended: number }>();
    for (const r of billingRows) {
      const day = String(r.day);
      const row = spendMap.get(day) ?? { day, seatCost: 0, premiumSpend: 0, aiCreditSpend: 0, dollarsSavedBlended: 0 };
      if (/seat|business|enterprise/i.test(r.sku)) row.seatCost += n(r.netAmount);
      else row.premiumSpend += n(r.netAmount);
      spendMap.set(day, row);
    }
    for (const r of aiRows) {
      const day = String(r.day);
      const row = spendMap.get(day) ?? { day, seatCost: 0, premiumSpend: 0, aiCreditSpend: 0, dollarsSavedBlended: 0 };
      row.aiCreditSpend += n(r.billedAmount);
      spendMap.set(day, row);
    }
    for (const r of roiRows) {
      const day = String(r.day);
      const row = spendMap.get(day) ?? { day, seatCost: 0, premiumSpend: 0, aiCreditSpend: 0, dollarsSavedBlended: 0 };
      row.dollarsSavedBlended = n(r.dollarsSavedBlended);
      spendMap.set(day, row);
    }

    const current = summarizeOrg(currentWeekOrgRows);
    const prior = summarizeOrg(priorWeekOrgRows);
    const currentDollars = currentWeekRoiRows.reduce((s, r) => s + n(r.dollarsSavedBlended), 0);
    const priorDollars = priorWeekRoiRows.reduce((s, r) => s + n(r.dollarsSavedBlended), 0);

    const unitEconomics = computeUnitEconomics({ billing: billingRows, ai: aiRows, orgRows }, range, knobs.currency);
    const dollarPerMergedPr = unitEconomics.metrics.find((m) => m.metricKey === 'dollar-per-merged-pr')?.value ?? null;
    const blend = { activity: n(knobs.blend.activity), output: n(knobs.blend.output), delivery: n(knobs.blend.delivery) };

    return {
      headlines: {
        hoursSavedMtd,
        dollarsSavedMtd,
        roiRatio: safeDiv(netValue, totalSpend),
        netValue,
        totalSpendMtd: totalSpend,
        dollarPerMergedPr,
        basis: { label: basisLabel(blend), blend },
        currency: knobs.currency,
      },
      sub,
      dailySaved: [...days.values()].sort((a, b) => a.day.localeCompare(b.day)),
      estimatorBreakdown: [...byEstimator.values()],
      spendVsValue: [...spendMap.values()].sort((a, b) => a.day.localeCompare(b.day)),
      weekOverWeekDeltas: {
        activeUsersDelta: ((current.activeUsers - prior.activeUsers) / Math.max(prior.activeUsers, 1)),
        acceptanceRateDelta: current.acceptanceRate - prior.acceptanceRate,
        dollarsSavedDelta: currentDollars - priorDollars,
        prsByCopilotDelta: current.prsByCopilot - prior.prsByCopilot,
      },
    };
  });
}
