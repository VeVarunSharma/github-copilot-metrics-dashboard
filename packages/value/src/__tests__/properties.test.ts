import { describe, expect, it } from 'vitest';
import { DEFAULT_KNOBS, activityEstimator, allEstimators, blend, computeDailyValue } from '../index.js';
import type { OrgDailyInputs } from '../index.js';

const baseInputs: OrgDailyInputs = {
  orgId: 'octo-org',
  day: '2026-06-19',
  acceptedCompletions: 0,
  chatRequests: 8,
  agentSessions: 1,
  locAddedByCopilot: 240,
  prMergedByCopilot: 2,
  prReviewedByCopilot: 4,
};

describe('properties', () => {
  it('activity accepted completions component is monotonic and linear when doubled', () => {
    for (let acceptedCompletions = 4; acceptedCompletions <= 80; acceptedCompletions += 4) {
      const single = activityEstimator(
        { ...baseInputs, chatRequests: 0, agentSessions: 0, acceptedCompletions },
        DEFAULT_KNOBS,
      );
      const doubled = activityEstimator(
        { ...baseInputs, chatRequests: 0, agentSessions: 0, acceptedCompletions: acceptedCompletions * 2 },
        DEFAULT_KNOBS,
      );

      expect(doubled.hoursSaved).toBe(single.hoursSaved * 2);
    }
  });

  it('doubling avgLoadedEngCostPerHour doubles dollars saved across all estimators', () => {
    for (let cost = 10; cost <= 100; cost += 10) {
      const lowCost = { ...DEFAULT_KNOBS, avgLoadedEngCostPerHour: cost };
      const highCost = { ...DEFAULT_KNOBS, avgLoadedEngCostPerHour: cost * 2 };
      const low = allEstimators(baseInputs, lowCost);
      const high = allEstimators(baseInputs, highCost);

      // Use toBeCloseTo because each estimator rounds to 2dp at the end —
      // doubling rounded(x) is only equal to rounded(2x) within ±0.01.
      expect(high.activity.dollarsSaved).toBeCloseTo(low.activity.dollarsSaved * 2, 1);
      expect(high.output.dollarsSaved).toBeCloseTo(low.output.dollarsSaved * 2, 1);
      expect(high.delivery.dollarsSaved).toBeCloseTo(low.delivery.dollarsSaved * 2, 1);
    }
  });

  it('blend is a convex combination bounded by the min and max estimator hours', () => {
    const estimators = allEstimators(baseInputs, DEFAULT_KNOBS);
    const weights = [
      { activity: 0.25, output: 0.25, delivery: 0.5 },
      { activity: 0.2, output: 0.7, delivery: 0.1 },
      { activity: 0.6, output: 0.1, delivery: 0.3 },
    ];

    for (const blendWeights of weights) {
      const result = blend(estimators, { ...DEFAULT_KNOBS, blend: blendWeights });
      const hours = [estimators.activity.hoursSaved, estimators.output.hoursSaved, estimators.delivery.hoursSaved];

      expect(result.hoursSaved).toBeGreaterThanOrEqual(Math.min(...hours));
      expect(result.hoursSaved).toBeLessThanOrEqual(Math.max(...hours));
    }
  });

  it('is deterministic for repeated full daily computations', () => {
    const spend = { seatCost: 10, premiumRequestSpend: 2.5, aiCreditSpend: 1.25 };
    const knobs = { ...DEFAULT_KNOBS, blend: { activity: 0.5, output: 0, delivery: 0.5 } };

    const first = computeDailyValue(baseInputs, spend, knobs);

    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect(computeDailyValue(baseInputs, spend, knobs)).toEqual(first);
    }
  });
});
