import { bigint, date, index, pgTable, text, unique } from 'drizzle-orm/pg-core';

/** Spec 01 §5.1: GitHub organization dimension. */
export const dimOrg = pgTable('dim_org', {
  orgId: text('org_id').primaryKey(),
  displayName: text('display_name'),
  firstSeenDay: date('first_seen_day'),
  lastSeenDay: date('last_seen_day'),
});

/** Spec 01 §5.1: GitHub user dimension with privacy-safe pseudonym. */
export const dimUser = pgTable(
  'dim_user',
  {
    userId: bigint('user_id', { mode: 'bigint' }).primaryKey(),
    userLogin: text('user_login'),
    pseudonym: text('pseudonym'),
    firstSeenDay: date('first_seen_day'),
    lastSeenDay: date('last_seen_day'),
  },
  (table) => ({
    userLoginIdx: index('dim_user_user_login_idx').on(table.userLogin),
    pseudonymIdx: index('dim_user_pseudonym_idx').on(table.pseudonym),
  }),
);

/** Spec 01 §5.1: GitHub team dimension scoped to an org. */
export const dimTeam = pgTable(
  'dim_team',
  {
    teamId: bigint('team_id', { mode: 'bigint' }).primaryKey(),
    orgId: text('org_id').references(() => dimOrg.orgId),
    slug: text('slug'),
    firstSeenDay: date('first_seen_day'),
    lastSeenDay: date('last_seen_day'),
  },
  (table) => ({
    orgSlugUnique: unique('dim_team_org_id_slug_unique').on(table.orgId, table.slug),
  }),
);

/** Spec 01 §5.1: Canonical Copilot feature reference table. */
export const dimFeature = pgTable('dim_feature', {
  name: text('name').primaryKey(),
  displayName: text('display_name'),
});

/** Spec 01 §5.1: Canonical IDE reference table. */
export const dimIde = pgTable('dim_ide', {
  name: text('name').primaryKey(),
  displayName: text('display_name'),
});

/** Spec 01 §5.1: Canonical programming language reference table. */
export const dimLanguage = pgTable('dim_language', {
  name: text('name').primaryKey(),
  displayName: text('display_name'),
});

/** Spec 01 §5.1: Canonical model reference table. */
export const dimModel = pgTable('dim_model', {
  name: text('name').primaryKey(),
  displayName: text('display_name'),
});
