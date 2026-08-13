import type { ValueKnobs } from './types.js';

export const DEFAULT_KNOBS: ValueKnobs = {
  currency: 'USD',
  avgLoadedEngCostPerHour: 100,
  minPerAcceptedCompletion: 0.75,
  minPerChatRequest: 2,
  minPerAgentSession: 30,
  minSavedPerAuthoredPr: 60,
  minSavedPerReviewedPr: 15,
  locPerHourBaseline: 30,
  blend: { activity: 0, output: 0, delivery: 1 },
};
