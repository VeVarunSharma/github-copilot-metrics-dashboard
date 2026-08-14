import { describe, expect, it } from 'vitest';
import { DEFAULT_KNOBS, activityEstimator, allEstimators, blend } from '../index.js';
import type { OrgDailyInputs, ValueKnobs } from '../index.js';

const inputs: OrgDailyInputs = {
  orgId: 'octo-org',
  day: '2026-06-19',
  acceptedCompletions: 80,
  chatRequests: 15,
  agentSessions: 2,
  locAddedByCopilot: 300,
  prMergedByCopilot: 3,
  prReviewedByCopilot: 4,
};

function knobsWithBlend(blendWeights: ValueKnobs['blend']): ValueKnobs {
  return { ...DEFAULT_KNOBS, blend: blendWeights };
}

describe('blend', () => {
  it('returns activity values exactly with activity-only weights', () => {
    const knobs = knobsWithBlend({ activity: 1, output: 0, delivery: 0 });
    const estimators = allEstimators(inputs, knobs);

    expect(blend(estimators, knobs)).toEqual({
      hoursSaved: estimators.activity.hoursSaved,
      dollarsSaved: activityEstimator(inputs, knobs).dollarsSaved,
    });
  });

  it('returns delivery values exactly with delivery-only weights', () => {
    const knobs = knobsWithBlend({ activity: 0, output: 0, delivery: 1 });
    const estimators = allEstimators(inputs, knobs);

    expect(blend(estimators, knobs)).toEqual({
      hoursSaved: estimators.delivery.hoursSaved,
      dollarsSaved: estimators.delivery.dollarsSaved,
    });
  });

  it('returns the average of activity and delivery with 0.5/0/0.5 weights', () => {
    const knobs = knobsWithBlend({ activity: 0.5, output: 0, delivery: 0.5 });
    const estimators = allEstimators(inputs, knobs);

    expect(blend(estimators, knobs)).toEqual({
      hoursSaved: 3.25,
      dollarsSaved: 325,
    });
  });
});
