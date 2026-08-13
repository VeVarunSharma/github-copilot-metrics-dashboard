import { describe, expect, it } from 'vitest';
import {
  dimFeature,
  dimIde,
  dimLanguage,
  dimModel,
  dimOrg,
  factOrgDaily,
  factOrgDailyByFeature,
  factOrgDailyByIde,
  factOrgDailyByLanguageFeature,
  factOrgDailyByLanguageModel,
  factOrgDailyByModelFeature,
  type Database,
} from '@ghcp-dash/db';
import type { OrgDailyReport } from '@ghcp-dash/contracts';
import { DimensionWriteGate } from '../silver/dimension-gate.js';
import { DIMENSION_ADVISORY_LOCK_KEY } from '../silver/common.js';
import { upsertOrgDaily } from '../silver/upsert-org-daily.js';

const metricFields = {
  code_acceptance_activity_count: 1,
  code_generation_activity_count: 2,
  loc_added_sum: 3,
  loc_deleted_sum: 4,
  loc_suggested_to_add_sum: 5,
  loc_suggested_to_delete_sum: 6,
  user_initiated_interaction_count: 7,
};

function tableName(table: unknown): string {
  if (table === dimOrg) return 'dim_org';
  if (table === dimFeature) return 'dim_feature';
  if (table === dimIde) return 'dim_ide';
  if (table === dimLanguage) return 'dim_language';
  if (table === dimModel) return 'dim_model';
  if (table === factOrgDaily) return 'fact_org_daily';
  if (table === factOrgDailyByFeature) return 'fact_org_daily_by_feature';
  if (table === factOrgDailyByIde) return 'fact_org_daily_by_ide';
  if (table === factOrgDailyByLanguageFeature) return 'fact_org_daily_by_language_feature';
  if (table === factOrgDailyByLanguageModel) return 'fact_org_daily_by_language_model';
  if (table === factOrgDailyByModelFeature) return 'fact_org_daily_by_model_feature';
  return 'unknown';
}

class FakeSilverDatabase {
  readonly events: string[] = [];

  insert(table: unknown) {
    return {
      values: (_values: unknown) => ({
        onConflictDoUpdate: (_args: unknown) => {
          this.events.push(`update:${tableName(table)}`);
          return Promise.resolve();
        },
        onConflictDoNothing: (_args: unknown) => {
          this.events.push(`ignore:${tableName(table)}`);
          return Promise.resolve();
        },
      }),
    };
  }

  execute(_query: unknown) {
    this.events.push(`advisory-lock:${DIMENSION_ADVISORY_LOCK_KEY}`);
    return Promise.resolve();
  }

  async transaction<T>(callback: (tx: Database) => Promise<T>): Promise<T> {
    this.events.push('transaction:start');
    const result = await callback(this.asDatabase());
    this.events.push('transaction:end');
    return result;
  }

  asDatabase(): Database {
    return this as unknown as Database;
  }
}

describe('dimension upsert hardening', () => {
  it('serializes dimension write sections', async () => {
    const gate = new DimensionWriteGate();
    const events: string[] = [];
    let releaseFirst: () => void = () => undefined;
    let markFirstStarted: () => void = () => undefined;
    const firstStarted = new Promise<void>((resolve) => {
      markFirstStarted = resolve;
    });
    const firstBlock = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = gate.run(async () => {
      events.push('first:start');
      markFirstStarted();
      await firstBlock;
      events.push('first:end');
    });
    const second = gate.run(async () => {
      events.push('second:start');
      events.push('second:end');
    });

    await firstStarted;
    await Promise.resolve();
    expect(events).toEqual(['first:start']);

    releaseFirst();
    await Promise.all([first, second]);
    expect(events).toEqual(['first:start', 'first:end', 'second:start', 'second:end']);
  });

  it('preflights dimensions before opening the org fact transaction', async () => {
    const database = new FakeSilverDatabase();
    const report: OrgDailyReport = {
      report_start_day: '2026-06-21',
      report_end_day: '2026-06-21',
      day_totals: [
        {
          day: '2026-06-21',
          daily_active_users: 1,
          weekly_active_users: 1,
          monthly_active_users: 1,
          ...metricFields,
          totals_by_feature: [{ feature: 'chat', ...metricFields }],
          totals_by_ide: [{ ide: 'vscode', ...metricFields }],
          totals_by_language_feature: [{ language: 'typescript', feature: 'chat', ...metricFields }],
          totals_by_language_model: [{ language: 'typescript', model: 'gpt-4o', ...metricFields }],
          totals_by_model_feature: [{ model: 'gpt-4o', feature: 'chat', ...metricFields }],
        },
      ],
    };

    const written = await upsertOrgDaily(database.asDatabase(), 'octo', report);

    expect(written).toBe(6);
    expect(database.events.slice(0, 8)).toEqual([
      'transaction:start',
      `advisory-lock:${DIMENSION_ADVISORY_LOCK_KEY}`,
      'update:dim_org',
      'ignore:dim_feature',
      'ignore:dim_ide',
      'ignore:dim_language',
      'ignore:dim_model',
      'transaction:end',
    ]);
    const factTransactionStart = database.events.indexOf('transaction:start', 1);
    const factTransactionEnd = database.events.indexOf('transaction:end', factTransactionStart);
    expect(factTransactionStart).toBeGreaterThan(0);
    expect(database.events.slice(factTransactionStart + 1, factTransactionEnd).some((event) => event.includes(':dim_'))).toBe(false);
  });
});
