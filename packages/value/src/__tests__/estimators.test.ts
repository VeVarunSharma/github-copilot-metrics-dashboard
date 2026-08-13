import { describe, expect, it } from 'vitest';
import {
  DEFAULT_KNOBS,
  activityEstimator,
  allEstimators,
  computeDailyValue,
  deliveryEstimator,
  outputEstimator,
} from '../index.js';
import type { OrgDailyInputs, SpendDailyInputs } from '../index.js';

const zeroInputs: OrgDailyInputs = {
  orgId: 'octo-org',
  day: '2026-06-19',
  acceptedCompletions: 0,
  chatRequests: 0,
  agentSessions: 0,
  locAddedByCopilot: 0,
  prMergedByCopilot: 0,
  prReviewedByCopilot: 0,
};

const zeroSpend: SpendDailyInputs = {
  seatCost: 0,
  premiumRequestSpend: 0,
  aiCreditSpend: 0,
};

describe('estimators', () => {
  it('returns zero values for every estimator and ROI with DEFAULT_KNOBS and zero inputs', () => {
    expect(allEstimators(zeroInputs, DEFAULT_KNOBS)).toEqual({
      activity: { estimator: 'activity', hoursSaved: 0, dollarsSaved: 0 },
      output: { estimator: 'output', hoursSaved: 0, dollarsSaved: 0 },
      delivery: { estimator: 'delivery', hoursSaved: 0, dollarsSaved: 0 },
    });

    expect(computeDailyValue(zeroInputs, zeroSpend, DEFAULT_KNOBS).roi).toEqual({
      hoursSavedBlended: 0,
      dollarsSavedBlended: 0,
      totalSpend: 0,
      netValue: 0,
      roiRatio: 0,
    });
  });

  it('computes activity estimator hours and dollars from accepted completions, chat, and agent sessions', () => {
    const inputs: OrgDailyInputs = {
      ...zeroInputs,
      acceptedCompletions: 80,
      chatRequests: 15,
      agentSessions: 2,
    };

    expect(activityEstimator(inputs, DEFAULT_KNOBS)).toEqual({
      estimator: 'activity',
      hoursSaved: 2.5,
      dollarsSaved: 250,
    });
  });

  it('computes output estimator hours and dollars from Copilot LoC and baseline LoC/hour', () => {
    const inputs: OrgDailyInputs = {
      ...zeroInputs,
      locAddedByCopilot: 450,
    };

    expect(outputEstimator(inputs, DEFAULT_KNOBS)).toEqual({
      estimator: 'output',
      hoursSaved: 15,
      dollarsSaved: 1500,
    });
  });

  it('computes delivery estimator hours and dollars from authored and reviewed PRs', () => {
    const inputs: OrgDailyInputs = {
      ...zeroInputs,
      prMergedByCopilot: 3,
      prReviewedByCopilot: 4,
    };

    expect(deliveryEstimator(inputs, DEFAULT_KNOBS)).toEqual({
      estimator: 'delivery',
      hoursSaved: 4,
      dollarsSaved: 400,
    });
  });

  it('includes optional Phase 1 issue delta inputs in delivery estimator', () => {
    const inputs: OrgDailyInputs = {
      ...zeroInputs,
      prMergedByCopilot: 1,
      prReviewedByCopilot: 2,
      issuesClosedWithCopilot: 5,
      deltaMinVsBaseline: 12,
    };

    expect(deliveryEstimator(inputs, DEFAULT_KNOBS)).toEqual({
      estimator: 'delivery',
      hoursSaved: 2.5,
      dollarsSaved: 250,
    });
  });

  it('rounds estimator outputs to two decimal places without rounding intermediate values', () => {
    const inputs: OrgDailyInputs = {
      ...zeroInputs,
      acceptedCompletions: 1,
    };

    expect(activityEstimator(inputs, { ...DEFAULT_KNOBS, avgLoadedEngCostPerHour: 123.456 })).toEqual({
      estimator: 'activity',
      hoursSaved: 0.01,
      dollarsSaved: 1.54,
    });
  });
});
