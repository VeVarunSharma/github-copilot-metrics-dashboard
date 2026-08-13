import { factBillingDaily, type Database } from '@ghcp-dash/db';
import type { BillingUsageSummary } from '@ghcp-dash/contracts';
import { ensureDimensions, type OrgDimension } from './common.js';

export async function upsertBilling(database: Database, orgId: string, summary: BillingUsageSummary): Promise<number> {
  let rows = 0;
  const orgs: OrgDimension[] = summary.usageItems.map((item) => ({ orgId, day: item.date }));
  await ensureDimensions(database, { orgs });

  await database.transaction(async (tx) => {
    const txDb = tx as unknown as Database;
    for (const item of summary.usageItems) {
      const values = {
        orgId,
        day: item.date,
        product: item.product,
        sku: item.sku,
        quantity: item.quantity.toString(),
        unit: item.unitType,
        grossAmount: item.grossAmount.toString(),
        netAmount: item.netAmount.toString(),
        currency: item.currency ?? 'USD',
      };
      await txDb.insert(factBillingDaily).values(values).onConflictDoUpdate({ target: [factBillingDaily.orgId, factBillingDaily.day, factBillingDaily.product, factBillingDaily.sku], set: values });
      rows += 1;
    }
  });
  return rows;
}
