import { and, eq, gte, lte } from 'drizzle-orm';
import { db, factOrgDaily } from '@ghcp-dash/db';
import type { PrResponse } from '@ghcp-dash/contracts';
import type { DateRange } from '@/lib/date-range';
import { n, safeDiv, safeQuery } from './common';

const emptyHeadlines = { totalCreated: 0, pctByCopilot: 0, totalMerged: 0, pctMergedByCopilot: 0, pctReviewedByCopilot: 0 };
const empty: PrResponse = {
  headlines: emptyHeadlines,
  priorPeriodHeadlines: emptyHeadlines,
  dailyMerged: [],
  timeToMerge: [],
  suggestions: { totalSuggestions: 0, copilotSuggestions: 0, appliedSuggestions: 0, copilotAppliedSuggestions: 0 },
  authoredVsReviewedOverlap: { authoredOnly: 0, reviewedOnly: 0, both: 0 },
};

function ymd(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shiftDays(day: string, days: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return ymd(date);
}

function daysInclusive(range: DateRange) {
  const start = new Date(`${range.from}T00:00:00Z`);
  const end = new Date(`${range.to}T00:00:00Z`);
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1);
}

function summarizeHeadlines(rows: (typeof factOrgDaily.$inferSelect)[]) {
  const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((s, r) => s + f(r), 0);
  const totalCreated = sum((r) => n(r.prTotalCreated));
  const createdBy = sum((r) => n(r.prTotalCreatedByCopilot));
  const totalMerged = sum((r) => n(r.prTotalMerged));
  const mergedBy = sum((r) => n(r.prTotalMergedCreatedByCopilot));
  const reviewed = sum((r) => n(r.prTotalReviewed));
  const reviewedBy = sum((r) => n(r.prTotalReviewedByCopilot));
  return {
    totalCreated,
    pctByCopilot: safeDiv(createdBy, totalCreated),
    totalMerged,
    pctMergedByCopilot: safeDiv(mergedBy, totalMerged),
    pctReviewedByCopilot: safeDiv(reviewedBy, reviewed),
  };
}

export async function queryPullRequests(orgId: string, range: DateRange): Promise<PrResponse> {
  return safeQuery(empty, async () => {
    const priorTo = shiftDays(range.from, -1);
    const priorFrom = shiftDays(priorTo, -(daysInclusive(range) - 1));
    const [rows, priorRows] = await Promise.all([
      db.select().from(factOrgDaily).where(and(eq(factOrgDaily.orgId, orgId), gte(factOrgDaily.day, range.from), lte(factOrgDaily.day, range.to))),
      db.select().from(factOrgDaily).where(and(eq(factOrgDaily.orgId, orgId), gte(factOrgDaily.day, priorFrom), lte(factOrgDaily.day, priorTo))),
    ]);
    const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((s, r) => s + f(r), 0);
    const totalMerged = sum((r) => n(r.prTotalMerged));
    const mergedBy = sum((r) => n(r.prTotalMergedCreatedByCopilot));
    const reviewedBy = sum((r) => n(r.prTotalReviewedByCopilot));
    const both = Math.min(mergedBy, reviewedBy);

    return {
      headlines: summarizeHeadlines(rows),
      priorPeriodHeadlines: summarizeHeadlines(priorRows),
      dailyMerged: rows.map((r) => ({
        day: String(r.day),
        copilotAuthored: n(r.prTotalMergedCreatedByCopilot),
        copilotReviewed: n(r.prTotalReviewedByCopilot),
        neither: Math.max(0, n(r.prTotalMerged) - n(r.prTotalMergedCreatedByCopilot) - n(r.prTotalReviewedByCopilot)),
      })),
      timeToMerge: rows.map((r) => ({
        day: String(r.day),
        allMedian: r.prMedianMinutesToMerge == null ? null : n(r.prMedianMinutesToMerge),
        copilotAuthoredMedian: r.prMedianMinutesToMergeCopilotAuthored == null ? null : n(r.prMedianMinutesToMergeCopilotAuthored),
      })),
      suggestions: {
        totalSuggestions: sum((r) => n(r.prTotalSuggestions)),
        copilotSuggestions: sum((r) => n(r.prTotalCopilotSuggestions)),
        appliedSuggestions: sum((r) => n(r.prTotalAppliedSuggestions)),
        copilotAppliedSuggestions: sum((r) => n(r.prTotalCopilotAppliedSuggestions)),
      },
      authoredVsReviewedOverlap: { authoredOnly: Math.max(0, mergedBy - both), reviewedOnly: Math.max(0, reviewedBy - both), both },
    };
  });
}
