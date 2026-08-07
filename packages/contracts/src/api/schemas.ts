import { z } from 'zod';

export const DateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export type DateString = z.infer<typeof DateStringSchema>;

export const MetricsQuerySchema = z.object({
  orgId: z.string().min(1),
  from: DateStringSchema,
  to: DateStringSchema,
});
export type MetricsQuery = z.infer<typeof MetricsQuerySchema>;

export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  schemaVersion: z.number(),
  liveness: z.literal('ok'),
  readiness: z.enum(['ok', 'degraded']),
  checks: z.object({
    db: z.enum(['ok', 'unconfigured', 'error']),
  }),
  lastSuccessfulIngestionCompletedAt: z.string().datetime().nullable().optional(),
  lastSuccessfulIngestionTargetDay: DateStringSchema.nullable().optional(),
  staleDataStatus: z.enum(['fresh', 'stale', 'unknown']).optional(),
  staleDataWarning: z.string().nullable().optional(),
  staleAfterHours: z.number().nullable().optional(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const OrgRowSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  firstSeenDay: DateStringSchema.nullable(),
  lastSeenDay: DateStringSchema.nullable(),
});
export type OrgRow = z.infer<typeof OrgRowSchema>;

export const OrgsResponseSchema = z.object({
  orgs: z.array(OrgRowSchema),
});
export type OrgsResponse = z.infer<typeof OrgsResponseSchema>;

export const OverviewResponseSchema = z.object({
  headlines: z.object({
    hoursSavedMtd: z.number(),
    dollarsSavedMtd: z.number(),
    roiRatio: z.number(),
    netValue: z.number(),
    totalSpendMtd: z.number(),
    dollarPerMergedPr: z.number().nullable(),
    basis: z.object({
      label: z.string(),
      blend: z.object({ activity: z.number(), output: z.number(), delivery: z.number() }),
    }),
    currency: z.string(),
  }),
  sub: z.object({
    activeUsers: z.number(),
    acceptanceRate: z.number(),
    prsByCopilot: z.number(),
  }),
  dailySaved: z.array(z.object({
    day: DateStringSchema,
    activity: z.number(),
    output: z.number(),
    delivery: z.number(),
  })),
  estimatorBreakdown: z.array(z.object({
    estimator: z.string(),
    hoursSaved: z.number(),
    dollarsSaved: z.number(),
  })),
  spendVsValue: z.array(z.object({
    day: DateStringSchema,
    seatCost: z.number(),
    premiumSpend: z.number(),
    aiCreditSpend: z.number(),
    dollarsSavedBlended: z.number(),
  })),
  weekOverWeekDeltas: z.object({
    activeUsersDelta: z.number(),
    acceptanceRateDelta: z.number(),
    dollarsSavedDelta: z.number(),
    prsByCopilotDelta: z.number(),
  }).optional(),
});
export type OverviewResponse = z.infer<typeof OverviewResponseSchema>;

export const AdoptionResponseSchema = z.object({
  headlines: z.object({
    dau: z.number(),
    wau: z.number(),
    mau: z.number(),
    wauSeatRatio: z.number(),
    acceptanceRate: z.number(),
    agentAdoptionPct: z.number(),
  }),
  dauWauTrend: z.array(z.object({ day: DateStringSchema, dau: z.number(), wau: z.number() })),
  acceptanceRateTrend: z.array(z.object({ day: DateStringSchema, rate: z.number() })),
  chatModeBreakdown: z.array(z.object({
    day: DateStringSchema,
    ask: z.number(),
    edit: z.number(),
    plan: z.number(),
    agent: z.number(),
  })),
  topIdes: z.array(z.object({ ide: z.string(), count: z.number() })),
  topModels: z.array(z.object({ model: z.string(), count: z.number() })),
  funnel: z.array(z.object({ stage: z.string(), count: z.number() })),
});
export type AdoptionResponse = z.infer<typeof AdoptionResponseSchema>;

export const CodeGenResponseSchema = z.object({
  headlines: z.object({
    locAdded: z.number(),
    locDeleted: z.number(),
    locChanged: z.number(),
    acceptanceRate: z.number(),
    agentContributionPct: z.number(),
  }),
  dailyLoc: z.array(z.object({
    day: DateStringSchema,
    userInitiatedAdded: z.number(),
    userInitiatedDeleted: z.number(),
    agentInitiatedAdded: z.number(),
    agentInitiatedDeleted: z.number(),
  })),
  byLanguage: z.array(z.object({ language: z.string(), loc: z.number() })),
  byFeature: z.array(z.object({ feature: z.string(), loc: z.number() })),
  byIde: z.array(z.object({ ide: z.string(), loc: z.number() })),
  byChatMode: z.array(z.object({ mode: z.string(), loc: z.number() })),
  byModel: z.array(z.object({ model: z.string(), loc: z.number() })),
});
export type CodeGenResponse = z.infer<typeof CodeGenResponseSchema>;

export const PrResponseSchema = z.object({
  headlines: z.object({
    totalCreated: z.number(),
    pctByCopilot: z.number(),
    totalMerged: z.number(),
    pctMergedByCopilot: z.number(),
    pctReviewedByCopilot: z.number(),
  }),
  priorPeriodHeadlines: z.object({
    totalCreated: z.number(),
    pctByCopilot: z.number(),
    totalMerged: z.number(),
    pctMergedByCopilot: z.number(),
    pctReviewedByCopilot: z.number(),
  }).optional(),
  dailyMerged: z.array(z.object({
    day: DateStringSchema,
    copilotAuthored: z.number(),
    copilotReviewed: z.number(),
    neither: z.number(),
  })),
  timeToMerge: z.array(z.object({
    day: DateStringSchema,
    allMedian: z.number().nullable(),
    copilotAuthoredMedian: z.number().nullable(),
  })),
  suggestions: z.object({
    totalSuggestions: z.number(),
    copilotSuggestions: z.number(),
    appliedSuggestions: z.number(),
    copilotAppliedSuggestions: z.number(),
  }),
  authoredVsReviewedOverlap: z.object({
    authoredOnly: z.number(),
    reviewedOnly: z.number(),
    both: z.number(),
  }),
});
export type PrResponse = z.infer<typeof PrResponseSchema>;

export const CostResponseSchema = z.object({
  headlines: z.object({
    totalSpendMtd: z.number(),
    seatCostMtd: z.number(),
    premiumSpendMtd: z.number(),
    aiCreditSpendMtd: z.number(),
    dollarPerActiveUser: z.number().nullable(),
    currency: z.string(),
  }),
  dailyStacked: z.array(z.object({ day: DateStringSchema, seat: z.number(), premium: z.number(), aiCredits: z.number(), anomaly: z.boolean().optional() })),
  byModel: z.array(z.object({ model: z.string(), amount: z.number() })),
  costPerChatRequest: z.array(z.object({ day: DateStringSchema, costPerRequest: z.number() })),
  includedBurndown: z.array(z.object({ day: DateStringSchema, included: z.number(), billed: z.number() })),
  forecast: z.array(z.object({ day: DateStringSchema, projected: z.number() })),
});
export type CostResponse = z.infer<typeof CostResponseSchema>;

export const UnitEconomicMetricSchema = z.object({
  metricKey: z.string(),
  label: z.string(),
  value: z.number().nullable(),
  currency: z.string(),
  numerator: z.number(),
  denominator: z.number(),
  dateRange: z.object({ from: DateStringSchema, to: DateStringSchema }),
  sourceTables: z.array(z.string()),
  formula: z.string(),
  series: z.array(z.object({ day: DateStringSchema, value: z.number().nullable() })),
});
export type UnitEconomicMetric = z.infer<typeof UnitEconomicMetricSchema>;

export const UnitEconomicsResponseSchema = z.object({
  currency: z.string(),
  metrics: z.array(UnitEconomicMetricSchema),
  overTime: z.array(z.object({
    day: DateStringSchema,
    dollarPerMergedPr: z.number().nullable(),
    dollarPerActiveUser: z.number().nullable(),
    dollarPer1kLoc: z.number().nullable(),
    dollarPerCopilotPr: z.number().nullable(),
  })),
});
export type UnitEconomicsResponse = z.infer<typeof UnitEconomicsResponseSchema>;

export const ConsumptionCohortSchema = z.object({
  cohort: z.string(),
  userCount: z.number(),
  activeUserShare: z.number(),
  interactionShare: z.number(),
  locShare: z.number(),
  chatShare: z.number(),
  agentShare: z.number(),
  cliShare: z.number(),
});
export type ConsumptionCohort = z.infer<typeof ConsumptionCohortSchema>;

export const ConsumptionSuggestionSchema = z.object({
  id: z.string(),
  title: z.string(),
  rationale: z.string(),
  confidence: z.enum(['low', 'medium', 'high']),
  suggestedCostCenter: z.string(),
  source: z.enum(['team', 'cohort', 'model', 'org']),
  supportingMetric: z.number(),
});
export type ConsumptionSuggestion = z.infer<typeof ConsumptionSuggestionSchema>;

export const ConsumptionPatternsResponseSchema = z.object({
  headlines: z.object({
    activeUsers: z.number(),
    top20InteractionShare: z.number().nullable(),
    top10InteractionShare: z.number().nullable(),
    topTeamInteractionShare: z.number().nullable(),
    premiumModelSpendShare: z.number().nullable(),
    costConsciousShare: z.number().nullable(),
    billingAvailable: z.boolean(),
    currency: z.string(),
  }),
  concentration: z.array(z.object({
    percentile: z.number(),
    cumulativeUsers: z.number(),
    cumulativeInteractions: z.number(),
    cumulativeLoc: z.number(),
  })),
  cohorts: z.array(ConsumptionCohortSchema),
  teams: z.array(z.object({
    teamId: z.string(),
    teamSlug: z.string(),
    activeUsers: z.number(),
    interactions: z.number(),
    locAdded: z.number(),
    agentUsers: z.number(),
    cliRequests: z.number(),
    interactionShare: z.number(),
    locShare: z.number(),
    suppressed: z.boolean(),
  })),
  modelSpend: z.array(z.object({
    model: z.string(),
    billedAmount: z.number(),
    billedQuantity: z.number(),
    includedQuantity: z.number(),
    spendShare: z.number(),
  })),
  costConscious: z.array(z.object({
    segment: z.string(),
    scope: z.enum(['team', 'cohort', 'org']),
    score: z.number(),
    interactions: z.number(),
    billedAmount: z.number(),
    rationale: z.string(),
  })),
  suggestions: z.array(ConsumptionSuggestionSchema),
});
export type ConsumptionPatternsResponse = z.infer<typeof ConsumptionPatternsResponseSchema>;




export const DeliveryResponseSchema = z.object({
  headlines: z.object({
    deploymentFrequency: z.number().nullable(),
    leadTimeMin: z.number().nullable(),
    changeFailureRate: z.number().nullable(),
    mttrMin: z.number().nullable(),
    commitsPerDay: z.number(),
  }),
  trend: z.array(z.object({
    day: DateStringSchema,
    deploymentFrequency: z.number().nullable(),
    leadTimeMin: z.number().nullable(),
    changeFailureRate: z.number().nullable(),
    mttrMin: z.number().nullable(),
  })),
  releases: z.array(z.object({ day: DateStringSchema, count: z.number() })),
  leadTimeDistribution: z.array(z.object({ day: DateStringSchema, p50: z.number().nullable(), p90: z.number().nullable() })),
  perRepo: z.array(z.object({
    repoId: z.string(),
    repoName: z.string(),
    deploymentFrequency: z.number().nullable(),
    leadTimeMin: z.number().nullable(),
  })),
});
export type DeliveryResponse = z.infer<typeof DeliveryResponseSchema>;

export const EngineeringHealthResponseSchema = z.object({
  headlines: z.object({
    ciSuccessRate: z.number().nullable(),
    medianTimeToGreenSec: z.number().nullable(),
    prReworkRate: z.number().nullable(),
    dependabotOpen: z.number().nullable(),
    testStability: z.number().nullable(),
  }),
  ciSuccessTrend: z.array(z.object({ day: DateStringSchema, rate: z.number().nullable() })),
  failureBreakdown: z.array(z.object({ workflowName: z.string(), failureCount: z.number() })),
  flakyTests: z.array(z.object({ workflowName: z.string(), rate: z.number() })).max(10),
  prReviewDepth: z.array(z.object({ bucket: z.string(), count: z.number() })),
});
export type EngineeringHealthResponse = z.infer<typeof EngineeringHealthResponseSchema>;

export const KnobsBodySchema = z.object({
  currency: z.string(),
  avgLoadedEngCostPerHour: z.number(),
  minPerAcceptedCompletion: z.number(),
  minPerChatRequest: z.number(),
  minPerAgentSession: z.number(),
  minSavedPerAuthoredPr: z.number(),
  minSavedPerReviewedPr: z.number(),
  locPerHourBaseline: z.number(),
  blend: z.object({
    activity: z.number(),
    output: z.number(),
    delivery: z.number(),
  }),
});
export type KnobsBody = z.infer<typeof KnobsBodySchema>;

export const IngestionRunRowSchema = z.object({
  runId: z.string(),
  source: z.string(),
  targetDay: DateStringSchema.nullable(),
  status: z.string(),
  completedAt: z.string().nullable(),
  bronzePath: z.string().nullable(),
  errorMessage: z.string().nullable(),
  attempts: z.number(),
  rowsWritten: z.number(),
  startedAt: z.string(),
});
export type IngestionRunRow = z.infer<typeof IngestionRunRowSchema>;

export const SettingsResponseSchema = z.object({
  knobs: KnobsBodySchema,
  lastIngestionRun: z.array(IngestionRunRowSchema.omit({
    bronzePath: true,
    errorMessage: true,
    attempts: true,
    rowsWritten: true,
    startedAt: true,
  })),
  showRealLogins: z.boolean(),
});
export type SettingsResponse = z.infer<typeof SettingsResponseSchema>;

export const UpdateKnobsResponseSchema = z.object({
  ok: z.literal(true),
  savedAt: z.string(),
  recompute: z.object({
    status: z.literal('not_started'),
    message: z.string(),
  }),
});
export type UpdateKnobsResponse = z.infer<typeof UpdateKnobsResponseSchema>;

export const UpdateKnobsErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
});
export type UpdateKnobsErrorResponse = z.infer<typeof UpdateKnobsErrorResponseSchema>;

export const IngestionRunsQuerySchema = MetricsQuerySchema.extend({
  limit: z.coerce.number().int().positive().optional(),
});
export type IngestionRunsQuery = z.infer<typeof IngestionRunsQuerySchema>;

export const IngestionRunsResponseSchema = z.object({
  runs: z.array(IngestionRunRowSchema),
});
export type IngestionRunsResponse = z.infer<typeof IngestionRunsResponseSchema>;
