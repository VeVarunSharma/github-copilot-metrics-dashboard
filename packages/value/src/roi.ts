import { round2 } from './estimators.js';
import type { BlendedResult, RoiResult, SpendDailyInputs } from './types.js';

export function computeRoi(blended: BlendedResult, spend: SpendDailyInputs): RoiResult {
  const totalSpend = spend.seatCost + spend.premiumRequestSpend + spend.aiCreditSpend;
  const netValue = blended.dollarsSaved - totalSpend;
  const roiRatio = totalSpend === 0 ? 0 : netValue / totalSpend;

  return {
    hoursSavedBlended: round2(blended.hoursSaved),
    dollarsSavedBlended: round2(blended.dollarsSaved),
    totalSpend: round2(totalSpend),
    netValue: round2(netValue),
    roiRatio: round2(roiRatio),
  };
}
