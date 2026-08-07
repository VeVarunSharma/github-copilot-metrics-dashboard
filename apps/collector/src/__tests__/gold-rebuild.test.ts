import { describe, expect, it } from 'vitest';
import { computeDailyValue, DEFAULT_KNOBS } from '@ghcp-dash/value';
import {
  bridgeUserTeam,
  factAiCreditsDaily,
  factBillingDaily,
  factOrgDaily,
  factOrgDailyByFeature,
  factUserDaily,
  factValueDaily,
  settings,
  VALUE_TRANSLATION_KNOBS_KEY,
  type Database,
} from '@ghcp-dash/db';
import { rebuildGold, summarizeSpendInputs } from '../gold/rebuild.js';

interface CapturedValueRow {
  estimator: string;
  dollarsSaved: string;
  knobSnapshot: string;
}

class FakeGoldDatabase {
  readonly valueRows: CapturedValueRow[] = [];

  constructor(private readonly savedKnobs: typeof DEFAULT_KNOBS) {}

  select(_projection?: unknown) {
    return {
      from: (table: unknown) => ({
        where: (_condition: unknown) => Promise.resolve(this.rowsFor(table)),
      }),
    };
  }

  delete(_table: unknown) {
    return {
      where: (_condition: unknown) => Promise.resolve(),
    };
  }

  insert(table: unknown) {
    return {
      values: (values: unknown) => ({
        onConflictDoUpdate: (_args: unknown) => {
          if (table === factValueDaily) {
            this.valueRows.push(values as CapturedValueRow);
          }
          return Promise.resolve();
        },
      }),
    };
  }

  transaction<T>(callback: (tx: Database) => Promise<T>): Promise<T> {
    return callback(this.asDatabase());
  }

  asDatabase(): Database {
    return this as unknown as Database;
  }

  private rowsFor(table: unknown): unknown[] {
    if (table === settings) {
      return [{ key: VALUE_TRANSLATION_KNOBS_KEY, value: this.savedKnobs, updatedAt: new Date('2026-06-19T09:00:00Z') }];
    }
    if (table === factOrgDaily) {
      return [{ orgId: 'octo', day: '2026-06-18', locAddedSum: '0', prTotalMergedCreatedByCopilot: 0, prTotalReviewedByCopilot: 0 }];
    }
    if (table === factOrgDailyByFeature) {
      return [{ orgId: 'octo', day: '2026-06-18', feature: 'code_completion', codeAcceptanceActivityCount: 10, userInitiatedInteractionCount: 0 }];
    }
    if (table === factUserDaily || table === factBillingDaily || table === factAiCreditsDaily || table === bridgeUserTeam) {
      return [];
    }
    return [];
  }
}

describe('gold value computation contract', () => {
  it('computes ROI rows from silver-shaped inputs', () => {
    const result = computeDailyValue(
      { orgId: 'octo', day: '2026-06-18', acceptedCompletions: 10, chatRequests: 2, agentSessions: 1, locAddedByCopilot: 30, prMergedByCopilot: 1, prReviewedByCopilot: 2 },
      { seatCost: 20, premiumRequestSpend: 0, aiCreditSpend: 5 },
      DEFAULT_KNOBS,
    );
    expect(Object.values(result.estimators)).toHaveLength(3);
    expect(result.roi.totalSpend).toBe(25);
    expect(result.blended.dollarsSaved).toBe(result.estimators.delivery.dollarsSaved);
  });

  it('splits billing and AI-credit rows into ROI spend inputs', () => {
    const spend = summarizeSpendInputs(
      [
        { sku: 'Copilot Enterprise', netAmount: '45.5' },
        { sku: 'Premium request', netAmount: '7.25' },
        { sku: 'Copilot Enterprise premium request', netAmount: '2.75' },
      ],
      [{ billedAmount: '1.5' }],
    );

    expect(spend).toEqual({
      seatCost: 45.5,
      premiumRequestSpend: 10,
      aiCreditSpend: 1.5,
    });
  });

  it('rebuilds gold with knobs saved under the web settings key', async () => {
    const database = new FakeGoldDatabase({ ...DEFAULT_KNOBS, avgLoadedEngCostPerHour: 200 });

    const written = await rebuildGold(database.asDatabase(), [{ orgId: 'octo', day: '2026-06-18' }]);

    expect(written).toBe(4);
    const activityRow = database.valueRows.find((row) => row.estimator === 'activity');
    expect(activityRow?.dollarsSaved).toBe('25');
    expect(JSON.parse(activityRow?.knobSnapshot ?? '{}')).toMatchObject({ avgLoadedEngCostPerHour: 200 });
  });
});
