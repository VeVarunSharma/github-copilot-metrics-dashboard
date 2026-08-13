export interface ValueKnobs {
  currency: string;
  avgLoadedEngCostPerHour: number;
  minPerAcceptedCompletion: number;
  minPerChatRequest: number;
  minPerAgentSession: number;
  minSavedPerAuthoredPr: number;
  minSavedPerReviewedPr: number;
  locPerHourBaseline: number;
  blend: {
    activity: number;
    output: number;
    delivery: number;
  };
}

export interface OrgDailyInputs {
  orgId: string;
  day: string;
  acceptedCompletions: number;
  chatRequests: number;
  agentSessions: number;
  locAddedByCopilot: number;
  prMergedByCopilot: number;
  prReviewedByCopilot: number;
  issuesClosedWithCopilot?: number;
  deltaMinVsBaseline?: number;
}

export interface SpendDailyInputs {
  seatCost: number;
  premiumRequestSpend: number;
  aiCreditSpend: number;
}

export interface EstimatorResult {
  estimator: 'activity' | 'output' | 'delivery';
  hoursSaved: number;
  dollarsSaved: number;
}

export interface BlendedResult {
  hoursSaved: number;
  dollarsSaved: number;
}

export interface RoiResult {
  hoursSavedBlended: number;
  dollarsSavedBlended: number;
  totalSpend: number;
  netValue: number;
  roiRatio: number;
}
