import { date, index, numeric, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';
import { dimOrg } from './dimensions.js';

/** Spec 06 §Gold tables: daily organization-level DORA metrics derived from silver delivery facts. */
export const factDoraDaily = pgTable(
  'fact_dora_daily',
  {
    orgId: text('org_id').notNull().references(() => dimOrg.orgId),
    day: date('day').notNull(),
    deploymentFrequency: numeric('deployment_frequency'),
    leadTimeMin: numeric('lead_time_min'),
    changeFailureRate: numeric('change_failure_rate'),
    mttrMin: numeric('mttr_min'),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.orgId, table.day] }),
    orgDayIdx: index('fact_dora_daily_org_id_day_idx').on(table.orgId, table.day),
  }),
);

/** Spec 06 §Gold tables: daily organization-level CI/CD engineering-health metrics. */
export const factCiDaily = pgTable(
  'fact_ci_daily',
  {
    orgId: text('org_id').notNull().references(() => dimOrg.orgId),
    day: date('day').notNull(),
    ciSuccessRate: numeric('ci_success_rate'),
    medianTimeToGreenSec: numeric('median_time_to_green_sec'),
    flakyTestRate: numeric('flaky_test_rate'),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.orgId, table.day] }),
    orgDayIdx: index('fact_ci_daily_org_id_day_idx').on(table.orgId, table.day),
  }),
);
