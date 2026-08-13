import { bigint, date, index, integer, numeric, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';
import { dimOrg } from './dimensions.js';

/** Spec 06 §Silver tables: stable repository dimension for delivery and quality facts. */
export const dimRepo = pgTable(
  'dim_repo',
  {
    repoId: bigint('repo_id', { mode: 'bigint' }).primaryKey(),
    orgId: text('org_id').notNull().references(() => dimOrg.orgId),
    name: text('name').notNull(),
    defaultBranch: text('default_branch').notNull(),
    firstSeenDay: date('first_seen_day').notNull(),
    lastSeenDay: date('last_seen_day').notNull(),
  },
  (table) => ({
    orgNameIdx: index('dim_repo_org_id_name_idx').on(table.orgId, table.name),
  }),
);

/** Spec 06 §Silver tables: daily release aggregates by organization and repository. */
export const factReleaseDaily = pgTable(
  'fact_release_daily',
  {
    orgId: text('org_id').notNull().references(() => dimOrg.orgId),
    repoId: bigint('repo_id', { mode: 'bigint' }).notNull().references(() => dimRepo.repoId),
    day: date('day').notNull(),
    releaseCount: integer('release_count').notNull(),
    prereleaseCount: integer('prerelease_count').notNull(),
    latestTagAt: timestamp('latest_tag_at', { withTimezone: true }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.orgId, table.repoId, table.day] }),
    orgDayIdx: index('fact_release_daily_org_id_day_idx').on(table.orgId, table.day),
  }),
);

/** Spec 06 §Silver tables: daily GitHub Actions workflow run aggregates by workflow. */
export const factWorkflowRunDaily = pgTable(
  'fact_workflow_run_daily',
  {
    orgId: text('org_id').notNull().references(() => dimOrg.orgId),
    repoId: bigint('repo_id', { mode: 'bigint' }).notNull().references(() => dimRepo.repoId),
    workflowId: bigint('workflow_id', { mode: 'bigint' }).notNull(),
    day: date('day').notNull(),
    successCount: integer('success_count').notNull(),
    failureCount: integer('failure_count').notNull(),
    cancelledCount: integer('cancelled_count').notNull(),
    medianDurationSec: numeric('median_duration_sec').notNull(),
    p90DurationSec: numeric('p90_duration_sec').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.orgId, table.repoId, table.workflowId, table.day] }),
    orgDayIdx: index('fact_workflow_run_daily_org_id_day_idx').on(table.orgId, table.day),
  }),
);

/** Spec 06 §Silver tables: privacy-preserving daily commit aggregates by author. */
export const factCommitDaily = pgTable(
  'fact_commit_daily',
  {
    orgId: text('org_id').notNull().references(() => dimOrg.orgId),
    repoId: bigint('repo_id', { mode: 'bigint' }).notNull().references(() => dimRepo.repoId),
    authorUserId: bigint('author_user_id', { mode: 'bigint' }).notNull(),
    day: date('day').notNull(),
    commitCount: integer('commit_count').notNull(),
    additionsSum: bigint('additions_sum', { mode: 'bigint' }).notNull(),
    deletionsSum: bigint('deletions_sum', { mode: 'bigint' }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.orgId, table.repoId, table.authorUserId, table.day] }),
    orgDayIdx: index('fact_commit_daily_org_id_day_idx').on(table.orgId, table.day),
  }),
);
