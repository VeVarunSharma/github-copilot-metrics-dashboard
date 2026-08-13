export type CopilotBillingSpendCategory = 'seat' | 'premium-request';

export function classifyCopilotBillingSku(sku: string): CopilotBillingSpendCategory {
  const normalized = sku.trim().toLowerCase();
  if (normalized.includes('premium') || normalized.includes('request')) return 'premium-request';
  if (normalized.includes('seat') || normalized.includes('business') || normalized.includes('enterprise')) return 'seat';
  return 'premium-request';
}
