import type { EstimatorResult, OrgDailyInputs, ValueKnobs } from './types.js';

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function dollarsSaved(hoursSaved: number, knobs: ValueKnobs): number {
  return hoursSaved * knobs.avgLoadedEngCostPerHour;
}

// Spec 02 Estimator A — Activity-based.
export function activityEstimator(inputs: OrgDailyInputs, knobs: ValueKnobs): EstimatorResult {
  const hoursSaved =
    (inputs.acceptedCompletions * knobs.minPerAcceptedCompletion +
      inputs.chatRequests * knobs.minPerChatRequest +
      inputs.agentSessions * knobs.minPerAgentSession) /
    60;

  return {
    estimator: 'activity',
    hoursSaved: round2(hoursSaved),
    dollarsSaved: round2(dollarsSaved(hoursSaved, knobs)),
  };
}

// Spec 02 Estimator B — Output-based.
export function outputEstimator(inputs: OrgDailyInputs, knobs: ValueKnobs): EstimatorResult {
  const hoursSaved = inputs.locAddedByCopilot / knobs.locPerHourBaseline;

  return {
    estimator: 'output',
    hoursSaved: round2(hoursSaved),
    dollarsSaved: round2(dollarsSaved(hoursSaved, knobs)),
  };
}

// Spec 02 Estimator C — Delivery-based.
export function deliveryEstimator(inputs: OrgDailyInputs, knobs: ValueKnobs): EstimatorResult {
  const issuesClosedWithCopilot = inputs.issuesClosedWithCopilot ?? 0;
  const deltaMinVsBaseline = inputs.deltaMinVsBaseline ?? 0;
  const hoursSaved =
    (inputs.prMergedByCopilot * knobs.minSavedPerAuthoredPr +
      inputs.prReviewedByCopilot * knobs.minSavedPerReviewedPr +
      issuesClosedWithCopilot * deltaMinVsBaseline) /
    60;

  return {
    estimator: 'delivery',
    hoursSaved: round2(hoursSaved),
    dollarsSaved: round2(dollarsSaved(hoursSaved, knobs)),
  };
}

export function allEstimators(
  inputs: OrgDailyInputs,
  knobs: ValueKnobs,
): { activity: EstimatorResult; output: EstimatorResult; delivery: EstimatorResult } {
  return {
    activity: activityEstimator(inputs, knobs),
    output: outputEstimator(inputs, knobs),
    delivery: deliveryEstimator(inputs, knobs),
  };
}
