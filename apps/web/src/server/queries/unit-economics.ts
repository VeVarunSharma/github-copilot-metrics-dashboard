import { and, eq, gte, lte } from 'drizzle-orm';
import { db, factBillingDaily, factAiCreditsDaily, factOrgDaily } from '@ghcp-dash/db';
import type { UnitEconomicsResponse, UnitEconomicMetric } from '@ghcp-dash/contracts';
import type { DateRange } from '@/lib/date-range';
import { getKnobs, n, safeDivOrNull, safeQuery } from './common';

type BillingRow = typeof factBillingDaily.$inferSelect;
type AiRow = typeof factAiCreditsDaily.$inferSelect;
type OrgRow = typeof factOrgDaily.$inferSelect;

export interface UnitEconRows {
  billing: BillingRow[];
  ai: AiRow[];
  orgRows: OrgRow[];
}

const SOURCE_TABLES = ['fact_billing_daily', 'fact_ai_credits_daily', 'fact_org_daily'];
const round2 = (x: number) => Math.round(x * 100) / 100;

type OverTimeKey = 'dollarPerMergedPr' | 'dollarPerActiveUser' | 'dollarPer1kLoc' | 'dollarPerCopilotPr';

/**
 * Authoritative unit-economics computation (spec 07). Pure over already-fetched rows so the
 * Cost and Overview views share one implementation and never recompute independently.
 * Every denominator is guarded: a zero/missing denominator yields `null`, never `$0`.
 */
export function computeUnitEconomics(rows: UnitEconRows, range: DateRange, currency: string): UnitEconomicsResponse {
  const { billing, ai, orgRows } = rows;

  const dailySpend = new Map<string, number>();
  for (const r of billing) {
    const day = String(r.day);
    dailySpend.set(day, (dailySpend.get(day) ?? 0) + n(r.netAmount));
  }
  for (const r of ai) {
    const day = String(r.day);
    dailySpend.set(day, (dailySpend.get(day) ?? 0) + n(r.billedAmount));
  }
  const totalSpend = [...dailySpend.values()].reduce((s, v) => s + v, 0);

  const sortedOrg = [...orgRows].sort((a, b) => String(a.day).localeCompare(String(b.day)));
  const mau = sortedOrg.at(-1)?.monthlyActiveUsers ?? 0;
  const mergedPrs = orgRows.reduce((s, r) => s + n(r.prTotalMerged), 0);
  const locAdded = orgRows.reduce((s, r) => s + n(r.locAddedSum), 0);
  const copilotPrs = orgRows.reduce((s, r) => s + n(r.prTotalMergedCreatedByCopilot), 0);

  const orgByDay = new Map(orgRows.map((r) => [String(r.day), r] as const));
  const days = [...new Set<string>([...dailySpend.keys(), ...orgRows.map((r) => String(r.day))])].sort();

  const overTime = days.map((day) => {
    const spend = dailySpend.get(day) ?? 0;
    const o = orgByDay.get(day);
    return {
      day,
      dollarPerMergedPr: safeDivOrNull(spend, n(o?.prTotalMerged)),
      dollarPerActiveUser: safeDivOrNull(spend, n(o?.monthlyActiveUsers)),
      dollarPer1kLoc: safeDivOrNull(spend * 1000, n(o?.locAddedSum)),
      dollarPerCopilotPr: safeDivOrNull(spend, n(o?.prTotalMergedCreatedByCopilot)),
    };
  });

  const seriesOf = (key: OverTimeKey) => overTime.map((r) => ({ day: r.day, value: r[key] }));
  const dateRange = { from: range.from, to: range.to };
  const base = { currency, dateRange, sourceTables: SOURCE_TABLES };

  const metrics: UnitEconomicMetric[] = [
    {
      ...base,
      metricKey: 'dollar-per-merged-pr',
      label: '$ / merged PR',
      value: safeDivOrNull(totalSpend, mergedPrs),
      numerator: round2(totalSpend),
      denominator: mergedPrs,
      formula: 'Total spend ÷ merged PRs in the selected period. Returns — when merged PRs is 0.',
      series: seriesOf('dollarPerMergedPr'),
    },
    {
      ...base,
      metricKey: 'dollar-per-active-user',
      label: '$ / active user',
      value: safeDivOrNull(totalSpend, mau),
      numerator: round2(totalSpend),
      denominator: mau,
      formula: 'Total spend ÷ latest monthly active users (MAU). Returns — when MAU is 0.',
      series: seriesOf('dollarPerActiveUser'),
    },
    {
      ...base,
      metricKey: 'dollar-per-1k-loc',
      label: '$ / 1k LoC delivered',
      value: safeDivOrNull(totalSpend * 1000, locAdded),
      numerator: round2(totalSpend * 1000),
      denominator: locAdded,
      formula: 'Total spend × 1,000 ÷ LoC added. LoC is directional output, not a value measure. Returns — when LoC is 0.',
      series: seriesOf('dollarPer1kLoc'),
    },
    {
      ...base,
      metricKey: 'dollar-per-copilot-pr',
      label: '$ / Copilot-authored PR',
      value: safeDivOrNull(totalSpend, copilotPrs),
      numerator: round2(totalSpend),
      denominator: copilotPrs,
      formula: 'Total spend ÷ Copilot-authored merged PRs. Returns — when there are no Copilot-authored merged PRs.',
      series: seriesOf('dollarPerCopilotPr'),
    },
    {
      ...base,
      metricKey: 'dollar-per-active-user-trend',
      label: '$ / active user trend',
      value: safeDivOrNull(totalSpend, mau),
      numerator: round2(totalSpend),
      denominator: mau,
      formula: 'Per-day spend ÷ per-day MAU, plotted across the selected window. Days with zero MAU are gaps, not zero.',
      series: seriesOf('dollarPerActiveUser'),
    },
  ];

  return { currency, metrics, overTime };
}

export async function queryUnitEconomics(orgId: string, range: DateRange): Promise<UnitEconomicsResponse> {
  const knobs = await getKnobs();
  const emptyRows: UnitEconRows = { billing: [], ai: [], orgRows: [] };
  return safeQuery(computeUnitEconomics(emptyRows, range, knobs.currency), async () => {
    const [billing, ai, orgRows] = await Promise.all([
      db.select().from(factBillingDaily).where(and(eq(factBillingDaily.orgId, orgId), gte(factBillingDaily.day, range.from), lte(factBillingDaily.day, range.to))),
      db.select().from(factAiCreditsDaily).where(and(eq(factAiCreditsDaily.orgId, orgId), gte(factAiCreditsDaily.day, range.from), lte(factAiCreditsDaily.day, range.to))),
      db.select().from(factOrgDaily).where(and(eq(factOrgDaily.orgId, orgId), gte(factOrgDaily.day, range.from), lte(factOrgDaily.day, range.to))),
    ]);
    return computeUnitEconomics({ billing, ai, orgRows }, range, knobs.currency);
  });
}
