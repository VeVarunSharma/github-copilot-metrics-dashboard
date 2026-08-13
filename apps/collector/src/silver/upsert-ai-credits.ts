import { factAiCreditsDaily, type Database } from '@ghcp-dash/db';
import type { AiCreditsUsage } from '@ghcp-dash/contracts';
import { ensureDimensions, type OrgDimension } from './common.js';

export async function upsertAiCredits(database: Database, orgId: string, usage: AiCreditsUsage): Promise<number> {
  let rows = 0;
  const orgs: OrgDimension[] = [];
  const features = new Set<string>();
  const models = new Set<string>();

  for (const item of usage.usageItems) {
    orgs.push({ orgId, day: item.date });
    models.add(item.model);
    features.add(item.feature);
  }

  await ensureDimensions(database, { orgs, features, models });

  await database.transaction(async (tx) => {
    const txDb = tx as unknown as Database;
    for (const item of usage.usageItems) {
      const values = {
        orgId,
        day: item.date,
        model: item.model,
        feature: item.feature,
        includedQuantity: (item.includedQuantity ?? 0).toString(),
        billedQuantity: (item.billedQuantity ?? 0).toString(),
        billedAmount: (item.billedAmount ?? 0).toString(),
        currency: item.currency ?? 'USD',
      };
      await txDb.insert(factAiCreditsDaily).values(values).onConflictDoUpdate({ target: [factAiCreditsDaily.orgId, factAiCreditsDaily.day, factAiCreditsDaily.model, factAiCreditsDaily.feature], set: values });
      rows += 1;
    }
  });
  return rows;
}
