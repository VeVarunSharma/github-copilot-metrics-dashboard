import { bigint, date, index, integer, numeric, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';
import { dimFeature, dimIde, dimLanguage, dimModel, dimOrg } from './dimensions.js';

const factMetrics = {
  codeAcceptanceActivityCount: integer('code_acceptance_activity_count').notNull(),
  codeGenerationActivityCount: integer('code_generation_activity_count').notNull(),
  locAddedSum: bigint('loc_added_sum', { mode: 'bigint' }).notNull(),
  locDeletedSum: bigint('loc_deleted_sum', { mode: 'bigint' }).notNull(),
  locSuggestedToAddSum: bigint('loc_suggested_to_add_sum', { mode: 'bigint' }).notNull(),
  locSuggestedToDeleteSum: bigint('loc_suggested_to_delete_sum', { mode: 'bigint' }).notNull(),
  userInitiatedInteractionCount: integer('user_initiated_interaction_count').notNull(),
};

/** Spec 01 §5.2: Daily organization-level Copilot, PR, and CLI aggregate fact. */
export const factOrgDaily = pgTable(
  'fact_org_daily',
  {
    orgId: text('org_id').notNull().references(() => dimOrg.orgId),
    day: date('day').notNull(),
    dailyActiveUsers: integer('daily_active_users').notNull(),
    weeklyActiveUsers: integer('weekly_active_users').notNull(),
    monthlyActiveUsers: integer('monthly_active_users').notNull(),
    monthlyActiveChatUsers: integer('monthly_active_chat_users').notNull(),
    monthlyActiveAgentUsers: integer('monthly_active_agent_users').notNull(),
    dailyActiveCliUsers: integer('daily_active_cli_users').notNull(),
    ...factMetrics,
    prTotalCreated: integer('pr_total_created').notNull(),
    prTotalCreatedByCopilot: integer('pr_total_created_by_copilot').notNull(),
    prTotalMerged: integer('pr_total_merged').notNull(),
    prTotalMergedCreatedByCopilot: integer('pr_total_merged_created_by_copilot').notNull(),
    prTotalReviewed: integer('pr_total_reviewed').notNull(),
    prTotalReviewedByCopilot: integer('pr_total_reviewed_by_copilot').notNull(),
    prTotalSuggestions: integer('pr_total_suggestions').notNull(),
    prTotalAppliedSuggestions: integer('pr_total_applied_suggestions').notNull(),
    prTotalCopilotSuggestions: integer('pr_total_copilot_suggestions').notNull(),
    prTotalCopilotAppliedSuggestions: integer('pr_total_copilot_applied_suggestions').notNull(),
    prMedianMinutesToMerge: numeric('pr_median_minutes_to_merge'),
    prMedianMinutesToMergeCopilotAuthored: numeric('pr_median_minutes_to_merge_copilot_authored'),
    prMedianMinutesToMergeCopilotReviewed: numeric('pr_median_minutes_to_merge_copilot_reviewed'),
    cliPromptCount: integer('cli_prompt_count').notNull(),
    cliRequestCount: integer('cli_request_count').notNull(),
    cliSessionCount: integer('cli_session_count').notNull(),
    cliPromptTokensSum: bigint('cli_prompt_tokens_sum', { mode: 'bigint' }).notNull(),
    cliOutputTokensSum: bigint('cli_output_tokens_sum', { mode: 'bigint' }).notNull(),
    ingestedAt: timestamp('ingested_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.orgId, table.day] }),
    dayDescIdx: index('fact_org_daily_day_desc_idx').on(table.day.desc()),
    orgDayDescIdx: index('fact_org_daily_org_id_day_desc_idx').on(table.orgId, table.day.desc()),
  }),
);

/** Spec 01 §5.2: Daily organization-level feature breakdown. */
export const factOrgDailyByFeature = pgTable(
  'fact_org_daily_by_feature',
  {
    orgId: text('org_id').notNull().references(() => dimOrg.orgId),
    day: date('day').notNull(),
    feature: text('feature').notNull().references(() => dimFeature.name),
    ...factMetrics,
  },
  (table) => ({
    pk: primaryKey({ columns: [table.orgId, table.day, table.feature] }),
    orgDayDescIdx: index('fact_org_daily_by_feature_org_id_day_desc_idx').on(table.orgId, table.day.desc()),
  }),
);

/** Spec 01 §5.2: Daily organization-level IDE breakdown. */
export const factOrgDailyByIde = pgTable(
  'fact_org_daily_by_ide',
  {
    orgId: text('org_id').notNull().references(() => dimOrg.orgId),
    day: date('day').notNull(),
    ide: text('ide').notNull().references(() => dimIde.name),
    ...factMetrics,
  },
  (table) => ({
    pk: primaryKey({ columns: [table.orgId, table.day, table.ide] }),
    orgDayDescIdx: index('fact_org_daily_by_ide_org_id_day_desc_idx').on(table.orgId, table.day.desc()),
  }),
);

/** Spec 01 §5.2: Daily organization-level language and feature breakdown. */
export const factOrgDailyByLanguageFeature = pgTable(
  'fact_org_daily_by_language_feature',
  {
    orgId: text('org_id').notNull().references(() => dimOrg.orgId),
    day: date('day').notNull(),
    language: text('language').notNull().references(() => dimLanguage.name),
    feature: text('feature').notNull().references(() => dimFeature.name),
    ...factMetrics,
  },
  (table) => ({
    pk: primaryKey({ columns: [table.orgId, table.day, table.language, table.feature] }),
    orgDayDescIdx: index('fact_org_daily_by_language_feature_org_id_day_desc_idx').on(table.orgId, table.day.desc()),
  }),
);

/** Spec 01 §5.2: Daily organization-level language and model breakdown. */
export const factOrgDailyByLanguageModel = pgTable(
  'fact_org_daily_by_language_model',
  {
    orgId: text('org_id').notNull().references(() => dimOrg.orgId),
    day: date('day').notNull(),
    language: text('language').notNull().references(() => dimLanguage.name),
    model: text('model').notNull().references(() => dimModel.name),
    ...factMetrics,
  },
  (table) => ({
    pk: primaryKey({ columns: [table.orgId, table.day, table.language, table.model] }),
    orgDayDescIdx: index('fact_org_daily_by_language_model_org_id_day_desc_idx').on(table.orgId, table.day.desc()),
  }),
);

/** Spec 01 §5.2: Daily organization-level model and feature breakdown. */
export const factOrgDailyByModelFeature = pgTable(
  'fact_org_daily_by_model_feature',
  {
    orgId: text('org_id').notNull().references(() => dimOrg.orgId),
    day: date('day').notNull(),
    model: text('model').notNull().references(() => dimModel.name),
    feature: text('feature').notNull().references(() => dimFeature.name),
    ...factMetrics,
  },
  (table) => ({
    pk: primaryKey({ columns: [table.orgId, table.day, table.model, table.feature] }),
    orgDayDescIdx: index('fact_org_daily_by_model_feature_org_id_day_desc_idx').on(table.orgId, table.day.desc()),
  }),
);
