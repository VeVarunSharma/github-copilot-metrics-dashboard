import { describe, expect, it } from 'vitest';
import { computeConsumptionPatterns, isCostEffectiveModel, normalizeModelKey } from '../server/queries/consumption';

type ConsumptionRows = Parameters<typeof computeConsumptionPatterns>[0];

function rows(partial: Partial<ConsumptionRows>): ConsumptionRows {
  return {
    users: [],
    modelFeatures: [],
    bridges: [],
    teams: [],
    credits: [],
    ...partial,
  } as unknown as ConsumptionRows;
}

function user(userId: number, interactions: number, day = '2026-06-18') {
  return {
    userId: BigInt(userId),
    orgId: 'octo-org',
    day,
    usedChat: interactions > 0,
    usedAgent: userId % 2 === 0,
    usedCli: userId % 3 === 0,
    codeAcceptanceActivityCount: Math.round(interactions / 4),
    codeGenerationActivityCount: Math.round(interactions / 2),
    locAddedSum: BigInt(interactions * 10),
    locDeletedSum: BigInt(0),
    locSuggestedToAddSum: BigInt(0),
    locSuggestedToDeleteSum: BigInt(0),
    userInitiatedInteractionCount: Math.round(interactions / 2),
    cliPromptCount: 0,
    cliRequestCount: 0,
    cliSessionCount: 0,
    cliPromptTokensSum: BigInt(0),
    cliOutputTokensSum: BigInt(0),
    ingestedAt: new Date('2026-06-19T00:00:00Z'),
  };
}

function modelFeature(userId: number, model: string, interactions = 10, day = '2026-06-18') {
  return {
    userId: BigInt(userId),
    orgId: 'octo-org',
    day,
    model,
    feature: 'chat',
    codeAcceptanceActivityCount: Math.round(interactions / 4),
    codeGenerationActivityCount: Math.round(interactions / 2),
    locAddedSum: BigInt(interactions * 10),
    locDeletedSum: BigInt(0),
    locSuggestedToAddSum: BigInt(0),
    locSuggestedToDeleteSum: BigInt(0),
    userInitiatedInteractionCount: Math.round(interactions / 2),
  };
}

function credit(model: string, billedAmount: number) {
  return {
    orgId: 'octo-org',
    day: '2026-06-18',
    model,
    feature: 'chat',
    includedQuantity: '100',
    billedQuantity: '20',
    billedAmount: String(billedAmount),
    currency: 'USD',
  };
}

describe('computeConsumptionPatterns', () => {
  it('computes top-cohort concentration without requiring named rankings', () => {
    const users = Array.from({ length: 50 }, (_, i) => user(i + 1, i < 5 ? 80 : i < 10 ? 60 : 10));
    const res = computeConsumptionPatterns(
      rows({
        users: users as never,
      }),
      'USD',
    );

    expect(res.headlines.activeUsers).toBe(50);
    expect(res.headlines.top10InteractionShare).toBeCloseTo(400 / 1100, 3);
    expect(res.headlines.top20InteractionShare).toBeCloseTo(700 / 1100, 3);
    expect(res.cohorts[0]?.cohort).toBe('Top 10%');
  });

  it('suppresses team rows below the five-user privacy threshold', () => {
    const users = Array.from({ length: 9 }, (_, i) => user(i + 1, 10));
    const bridges = [
      ...[1, 2, 3, 4].map((id) => ({ userId: BigInt(id), teamId: BigInt(1), orgId: 'octo-org', day: '2026-06-18' })),
      ...[5, 6, 7, 8, 9].map((id) => ({ userId: BigInt(id), teamId: BigInt(2), orgId: 'octo-org', day: '2026-06-18' })),
    ];

    const res = computeConsumptionPatterns(
      rows({
        users: users as never,
        bridges: bridges as never,
        teams: [
          { teamId: BigInt(1), orgId: 'octo-org', slug: 'small-team' },
          { teamId: BigInt(2), orgId: 'octo-org', slug: 'platform' },
        ] as never,
      }),
      'USD',
    );

    expect(res.teams).toHaveLength(1);
    expect(res.teams[0]?.teamSlug).toBe('platform');
  });

  it('does not classify Gemini as a mini/small/nano cost-effective model', () => {
    expect(isCostEffectiveModel('gpt-4o-mini')).toBe(true);
    expect(isCostEffectiveModel('gemini-2.5-pro')).toBe(false);
  });

  it('renders billing-derived metrics unavailable when AI-credit facts are absent', () => {
    const users = Array.from({ length: 5 }, (_, i) => user(i + 1, 10));
    const res = computeConsumptionPatterns(
      rows({
        users: users as never,
        bridges: users.map((row) => ({ userId: row.userId, teamId: BigInt(1), orgId: 'octo-org', day: '2026-06-18' })) as never,
        teams: [{ teamId: BigInt(1), orgId: 'octo-org', slug: 'platform' }] as never,
      }),
      'USD',
    );

    expect(res.headlines.billingAvailable).toBe(false);
    expect(res.headlines.premiumModelSpendShare).toBeNull();
    expect(res.headlines.costConsciousShare).toBeNull();
    expect(res.modelSpend).toHaveLength(0);
    expect(res.costConscious).toHaveLength(0);
    expect(res.suggestions.map((suggestion) => suggestion.id)).not.toContain('included-pool-burn');
  });

  it('normalizes model names without losing spend', () => {
    const users = Array.from({ length: 5 }, (_, i) => user(i + 1, 10));
    const res = computeConsumptionPatterns(
      rows({
        users: users as never,
        modelFeatures: [
          ...users.map((row) => modelFeature(Number(row.userId), 'claude-opus-4.7-xhigh', 10)),
          ...users.map((row) => modelFeature(Number(row.userId), 'unmatched-preview-model', 10)),
        ] as never,
        bridges: users.map((row) => ({ userId: row.userId, teamId: BigInt(1), orgId: 'octo-org', day: '2026-06-18' })) as never,
        teams: [{ teamId: BigInt(1), orgId: 'octo-org', slug: 'platform' }] as never,
        credits: [credit('claude-opus-4.7', 100)] as never,
      }),
      'USD',
    );

    expect(normalizeModelKey('claude-opus-4.7-xhigh')).toBe('claude-opus-4.7');
    expect(res.headlines.billingAvailable).toBe(true);
    expect(res.costConscious[0]?.billedAmount).toBe(100);
  });

  it('uses org-wide fallback spend when billing and usage model names are disjoint', () => {
    const users = Array.from({ length: 5 }, (_, i) => user(i + 1, 10));
    const res = computeConsumptionPatterns(
      rows({
        users: users as never,
        modelFeatures: users.map((row) => modelFeature(Number(row.userId), 'unmatched-preview-model', 10)) as never,
        bridges: users.map((row) => ({ userId: row.userId, teamId: BigInt(1), orgId: 'octo-org', day: '2026-06-18' })) as never,
        teams: [{ teamId: BigInt(1), orgId: 'octo-org', slug: 'platform' }] as never,
        credits: [credit('claude-opus-4.7', 100)] as never,
      }),
      'USD',
    );

    expect(res.costConscious[0]?.billedAmount).toBe(100);
  });

  it('suppresses top cohort outputs until the represented cohort has at least five users', () => {
    const res = computeConsumptionPatterns(
      rows({ users: Array.from({ length: 10 }, (_, i) => user(i + 1, i === 0 ? 100 : 10)) as never }),
      'USD',
    );

    expect(res.headlines.top10InteractionShare).toBeNull();
    expect(res.headlines.top20InteractionShare).toBeNull();
    expect(res.concentration[0]?.percentile).toBe(50);
  });
});
