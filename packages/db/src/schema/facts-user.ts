import { bigint, boolean, date, index, integer, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';
import { dimFeature, dimIde, dimLanguage, dimModel, dimOrg, dimTeam, dimUser } from './dimensions.js';

const factMetrics = {
  codeAcceptanceActivityCount: integer('code_acceptance_activity_count').notNull(),
  codeGenerationActivityCount: integer('code_generation_activity_count').notNull(),
  locAddedSum: bigint('loc_added_sum', { mode: 'bigint' }).notNull(),
  locDeletedSum: bigint('loc_deleted_sum', { mode: 'bigint' }).notNull(),
  locSuggestedToAddSum: bigint('loc_suggested_to_add_sum', { mode: 'bigint' }).notNull(),
  locSuggestedToDeleteSum: bigint('loc_suggested_to_delete_sum', { mode: 'bigint' }).notNull(),
  userInitiatedInteractionCount: integer('user_initiated_interaction_count').notNull(),
};

/** Spec 01 §5.3: Daily user-level Copilot and CLI aggregate fact. */
export const factUserDaily = pgTable(
  'fact_user_daily',
  {
    userId: bigint('user_id', { mode: 'bigint' }).notNull().references(() => dimUser.userId),
    orgId: text('org_id').notNull().references(() => dimOrg.orgId),
    day: date('day').notNull(),
    usedChat: boolean('used_chat').notNull(),
    usedAgent: boolean('used_agent').notNull(),
    usedCli: boolean('used_cli').notNull(),
    ...factMetrics,
    cliPromptCount: integer('cli_prompt_count').notNull(),
    cliRequestCount: integer('cli_request_count').notNull(),
    cliSessionCount: integer('cli_session_count').notNull(),
    cliPromptTokensSum: bigint('cli_prompt_tokens_sum', { mode: 'bigint' }).notNull(),
    cliOutputTokensSum: bigint('cli_output_tokens_sum', { mode: 'bigint' }).notNull(),
    ingestedAt: timestamp('ingested_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.orgId, table.day] }),
    userDayDescIdx: index('fact_user_daily_user_id_day_desc_idx').on(table.userId, table.day.desc()),
  }),
);

/** Spec 01 §5.3: Daily user-level feature breakdown. */
export const factUserDailyByFeature = pgTable(
  'fact_user_daily_by_feature',
  {
    userId: bigint('user_id', { mode: 'bigint' }).notNull().references(() => dimUser.userId),
    orgId: text('org_id').notNull().references(() => dimOrg.orgId),
    day: date('day').notNull(),
    feature: text('feature').notNull().references(() => dimFeature.name),
    ...factMetrics,
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.orgId, table.day, table.feature] }),
    userDayDescIdx: index('fact_user_daily_by_feature_user_id_day_desc_idx').on(table.userId, table.day.desc()),
  }),
);

/** Spec 01 §5.3: Daily user-level IDE breakdown. */
export const factUserDailyByIde = pgTable(
  'fact_user_daily_by_ide',
  {
    userId: bigint('user_id', { mode: 'bigint' }).notNull().references(() => dimUser.userId),
    orgId: text('org_id').notNull().references(() => dimOrg.orgId),
    day: date('day').notNull(),
    ide: text('ide').notNull().references(() => dimIde.name),
    ...factMetrics,
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.orgId, table.day, table.ide] }),
    userDayDescIdx: index('fact_user_daily_by_ide_user_id_day_desc_idx').on(table.userId, table.day.desc()),
  }),
);

/** Spec 01 §5.3: Daily user-level language and feature breakdown. */
export const factUserDailyByLanguageFeature = pgTable(
  'fact_user_daily_by_language_feature',
  {
    userId: bigint('user_id', { mode: 'bigint' }).notNull().references(() => dimUser.userId),
    orgId: text('org_id').notNull().references(() => dimOrg.orgId),
    day: date('day').notNull(),
    language: text('language').notNull().references(() => dimLanguage.name),
    feature: text('feature').notNull().references(() => dimFeature.name),
    ...factMetrics,
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.orgId, table.day, table.language, table.feature] }),
    userDayDescIdx: index('fact_user_daily_by_language_feature_user_id_day_desc_idx').on(table.userId, table.day.desc()),
  }),
);

/** Spec 01 §5.3: Daily user-level language and model breakdown. */
export const factUserDailyByLanguageModel = pgTable(
  'fact_user_daily_by_language_model',
  {
    userId: bigint('user_id', { mode: 'bigint' }).notNull().references(() => dimUser.userId),
    orgId: text('org_id').notNull().references(() => dimOrg.orgId),
    day: date('day').notNull(),
    language: text('language').notNull().references(() => dimLanguage.name),
    model: text('model').notNull().references(() => dimModel.name),
    ...factMetrics,
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.orgId, table.day, table.language, table.model] }),
    userDayDescIdx: index('fact_user_daily_by_language_model_user_id_day_desc_idx').on(table.userId, table.day.desc()),
  }),
);

/** Spec 01 §5.3: Daily user-level model and feature breakdown. */
export const factUserDailyByModelFeature = pgTable(
  'fact_user_daily_by_model_feature',
  {
    userId: bigint('user_id', { mode: 'bigint' }).notNull().references(() => dimUser.userId),
    orgId: text('org_id').notNull().references(() => dimOrg.orgId),
    day: date('day').notNull(),
    model: text('model').notNull().references(() => dimModel.name),
    feature: text('feature').notNull().references(() => dimFeature.name),
    ...factMetrics,
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.orgId, table.day, table.model, table.feature] }),
    userDayDescIdx: index('fact_user_daily_by_model_feature_user_id_day_desc_idx').on(table.userId, table.day.desc()),
  }),
);

/** Spec 01 §5.3: Daily bridge of users to GitHub teams. */
export const bridgeUserTeam = pgTable(
  'bridge_user_team',
  {
    userId: bigint('user_id', { mode: 'bigint' }).notNull().references(() => dimUser.userId),
    teamId: bigint('team_id', { mode: 'bigint' }).notNull().references(() => dimTeam.teamId),
    orgId: text('org_id').notNull().references(() => dimOrg.orgId),
    day: date('day').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.teamId, table.day] }),
    userDayDescIdx: index('bridge_user_team_user_id_day_desc_idx').on(table.userId, table.day.desc()),
  }),
);
