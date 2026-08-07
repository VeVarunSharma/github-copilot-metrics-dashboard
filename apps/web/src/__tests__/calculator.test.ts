import { describe, expect, it } from 'vitest';
import { DEFAULT_KNOBS } from '@ghcp-dash/value';
import { CALCULATOR_DEFAULTS, computeCalculator } from '@/calculator/compute';

describe('calculator', () => {
  it('computes positive value for defaults', () => {
    const result = computeCalculator(CALCULATOR_DEFAULTS);
    expect(result.roi.hoursSavedBlended).toBeGreaterThan(0);
    expect(result.roi.dollarsSavedBlended).toBeGreaterThan(0);
    expect(result.contributions).toHaveLength(4);
  });

  it('uses the dashboard default delivery-only blend', () => {
    const result = computeCalculator(CALCULATOR_DEFAULTS);

    expect(DEFAULT_KNOBS.blend).toEqual({ activity: 0, output: 0, delivery: 1 });
    expect(result.blended.hoursSaved).toBe(result.estimators.delivery.hoursSaved);
    expect(result.blended.dollarsSaved).toBe(result.estimators.delivery.dollarsSaved);
  });
});
