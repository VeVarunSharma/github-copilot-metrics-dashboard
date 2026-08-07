import { describe, expect, it } from 'vitest';
import { computeUnitEconomics, type UnitEconRows } from '../server/queries/unit-economics';

const range = { from: '2025-10-01', to: '2025-10-02' };

function rows(partial: Partial<UnitEconRows>): UnitEconRows {
  return { billing: [], ai: [], orgRows: [], ...partial } as unknown as UnitEconRows;
}

function metric(res: ReturnType<typeof computeUnitEconomics>, key: string) {
  const m = res.metrics.find((x) => x.metricKey === key);
  if (!m) throw new Error(`metric ${key} not found`);
  return m;
}

describe('computeUnitEconomics', () => {
  it('returns null (never 0) for every unit cost when denominators are zero', () => {
    const res = computeUnitEconomics(
      rows({
        billing: [{ day: '2025-10-01', sku: 'seat', netAmount: 100 }] as never,
        orgRows: [{ day: '2025-10-01', monthlyActiveUsers: 0, prTotalMerged: 0, locAddedSum: 0, prTotalMergedCreatedByCopilot: 0 }] as never,
      }),
      range,
      'USD',
    );
    for (const key of ['dollar-per-merged-pr', 'dollar-per-active-user', 'dollar-per-1k-loc', 'dollar-per-copilot-pr', 'dollar-per-active-user-trend']) {
      expect(metric(res, key).value).toBeNull();
    }
  });

  it('computes positive, non-negative unit costs from positive inputs', () => {
    const res = computeUnitEconomics(
      rows({
        billing: [{ day: '2025-10-01', sku: 'seat', netAmount: 80 }] as never,
        ai: [{ day: '2025-10-01', billedAmount: 20, model: 'gpt', includedQuantity: 0, billedQuantity: 0 }] as never,
        orgRows: [{ day: '2025-10-01', monthlyActiveUsers: 10, prTotalMerged: 4, locAddedSum: 2000, prTotalMergedCreatedByCopilot: 2 }] as never,
      }),
      range,
      'USD',
    );
    // total spend = 100
    expect(metric(res, 'dollar-per-merged-pr').value).toBe(25); // 100 / 4
    expect(metric(res, 'dollar-per-active-user').value).toBe(10); // 100 / 10
    expect(metric(res, 'dollar-per-1k-loc').value).toBe(50); // 100*1000 / 2000
    expect(metric(res, 'dollar-per-copilot-pr').value).toBe(50); // 100 / 2
    for (const m of res.metrics) {
      if (m.value !== null) expect(m.value).toBeGreaterThanOrEqual(0);
    }
  });

  it('emits null daily points as gaps rather than zero dips', () => {
    const res = computeUnitEconomics(
      rows({
        billing: [
          { day: '2025-10-01', sku: 'seat', netAmount: 50 },
          { day: '2025-10-02', sku: 'seat', netAmount: 50 },
        ] as never,
        orgRows: [
          { day: '2025-10-01', monthlyActiveUsers: 5, prTotalMerged: 0, locAddedSum: 0, prTotalMergedCreatedByCopilot: 0 },
          { day: '2025-10-02', monthlyActiveUsers: 5, prTotalMerged: 5, locAddedSum: 0, prTotalMergedCreatedByCopilot: 0 },
        ] as never,
      }),
      range,
      'USD',
    );
    const series = res.overTime;
    expect(series).toHaveLength(2);
    expect(series[0]?.dollarPerMergedPr).toBeNull(); // 0 merged PRs that day
    expect(series[1]?.dollarPerMergedPr).toBe(10); // 50 / 5
  });

  it('carries currency and source-table lineage on every metric', () => {
    const res = computeUnitEconomics(rows({}), range, 'EUR');
    expect(res.currency).toBe('EUR');
    for (const m of res.metrics) {
      expect(m.currency).toBe('EUR');
      expect(m.sourceTables).toContain('fact_billing_daily');
      expect(m.dateRange).toEqual(range);
    }
  });
});
