import { describe, expect, it } from 'vitest';
import { apiContract } from '../api/contract.js';
import {
  AdoptionResponseSchema,
  CodeGenResponseSchema,
  ConsumptionPatternsResponseSchema,
  CostResponseSchema,
  DeliveryResponseSchema,
  EngineeringHealthResponseSchema,
  HealthResponseSchema,
  IngestionRunsQuerySchema,
  IngestionRunsResponseSchema,
  KnobsBodySchema,
  MetricsQuerySchema,
  OrgsResponseSchema,
  OverviewResponseSchema,
  PrResponseSchema,
  SettingsResponseSchema,
  UnitEconomicsResponseSchema,
  UpdateKnobsErrorResponseSchema,
  UpdateKnobsResponseSchema,
} from '../api/index.js';

const day = '2026-06-18';
const knobs = {
  currency: 'USD',
  avgLoadedEngCostPerHour: 100,
  minPerAcceptedCompletion: 0.75,
  minPerChatRequest: 2,
  minPerAgentSession: 30,
  minSavedPerAuthoredPr: 60,
  minSavedPerReviewedPr: 15,
  locPerHourBaseline: 30,
  blend: { activity: 0, output: 0, delivery: 1 },
};

const ingestionRun = {
  runId: 'run-1',
  source: 'org_daily',
  targetDay: day,
  status: 'success',
  completedAt: '2026-06-19T04:00:00Z',
};

const fullIngestionRun = {
  ...ingestionRun,
  bronzePath: './data/bronze/org_daily/octo/2026-06-18.ndjson',
  errorMessage: null,
  attempts: 1,
  rowsWritten: 1,
  startedAt: '2026-06-19T03:59:00Z',
};

describe('apiContract', () => {
  it('defines every required route with the expected method and path', () => {
    expect(apiContract.health).toMatchObject({ method: 'GET', path: '/api/health' });
    expect(apiContract.orgs).toMatchObject({ method: 'GET', path: '/api/orgs' });
    expect(apiContract.overview).toMatchObject({ method: 'GET', path: '/api/metrics/overview' });
    expect(apiContract.adoption).toMatchObject({ method: 'GET', path: '/api/metrics/adoption' });
    expect(apiContract.codeGeneration).toMatchObject({ method: 'GET', path: '/api/metrics/code-generation' });
    expect(apiContract.pullRequests).toMatchObject({ method: 'GET', path: '/api/metrics/pull-requests' });
    expect(apiContract.cost).toMatchObject({ method: 'GET', path: '/api/metrics/cost' });
    expect(apiContract.unitEconomics).toMatchObject({ method: 'GET', path: '/api/metrics/unit-economics' });
    expect(apiContract.consumptionPatterns).toMatchObject({ method: 'GET', path: '/api/metrics/consumption-patterns' });
    expect(apiContract.delivery).toMatchObject({ method: 'GET', path: '/api/metrics/delivery' });
    expect(apiContract.engineeringHealth).toMatchObject({ method: 'GET', path: '/api/metrics/engineering-health' });
    expect(apiContract.settings).toMatchObject({ method: 'GET', path: '/api/settings' });
    expect(apiContract.settings).not.toHaveProperty('query');
    expect(apiContract.updateKnobs).toMatchObject({ method: 'PUT', path: '/api/settings/knobs' });
    expect(apiContract.updateKnobs).not.toHaveProperty('query');
    expect(apiContract.updateKnobs.responses).toHaveProperty('401');
    expect(apiContract.updateKnobs.responses).toHaveProperty('503');
    expect(apiContract.ingestionRuns).toMatchObject({ method: 'GET', path: '/api/ingestion/runs' });
  });

  it('parses common and ingestion query parameters', () => {
    expect(MetricsQuerySchema.parse({ orgId: 'octo-org', from: '2026-06-01', to: day }).orgId).toBe('octo-org');
    expect(IngestionRunsQuerySchema.parse({ orgId: 'octo-org', from: '2026-06-01', to: day, limit: '30' }).limit).toBe(30);
    expect(() => MetricsQuerySchema.parse({ orgId: '', from: '2026-06-01', to: day })).toThrow();
    expect(() => IngestionRunsQuerySchema.parse({ orgId: 'octo-org', from: 'bad', to: day })).toThrow();
  });

  it('accepts valid hand-constructed API responses', () => {
    expect(HealthResponseSchema.parse({ status: 'ok', schemaVersion: 1, liveness: 'ok', readiness: 'ok', checks: { db: 'ok' } }).status).toBe('ok');
    expect(HealthResponseSchema.parse({
      status: 'ok',
      schemaVersion: 1,
      liveness: 'ok',
      readiness: 'ok',
      checks: { db: 'ok' },
      lastSuccessfulIngestionCompletedAt: '2026-06-19T04:00:00.000Z',
      lastSuccessfulIngestionTargetDay: day,
      staleDataStatus: 'fresh',
      staleDataWarning: null,
      staleAfterHours: 26,
    }).staleDataStatus).toBe('fresh');
    expect(OrgsResponseSchema.parse({ orgs: [{ id: 'octo-org', displayName: 'Octo Org', firstSeenDay: day, lastSeenDay: day }] }).orgs).toHaveLength(1);
    expect(OrgsResponseSchema.parse({ orgs: [{ id: 'pending-org', displayName: 'Pending Org', firstSeenDay: null, lastSeenDay: null }] }).orgs[0]?.firstSeenDay).toBeNull();

    expect(
      OverviewResponseSchema.parse({
        headlines: { hoursSavedMtd: 10, dollarsSavedMtd: 1000, roiRatio: 2, netValue: 500, totalSpendMtd: 500, dollarPerMergedPr: 62.5, basis: { label: 'Delivery', blend: { activity: 0, output: 0, delivery: 1 } }, currency: 'USD' },
        sub: { activeUsers: 20, acceptanceRate: 0.4, prsByCopilot: 3 },
        dailySaved: [{ day, activity: 1, output: 2, delivery: 3 }],
        estimatorBreakdown: [{ estimator: 'delivery', hoursSaved: 3, dollarsSaved: 300 }],
        spendVsValue: [{ day, seatCost: 10, premiumSpend: 2, aiCreditSpend: 1, dollarsSavedBlended: 300 }],
      }),
    ).toBeDefined();

    expect(
      AdoptionResponseSchema.parse({
        headlines: { dau: 10, wau: 25, mau: 50, wauSeatRatio: 0.5, acceptanceRate: 0.3, agentAdoptionPct: 0.2 },
        dauWauTrend: [{ day, dau: 10, wau: 25 }],
        acceptanceRateTrend: [{ day, rate: 0.3 }],
        chatModeBreakdown: [{ day, ask: 1, edit: 2, plan: 3, agent: 4 }],
        topIdes: [{ ide: 'vscode', count: 10 }],
        topModels: [{ model: 'gpt-4o', count: 8 }],
        funnel: [{ stage: 'Active', count: 50 }],
      }),
    ).toBeDefined();

    expect(
      CodeGenResponseSchema.parse({
        headlines: { locAdded: 100, locDeleted: 20, locChanged: 120, acceptanceRate: 0.4, agentContributionPct: 0.25 },
        dailyLoc: [{ day, userInitiatedAdded: 70, userInitiatedDeleted: 10, agentInitiatedAdded: 30, agentInitiatedDeleted: 10 }],
        byLanguage: [{ language: 'typescript', loc: 100 }],
        byFeature: [{ feature: 'code_completion', loc: 80 }],
        byIde: [{ ide: 'vscode', loc: 100 }],
        byChatMode: [{ mode: 'ask', loc: 20 }],
        byModel: [{ model: 'gpt-4o', loc: 50 }],
      }),
    ).toBeDefined();

    expect(
      PrResponseSchema.parse({
        headlines: { totalCreated: 10, pctByCopilot: 0.2, totalMerged: 8, pctMergedByCopilot: 0.25, pctReviewedByCopilot: 0.3 },
        dailyMerged: [{ day, copilotAuthored: 2, copilotReviewed: 3, neither: 3 }],
        timeToMerge: [{ day, allMedian: 120, copilotAuthoredMedian: null }],
        suggestions: { totalSuggestions: 10, copilotSuggestions: 4, appliedSuggestions: 6, copilotAppliedSuggestions: 3 },
        authoredVsReviewedOverlap: { authoredOnly: 1, reviewedOnly: 2, both: 1 },
      }),
    ).toBeDefined();

    expect(
      CostResponseSchema.parse({
        headlines: {
          totalSpendMtd: 1000,
          seatCostMtd: 900,
          premiumSpendMtd: 75,
          aiCreditSpendMtd: 25,
          dollarPerActiveUser: 20,
          currency: 'USD',
        },
        dailyStacked: [{ day, seat: 30, premium: 2, aiCredits: 1 }],
        byModel: [{ model: 'gpt-4o', amount: 10 }],
        costPerChatRequest: [{ day, costPerRequest: 0.05 }],
        includedBurndown: [{ day, included: 100, billed: 5 }],
        forecast: [{ day, projected: 1200 }],
      }),
    ).toBeDefined();

    expect(
      UnitEconomicsResponseSchema.parse({
        currency: 'USD',
        metrics: [
          {
            metricKey: 'dollar-per-merged-pr',
            label: '$ / merged PR',
            value: null,
            currency: 'USD',
            numerator: 1000,
            denominator: 0,
            dateRange: { from: day, to: day },
            sourceTables: ['fact_billing_daily'],
            formula: 'Total spend ÷ merged PRs',
            series: [{ day, value: null }],
          },
        ],
        overTime: [{ day, dollarPerMergedPr: null, dollarPerActiveUser: 20, dollarPer1kLoc: null, dollarPerCopilotPr: null }],
      }),
    ).toBeDefined();

    expect(
      ConsumptionPatternsResponseSchema.parse({
        headlines: {
          activeUsers: 20,
          top20InteractionShare: 0.7,
          top10InteractionShare: 0.5,
          topTeamInteractionShare: 0.4,
          premiumModelSpendShare: 0.25,
          costConsciousShare: 0.35,
          billingAvailable: true,
          currency: 'USD',
        },
        concentration: [{ percentile: 20, cumulativeUsers: 0.2, cumulativeInteractions: 0.7, cumulativeLoc: 0.65 }],
        cohorts: [{
          cohort: 'Top 20%',
          userCount: 4,
          activeUserShare: 0.2,
          interactionShare: 0.7,
          locShare: 0.65,
          chatShare: 0.6,
          agentShare: 0.5,
          cliShare: 0.4,
        }],
        teams: [{
          teamId: '42',
          teamSlug: 'platform',
          activeUsers: 8,
          interactions: 100,
          locAdded: 500,
          agentUsers: 3,
          cliRequests: 20,
          interactionShare: 0.5,
          locShare: 0.45,
          suppressed: false,
        }],
        modelSpend: [{ model: 'gpt-4o', billedAmount: 10, billedQuantity: 20, includedQuantity: 80, spendShare: 1 }],
        costConscious: [{ segment: 'platform', scope: 'team', score: 0.9, interactions: 100, billedAmount: 5, rationale: 'High activity with low billed spend.' }],
        suggestions: [{
          id: 'team-platform',
          title: 'Create a platform cost center',
          rationale: 'Platform drives 50% of interactions.',
          confidence: 'high',
          suggestedCostCenter: 'platform',
          source: 'team',
          supportingMetric: 0.5,
        }],
      }),
    ).toBeDefined();

    expect(
      ConsumptionPatternsResponseSchema.parse({
        headlines: {
          activeUsers: 3,
          top20InteractionShare: null,
          top10InteractionShare: null,
          topTeamInteractionShare: null,
          premiumModelSpendShare: null,
          costConsciousShare: null,
          billingAvailable: false,
          currency: 'USD',
        },
        concentration: [],
        cohorts: [],
        teams: [],
        modelSpend: [],
        costConscious: [],
        suggestions: [],
      }),
    ).toBeDefined();

    expect(
      DeliveryResponseSchema.parse({
        headlines: {
          deploymentFrequency: 0.5,
          leadTimeMin: null,
          changeFailureRate: 0.1,
          mttrMin: null,
          commitsPerDay: 12,
        },
        trend: [{ day, deploymentFrequency: 1, leadTimeMin: 30, changeFailureRate: null, mttrMin: null }],
        releases: [{ day, count: 1 }],
        leadTimeDistribution: [{ day, p50: 30, p90: null }],
        perRepo: [{ repoId: '42', repoName: 'octo-repo', deploymentFrequency: 1, leadTimeMin: 30 }],
      }),
    ).toBeDefined();

    expect(
      EngineeringHealthResponseSchema.parse({
        headlines: {
          ciSuccessRate: 0.95,
          medianTimeToGreenSec: 120,
          prReworkRate: null,
          dependabotOpen: null,
          testStability: 0.98,
        },
        ciSuccessTrend: [{ day, rate: 0.95 }],
        failureBreakdown: [{ workflowName: 'CI', failureCount: 2 }],
        flakyTests: [{ workflowName: 'CI', rate: 0.02 }],
        prReviewDepth: [{ bucket: '0-1 comments', count: 5 }],
      }),
    ).toBeDefined();

    expect(KnobsBodySchema.parse(knobs).blend.delivery).toBe(1);
    expect(SettingsResponseSchema.parse({ knobs, lastIngestionRun: [ingestionRun], showRealLogins: false })).toBeDefined();
    expect(SettingsResponseSchema.parse({ knobs, lastIngestionRun: [{ ...ingestionRun, targetDay: null }], showRealLogins: false })).toBeDefined();
    expect(UpdateKnobsResponseSchema.parse({ ok: true, savedAt: '2026-06-19T09:00:00Z', recompute: { status: 'not_started', message: 'Run gold rebuild.' } }).recompute.status).toBe('not_started');
    expect(UpdateKnobsErrorResponseSchema.parse({ ok: false, error: 'unavailable' }).ok).toBe(false);
    expect(IngestionRunsResponseSchema.parse({ runs: [fullIngestionRun] }).runs).toHaveLength(1);
  });

  it('rejects invalid API payloads', () => {
    expect(() => HealthResponseSchema.parse({ status: 'down', schemaVersion: 1, liveness: 'ok', readiness: 'ok', checks: { db: 'ok' } })).toThrow();
    expect(() => HealthResponseSchema.parse({ status: 'ok', schemaVersion: 1, liveness: 'ok', readiness: 'ok', checks: { db: 'ok' }, staleDataStatus: 'ancient' })).toThrow();
    expect(() => KnobsBodySchema.parse({ ...knobs, blend: { activity: 'bad', output: 0, delivery: 1 } })).toThrow();
    expect(() => PrResponseSchema.parse({ headlines: { totalCreated: 'ten' } })).toThrow();
    expect(() => SettingsResponseSchema.parse({ knobs, lastIngestionRun: [{ ...ingestionRun, completedAt: 123 }], showRealLogins: false })).toThrow();
    expect(() => UpdateKnobsResponseSchema.parse({ ok: true, recomputeStartedAt: '2026-06-19T09:00:00Z' })).toThrow();
  });
});
