import { date, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { dimOrg } from './dimensions.js';

export const VALUE_TRANSLATION_KNOBS_KEY = 'value_translation_knobs' as const;

/** Spec 01 §5.5: Collector invocation audit and idempotency table. */
export const ingestionRun = pgTable('ingestion_run', {
  runId: uuid('run_id').primaryKey(),
  source: text('source').notNull(),
  orgId: text('org_id').references(() => dimOrg.orgId),
  targetDay: date('target_day'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  status: text('status').notNull(),
  rowsWritten: integer('rows_written').notNull(),
  bronzePath: text('bronze_path'),
  errorMessage: text('error_message'),
  attempts: integer('attempts').notNull(),
});

/** Spec 01 §5.5: Single-tenant JSON settings for value knobs and operational flags. */
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});
