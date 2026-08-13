import { db, factCiDaily, factWorkflowRunDaily } from '@ghcp-dash/db';
import type { EngineeringHealthResponse } from '@ghcp-dash/contracts';
import type { DateRange } from '@/lib/date-range';
import { inRange, n, safeDiv, safeQuery } from './common';

const empty: EngineeringHealthResponse = {
  headlines: {
    ciSuccessRate: null,
    medianTimeToGreenSec: null,
    prReworkRate: null,
    dependabotOpen: null,
    testStability: null,
  },
  ciSuccessTrend: [],
  failureBreakdown: [],
  flakyTests: [],
  prReviewDepth: [],
};

function averageNullable(values: unknown[]) {
  const nums = values.filter((v) => v != null).map(n);
  return nums.length === 0 ? null : nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

export async function queryEngineeringHealth(orgId: string, range: DateRange): Promise<EngineeringHealthResponse> {
  return safeQuery(empty, async () => {
    const [ciRows, workflowRows] = await Promise.all([
      db.select().from(factCiDaily).where(inRange(factCiDaily, orgId, range)),
      db.select().from(factWorkflowRunDaily).where(inRange(factWorkflowRunDaily, orgId, range)),
    ]);

    const failureByWorkflow = new Map<string, number>();
    const flakyProxyByWorkflow = new Map<string, { failures: number; total: number }>();
    for (const row of workflowRows) {
      const workflowName = `Workflow ${String(row.workflowId)}`;
      const failures = n(row.failureCount);
      const total = failures + n(row.successCount) + n(row.cancelledCount);
      failureByWorkflow.set(workflowName, (failureByWorkflow.get(workflowName) ?? 0) + failures);
      const current = flakyProxyByWorkflow.get(workflowName) ?? { failures: 0, total: 0 };
      current.failures += failures;
      current.total += total;
      flakyProxyByWorkflow.set(workflowName, current);
    }

    const flakyTestRate = averageNullable(ciRows.map((row) => row.flakyTestRate));

    return {
      headlines: {
        ciSuccessRate: averageNullable(ciRows.map((row) => row.ciSuccessRate)),
        medianTimeToGreenSec: averageNullable(ciRows.map((row) => row.medianTimeToGreenSec)),
        prReworkRate: null,
        dependabotOpen: null,
        testStability: flakyTestRate == null ? null : 1 - flakyTestRate,
      },
      ciSuccessTrend: ciRows
        .map((row) => ({ day: String(row.day), rate: row.ciSuccessRate == null ? null : n(row.ciSuccessRate) }))
        .sort((a, b) => a.day.localeCompare(b.day)),
      failureBreakdown: [...failureByWorkflow.entries()]
        .map(([workflowName, failureCount]) => ({ workflowName, failureCount }))
        .filter((row) => row.failureCount > 0)
        .sort((a, b) => b.failureCount - a.failureCount),
      flakyTests: [...flakyProxyByWorkflow.entries()]
        .map(([workflowName, value]) => ({ workflowName, rate: safeDiv(value.failures, value.total) }))
        .filter((row) => row.rate > 0)
        .sort((a, b) => b.rate - a.rate)
        .slice(0, 10),
      prReviewDepth: [],
    };
  });
}
