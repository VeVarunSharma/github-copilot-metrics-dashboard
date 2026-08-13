import type { ValueKnobs } from './types.js';

const BLEND_SUM_TOLERANCE = 0.001;

type ValidationResult = { ok: true } | { ok: false; errors: string[] };

function addNumericError(errors: string[], name: string, value: number): void {
  if (!Number.isFinite(value)) {
    errors.push(`${name} must be a finite number`);
    return;
  }

  if (value < 0) {
    errors.push(`${name} must be >= 0`);
  }
}

export function validateKnobs(knobs: ValueKnobs): ValidationResult {
  const errors: string[] = [];

  if (typeof knobs.currency !== 'string' || knobs.currency.trim().length === 0) {
    errors.push('currency must be a non-empty string');
  }

  addNumericError(errors, 'avgLoadedEngCostPerHour', knobs.avgLoadedEngCostPerHour);
  addNumericError(errors, 'minPerAcceptedCompletion', knobs.minPerAcceptedCompletion);
  addNumericError(errors, 'minPerChatRequest', knobs.minPerChatRequest);
  addNumericError(errors, 'minPerAgentSession', knobs.minPerAgentSession);
  addNumericError(errors, 'minSavedPerAuthoredPr', knobs.minSavedPerAuthoredPr);
  addNumericError(errors, 'minSavedPerReviewedPr', knobs.minSavedPerReviewedPr);
  addNumericError(errors, 'locPerHourBaseline', knobs.locPerHourBaseline);
  addNumericError(errors, 'blend.activity', knobs.blend.activity);
  addNumericError(errors, 'blend.output', knobs.blend.output);
  addNumericError(errors, 'blend.delivery', knobs.blend.delivery);

  const blendSum = knobs.blend.activity + knobs.blend.output + knobs.blend.delivery;
  if (!Number.isFinite(blendSum) || Math.abs(blendSum - 1) > BLEND_SUM_TOLERANCE) {
    errors.push(`blend weights must sum to 1.0 within ${BLEND_SUM_TOLERANCE}; received ${blendSum}`);
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
