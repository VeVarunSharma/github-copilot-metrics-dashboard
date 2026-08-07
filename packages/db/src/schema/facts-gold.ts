import { bigint, date, index, jsonb, numeric, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';
import { dimOrg, dimTeam } from './dimensions.js';

export type ValueEstimator = 'activity' | 'output' | 'delivery';

/** Spec 01 §5.6: Daily organization-level computed value estimates. */
export const factValueDaily = pgTable(
  'fact_value_daily',
  {
    orgId: text('org_id').notNull().references(() => dimOrg.orgId),
    day: date('day').notNull(),
    estimator: text('estimator').$type<ValueEstimator>().notNull(),
    hoursSaved: numeric('hours_saved').notNull(),
    dollarsSaved: numeric('dollars_saved').notNull(),
    knobSnapshot: jsonb('knob_snapshot').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.orgId, table.day, table.estimator] }),
    orgDayDescIdx: index('fact_value_daily_org_id_day_desc_idx').on(table.orgId, table.day.desc()),
  }),
);

/** Spec 01 §5.6: Daily organization-level computed ROI fact. */
export const factRoiDaily = pgTable(
  'fact_roi_daily',
  {
    orgId: text('org_id').notNull().references(() => dimOrg.orgId),
    day: date('day').notNull(),
    hoursSavedBlended: numeric('hours_saved_blended').notNull(),
    dollarsSavedBlended: numeric('dollars_saved_blended').notNull(),
    totalSpend: numeric('total_spend').notNull(),
    netValue: numeric('net_value').notNull(),
    roiRatio: numeric('roi_ratio').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.orgId, table.day] }),
    orgDayDescIdx: index('fact_roi_daily_org_id_day_desc_idx').on(table.orgId, table.day.desc()),
  }),
);

/** Spec 01 §5.6: Daily team-level computed value estimates. */
export const factTeamValueDaily = pgTable(
  'fact_team_value_daily',
  {
    teamId: bigint('team_id', { mode: 'bigint' }).notNull().references(() => dimTeam.teamId),
    orgId: text('org_id').notNull().references(() => dimOrg.orgId),
    day: date('day').notNull(),
    estimator: text('estimator').$type<ValueEstimator>().notNull(),
    hoursSaved: numeric('hours_saved').notNull(),
    dollarsSaved: numeric('dollars_saved').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.teamId, table.day, table.estimator] }),
    teamDayDescIdx: index('fact_team_value_daily_team_id_day_desc_idx').on(table.teamId, table.day.desc()),
  }),
);
