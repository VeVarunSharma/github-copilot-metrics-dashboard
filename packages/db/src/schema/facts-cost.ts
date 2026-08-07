import { date, index, numeric, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';
import { dimFeature, dimModel, dimOrg } from './dimensions.js';

/** Spec 01 §5.4: Daily billing fact by product and SKU. */
export const factBillingDaily = pgTable(
  'fact_billing_daily',
  {
    orgId: text('org_id').notNull().references(() => dimOrg.orgId),
    day: date('day').notNull(),
    product: text('product').notNull(),
    sku: text('sku').notNull(),
    quantity: numeric('quantity').notNull(),
    unit: text('unit').notNull(),
    grossAmount: numeric('gross_amount').notNull(),
    netAmount: numeric('net_amount').notNull(),
    currency: text('currency').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.orgId, table.day, table.product, table.sku] }),
    orgDayDescIdx: index('fact_billing_daily_org_id_day_desc_idx').on(table.orgId, table.day.desc()),
  }),
);

/** Spec 01 §5.4: Daily AI credits usage and spend fact by model and feature. */
export const factAiCreditsDaily = pgTable(
  'fact_ai_credits_daily',
  {
    orgId: text('org_id').notNull().references(() => dimOrg.orgId),
    day: date('day').notNull(),
    model: text('model').notNull().references(() => dimModel.name),
    feature: text('feature').notNull().references(() => dimFeature.name),
    includedQuantity: numeric('included_quantity').notNull(),
    billedQuantity: numeric('billed_quantity').notNull(),
    billedAmount: numeric('billed_amount').notNull(),
    currency: text('currency').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.orgId, table.day, table.model, table.feature] }),
    orgDayDescIdx: index('fact_ai_credits_daily_org_id_day_desc_idx').on(table.orgId, table.day.desc()),
  }),
);
