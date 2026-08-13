import { describe, expect, it } from 'vitest';
import { computeRoi } from '../index.js';

describe('computeRoi', () => {
  it('computes net value as blended dollars minus total spend', () => {
    expect(
      computeRoi(
        { hoursSaved: 10, dollarsSaved: 1000 },
        { seatCost: 300, premiumRequestSpend: 50, aiCreditSpend: 25 },
      ),
    ).toEqual({
      hoursSavedBlended: 10,
      dollarsSavedBlended: 1000,
      totalSpend: 375,
      netValue: 625,
      roiRatio: 1.67,
    });
  });

  it('returns a zero ROI ratio for zero spend instead of NaN or Infinity', () => {
    const roi = computeRoi(
      { hoursSaved: 10, dollarsSaved: 1000 },
      { seatCost: 0, premiumRequestSpend: 0, aiCreditSpend: 0 },
    );

    expect(roi.roiRatio).toBe(0);
    expect(Number.isFinite(roi.roiRatio)).toBe(true);
  });

  it('surfaces negative ROI without clamping', () => {
    expect(
      computeRoi(
        { hoursSaved: 1, dollarsSaved: 100 },
        { seatCost: 150, premiumRequestSpend: 50, aiCreditSpend: 0 },
      ),
    ).toEqual({
      hoursSavedBlended: 1,
      dollarsSavedBlended: 100,
      totalSpend: 200,
      netValue: -100,
      roiRatio: -0.5,
    });
  });
});
