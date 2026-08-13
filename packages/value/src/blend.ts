import { round2 } from './estimators.js';
import type { BlendedResult, EstimatorResult, ValueKnobs } from './types.js';

export function blend(
  estimators: {
    activity: EstimatorResult;
    output: EstimatorResult;
    delivery: EstimatorResult;
  },
  knobs: ValueKnobs,
): BlendedResult {
  const hoursSaved =
    estimators.activity.hoursSaved * knobs.blend.activity +
    estimators.output.hoursSaved * knobs.blend.output +
    estimators.delivery.hoursSaved * knobs.blend.delivery;

  return {
    hoursSaved: round2(hoursSaved),
    dollarsSaved: round2(hoursSaved * knobs.avgLoadedEngCostPerHour),
  };
}
