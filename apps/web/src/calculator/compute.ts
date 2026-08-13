import { allEstimators, blend, computeRoi, DEFAULT_KNOBS, type ValueKnobs } from '@ghcp-dash/value';

export interface CalculatorInputs {
  developers: number;
  avgLoadedCost: number;
  pctActivelyUsing: number;
  completions: number;
  chatRequests: number;
  agentSessions: number;
  prsTouchedByCopilot: number;
  minPerCompletion: number;
  minPerChat: number;
  minPerAgent: number;
  minSavedPerPR: number;
  monthlySeatPrice: number;
  premiumSpendPerDev: number;
}

export const CALCULATOR_DEFAULTS: CalculatorInputs = {
  developers: 50,
  avgLoadedCost: 100,
  pctActivelyUsing: 80,
  completions: 600,
  chatRequests: 120,
  agentSessions: 20,
  prsTouchedByCopilot: 12,
  minPerCompletion: 0.75,
  minPerChat: 2,
  minPerAgent: 30,
  minSavedPerPR: 60,
  monthlySeatPrice: 39,
  premiumSpendPerDev: 5,
};

export function computeCalculator(input: CalculatorInputs) {
  const activeDevs = input.developers * input.pctActivelyUsing / 100;
  const knobs: ValueKnobs = {
    ...DEFAULT_KNOBS,
    avgLoadedEngCostPerHour: input.avgLoadedCost,
    minPerAcceptedCompletion: input.minPerCompletion,
    minPerChatRequest: input.minPerChat,
    minPerAgentSession: input.minPerAgent,
    minSavedPerAuthoredPr: input.minSavedPerPR,
    minSavedPerReviewedPr: 0,
    blend: DEFAULT_KNOBS.blend,
  };
  const estimators = allEstimators({
    orgId: 'calculator',
    day: new Date().toISOString().slice(0, 10),
    acceptedCompletions: activeDevs * input.completions,
    chatRequests: activeDevs * input.chatRequests,
    agentSessions: activeDevs * input.agentSessions,
    locAddedByCopilot: 0,
    prMergedByCopilot: activeDevs * input.prsTouchedByCopilot,
    prReviewedByCopilot: 0,
  }, knobs);
  const blended = blend(estimators, knobs);
  const spend = {
    seatCost: input.developers * input.monthlySeatPrice,
    premiumRequestSpend: input.developers * input.premiumSpendPerDev,
    aiCreditSpend: 0,
  };
  const roi = computeRoi(blended, spend);
  const contributions = [
    { source: 'Completions', hours: activeDevs * input.completions * input.minPerCompletion / 60 },
    { source: 'Chat', hours: activeDevs * input.chatRequests * input.minPerChat / 60 },
    { source: 'Agent', hours: activeDevs * input.agentSessions * input.minPerAgent / 60 },
    { source: 'PRs', hours: activeDevs * input.prsTouchedByCopilot * input.minSavedPerPR / 60 },
  ];

  return {
    activeDevs,
    estimators,
    blended,
    roi,
    spend,
    contributions,
    paybackMonths: roi.dollarsSavedBlended === 0 ? Infinity : roi.totalSpend / roi.dollarsSavedBlended,
  };
}
