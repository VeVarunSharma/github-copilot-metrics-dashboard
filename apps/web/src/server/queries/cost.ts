import { and, eq, gte, lte } from 'drizzle-orm';
import { db, factBillingDaily, factAiCreditsDaily, factOrgDaily } from '@ghcp-dash/db';
import type { CostResponse } from '@ghcp-dash/contracts';
import { classifyCopilotBillingSku } from '@ghcp-dash/value';
import type { DateRange } from '@/lib/date-range';
import { getKnobs, n, safeDiv, safeDivOrNull, safeQuery } from './common';

type SpendDay = { day: string; seat: number; premium: number; aiCredits: number; anomaly?: boolean };

const empty = (currency = 'USD'): CostResponse => ({
  headlines: {
    totalSpendMtd: 0,
    seatCostMtd: 0,
    premiumSpendMtd: 0,
    aiCreditSpendMtd: 0,
    dollarPerActiveUser: null,
    currency,
  },
  dailyStacked: [],
  byModel: [],
  costPerChatRequest: [],
  includedBurndown: [],
  forecast: [],
});

function ymd(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shiftDays(day: string, days: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return ymd(date);
}

export async function queryCost(orgId: string, range: DateRange): Promise<CostResponse> {
  const knobs = await getKnobs();
  return safeQuery(empty(knobs.currency), async () => {
    const anomalyRange = { from: shiftDays(range.to, -27), to: range.to };
    const [billing, ai, orgRows, anomalyBilling, anomalyAi] = await Promise.all([
      db.select().from(factBillingDaily).where(and(eq(factBillingDaily.orgId, orgId), gte(factBillingDaily.day, range.from), lte(factBillingDaily.day, range.to))),
      db.select().from(factAiCreditsDaily).where(and(eq(factAiCreditsDaily.orgId, orgId), gte(factAiCreditsDaily.day, range.from), lte(factAiCreditsDaily.day, range.to))),
      db.select().from(factOrgDaily).where(and(eq(factOrgDaily.orgId, orgId), gte(factOrgDaily.day, range.from), lte(factOrgDaily.day, range.to))),
      db.select().from(factBillingDaily).where(and(eq(factBillingDaily.orgId, orgId), gte(factBillingDaily.day, anomalyRange.from), lte(factBillingDaily.day, anomalyRange.to))),
      db.select().from(factAiCreditsDaily).where(and(eq(factAiCreditsDaily.orgId, orgId), gte(factAiCreditsDaily.day, anomalyRange.from), lte(factAiCreditsDaily.day, anomalyRange.to))),
    ]);

    let seatCostMtd = 0;
    let premiumSpendMtd = 0;
    let aiCreditSpendMtd = 0;
    const daily = new Map<string, SpendDay>();
    for (const r of billing) {
      const day = String(r.day);
      const row = daily.get(day) ?? { day, seat: 0, premium: 0, aiCredits: 0 };
      if (classifyCopilotBillingSku(r.sku) === 'seat') {
        row.seat += n(r.netAmount);
        seatCostMtd += n(r.netAmount);
      } else {
        row.premium += n(r.netAmount);
        premiumSpendMtd += n(r.netAmount);
      }
      daily.set(day, row);
    }

    const byModelMap = new Map<string, number>();
    const burn = new Map<string, { day: string; included: number; billed: number }>();
    for (const r of ai) {
      const day = String(r.day);
      const row = daily.get(day) ?? { day, seat: 0, premium: 0, aiCredits: 0 };
      row.aiCredits += n(r.billedAmount);
      daily.set(day, row);
      aiCreditSpendMtd += n(r.billedAmount);
      byModelMap.set(r.model, (byModelMap.get(r.model) ?? 0) + n(r.billedAmount));
      const b = burn.get(day) ?? { day, included: 0, billed: 0 };
      b.included += n(r.includedQuantity);
      b.billed += n(r.billedQuantity);
      burn.set(day, b);
    }

    const anomalyTotals = new Map<string, number>();
    for (const r of anomalyBilling) {
      const day = String(r.day);
      anomalyTotals.set(day, (anomalyTotals.get(day) ?? 0) + n(r.netAmount));
    }
    for (const r of anomalyAi) {
      const day = String(r.day);
      anomalyTotals.set(day, (anomalyTotals.get(day) ?? 0) + n(r.billedAmount));
    }
    const trailingTotals = [...anomalyTotals.values()];
    const mean = trailingTotals.length ? trailingTotals.reduce((s, v) => s + v, 0) / trailingTotals.length : 0;
    const variance = trailingTotals.length ? trailingTotals.reduce((s, v) => s + (v - mean) ** 2, 0) / trailingTotals.length : 0;
    const anomalyThreshold = mean + 2 * Math.sqrt(variance);

    const totalSpendMtd = seatCostMtd + premiumSpendMtd + aiCreditSpendMtd;
    const latestOrgRow = [...orgRows].sort((a, b) => String(a.day).localeCompare(String(b.day))).at(-1);
    const active = latestOrgRow?.monthlyActiveUsers ?? 0;
    const chatByDay = new Map(orgRows.map((r) => [String(r.day), r.userInitiatedInteractionCount] as const));
    const stacked = [...daily.values()]
      .map((row) => {
        const total = row.seat + row.premium + row.aiCredits;
        return { ...row, anomaly: trailingTotals.length > 0 && total > anomalyThreshold };
      })
      .sort((a, b) => a.day.localeCompare(b.day));
    const avg = stacked.length ? totalSpendMtd / stacked.length : 0;

    return {
      headlines: {
        totalSpendMtd,
        seatCostMtd,
        premiumSpendMtd,
        aiCreditSpendMtd,
        dollarPerActiveUser: safeDivOrNull(totalSpendMtd, active),
        currency: knobs.currency,
      },
      dailyStacked: stacked,
      byModel: [...byModelMap].map(([model, amount]) => ({ model, amount })),
      costPerChatRequest: stacked.map((r) => ({ day: r.day, costPerRequest: safeDiv(r.aiCredits, chatByDay.get(r.day) ?? 0) })),
      includedBurndown: [...burn.values()].sort((a, b) => a.day.localeCompare(b.day)),
      forecast: stacked.map((r, i) => ({ day: r.day, projected: avg * (i + 1) })),
    };
  });
}
