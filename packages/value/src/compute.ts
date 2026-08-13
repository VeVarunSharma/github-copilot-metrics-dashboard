import { allEstimators } from './estimators.js';
import { blend } from './blend.js';
import { computeRoi } from './roi.js';
import type { BlendedResult, OrgDailyInputs, SpendDailyInputs, ValueKnobs } from './types.js';

export function computeDailyValue(
  inputs: OrgDailyInputs,
  spend: SpendDailyInputs,
  knobs: ValueKnobs,
): { estimators: ReturnType<typeof allEstimators>; blended: BlendedResult; roi: ReturnType<typeof computeRoi> } {
  const estimators = allEstimators(inputs, knobs);
  const blended = blend(estimators, knobs);
  const roi = computeRoi(blended, spend);

  return { estimators, blended, roi };
}
