import { and, eq, gte, inArray, lte } from 'drizzle-orm';
import {
  bridgeUserTeam,
  db,
  dimTeam,
  factAiCreditsDaily,
  factUserDaily,
  factUserDailyByModelFeature,
} from '@ghcp-dash/db';
import type { ConsumptionPatternsResponse } from '@ghcp-dash/contracts';
import type { DateRange } from '@/lib/date-range';
import { getKnobs, n, safeDiv, safeQuery } from './common';

const PRIVACY_THRESHOLD = 5;

type UserRow = typeof factUserDaily.$inferSelect;
type ModelFeatureRow = typeof factUserDailyByModelFeature.$inferSelect;
type BridgeRow = typeof bridgeUserTeam.$inferSelect;
type TeamRow = typeof dimTeam.$inferSelect;
type CreditRow = typeof factAiCreditsDaily.$inferSelect;

interface UserAggregate {
  userId: string;
  activeDays: Set<string>;
  interactions: number;
  locAdded: number;
  accepted: number;
  generated: number;
  chatInteractions: number;
  agentDays: number;
  cliRequests: number;
  cliPromptTokens: number;
  cliOutputTokens: number;
  usedAgent: boolean;
  usedCli: boolean;
}

interface TeamAggregate {
  teamId: string;
  teamSlug: string;
  userIds: Set<string>;
  interactions: number;
  locAdded: number;
  agentUsers: Set<string>;
  cliRequests: number;
  estimatedBilledAmount: number;
}

interface ConsumptionRows {
  users: UserRow[];
  modelFeatures: ModelFeatureRow[];
  bridges: BridgeRow[];
  teams: TeamRow[];
  credits: CreditRow[];
}

const emptyConsumption = (currency = 'USD'): ConsumptionPatternsResponse => ({
  headlines: {
    activeUsers: 0,
    top20InteractionShare: null,
    top10InteractionShare: null,
    topTeamInteractionShare: null,
    premiumModelSpendShare: null,
    costConsciousShare: null,
    billingAvailable: false,
    currency,
  },
  concentration: [],
  cohorts: [],
  teams: [],
  modelSpend: [],
  costConscious: [],
  suggestions: [],
});

function consumptionUnits(row: Pick<UserRow, 'userInitiatedInteractionCount' | 'codeGenerationActivityCount' | 'cliRequestCount'>) {
  return row.userInitiatedInteractionCount + row.codeGenerationActivityCount + row.cliRequestCount;
}

function aggregateUsers(users: UserRow[]): UserAggregate[] {
  const aggregates = new Map<string, UserAggregate>();
  for (const row of users) {
    const userId = row.userId.toString();
    const aggregate = aggregates.get(userId) ?? {
      userId,
      activeDays: new Set<string>(),
      interactions: 0,
      locAdded: 0,
      accepted: 0,
      generated: 0,
      chatInteractions: 0,
      agentDays: 0,
      cliRequests: 0,
      cliPromptTokens: 0,
      cliOutputTokens: 0,
      usedAgent: false,
      usedCli: false,
    };
    aggregate.activeDays.add(String(row.day));
    aggregate.interactions += consumptionUnits(row);
    aggregate.locAdded += n(row.locAddedSum);
    aggregate.accepted += row.codeAcceptanceActivityCount;
    aggregate.generated += row.codeGenerationActivityCount;
    aggregate.chatInteractions += row.userInitiatedInteractionCount;
    aggregate.cliRequests += row.cliRequestCount;
    aggregate.cliPromptTokens += n(row.cliPromptTokensSum);
    aggregate.cliOutputTokens += n(row.cliOutputTokensSum);
    if (row.usedAgent) {
      aggregate.agentDays += 1;
      aggregate.usedAgent = true;
    }
    if (row.usedCli || row.cliRequestCount > 0) aggregate.usedCli = true;
    aggregates.set(userId, aggregate);
  }
  return [...aggregates.values()];
}

function sumUsers(users: UserAggregate[]) {
  return users.reduce(
    (sum, user) => ({
      interactions: sum.interactions + user.interactions,
      locAdded: sum.locAdded + user.locAdded,
      chatInteractions: sum.chatInteractions + user.chatInteractions,
      agentDays: sum.agentDays + user.agentDays,
      cliRequests: sum.cliRequests + user.cliRequests,
    }),
    { interactions: 0, locAdded: 0, chatInteractions: 0, agentDays: 0, cliRequests: 0 },
  );
}

function cohort(name: string, users: UserAggregate[], totals: ReturnType<typeof sumUsers>, activeUserCount: number) {
  const sum = sumUsers(users);
  return {
    cohort: name,
    userCount: users.length,
    activeUserShare: safeDiv(users.length, activeUserCount),
    interactionShare: safeDiv(sum.interactions, totals.interactions),
    locShare: safeDiv(sum.locAdded, totals.locAdded),
    chatShare: safeDiv(sum.chatInteractions, totals.chatInteractions),
    agentShare: safeDiv(sum.agentDays, totals.agentDays),
    cliShare: safeDiv(sum.cliRequests, totals.cliRequests),
  };
}

function buildCohorts(ranked: UserAggregate[], totals: ReturnType<typeof sumUsers>) {
  const activeUserCount = ranked.length;
  if (activeUserCount === 0) return [];
  const top10 = Math.max(1, Math.ceil(activeUserCount * 0.1));
  const top20 = Math.max(top10 + 1, Math.ceil(activeUserCount * 0.2));
  const middleEnd = Math.max(top20, Math.ceil(activeUserCount * 0.5));
  const rows: ReturnType<typeof cohort>[] = [];
  const pushCohort = (name: string, users: UserAggregate[]) => {
    if (users.length >= PRIVACY_THRESHOLD) rows.push(cohort(name, users, totals, activeUserCount));
  };

  if (top10 >= PRIVACY_THRESHOLD) {
    pushCohort('Top 10%', ranked.slice(0, top10));
    pushCohort('Next 10%', ranked.slice(top10, top20));
  } else {
    pushCohort('Top 20%', ranked.slice(0, top20));
  }
  pushCohort('Middle 30%', ranked.slice(top20, middleEnd));
  pushCohort('Long tail 50%', ranked.slice(middleEnd));
  return rows;
}

function buildConcentration(ranked: UserAggregate[], totals: ReturnType<typeof sumUsers>) {
  if (ranked.length === 0) return [];
  return Array.from({ length: 10 }, (_, i) => {
    const percentile = (i + 1) * 10;
    const count = Math.max(1, Math.ceil(ranked.length * (percentile / 100)));
    const users = ranked.slice(0, count);
    const sum = sumUsers(users);
    return count >= PRIVACY_THRESHOLD ? {
      percentile,
      cumulativeUsers: safeDiv(count, ranked.length),
      cumulativeInteractions: safeDiv(sum.interactions, totals.interactions),
      cumulativeLoc: safeDiv(sum.locAdded, totals.locAdded),
    } : null;
  }).filter((row): row is NonNullable<typeof row> => row != null);
}

export function isCostEffectiveModel(model: string) {
  return /(^|[-_ ])(mini|small|nano)([-_ ]|$)/i.test(model);
}

export function normalizeModelKey(model: string) {
  return model
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/-(low|medium|high|xhigh|max)$/i, '');
}

function groupModelSpend(credits: CreditRow[]) {
  const byModel = new Map<string, { model: string; billedAmount: number; billedQuantity: number; includedQuantity: number }>();
  for (const row of credits) {
    const current = byModel.get(row.model) ?? { model: row.model, billedAmount: 0, billedQuantity: 0, includedQuantity: 0 };
    current.billedAmount += n(row.billedAmount);
    current.billedQuantity += n(row.billedQuantity);
    current.includedQuantity += n(row.includedQuantity);
    byModel.set(row.model, current);
  }

  const totalSpend = [...byModel.values()].reduce((sum, row) => sum + row.billedAmount, 0);
  return [...byModel.values()]
    .map((row) => ({ ...row, spendShare: safeDiv(row.billedAmount, totalSpend) }))
    .sort((a, b) => b.billedAmount - a.billedAmount);
}

function modelUnitCosts(modelSpend: ReturnType<typeof groupModelSpend>, modelRows: ModelFeatureRow[]) {
  const spend = new Map<string, number>();
  const interactions = new Map<string, number>();
  for (const row of modelRows) {
    const key = normalizeModelKey(row.model);
    interactions.set(key, (interactions.get(key) ?? 0) + row.userInitiatedInteractionCount + row.codeGenerationActivityCount);
  }
  for (const row of modelSpend) {
    const key = normalizeModelKey(row.model);
    spend.set(key, (spend.get(key) ?? 0) + row.billedAmount);
  }
  const totalSpend = [...spend.values()].reduce((sum, value) => sum + value, 0);
  const matchedSpend = [...spend].reduce((sum, [key, billedAmount]) => (interactions.has(key) ? sum + billedAmount : sum), 0);
  const unmatchedInteractions = [...interactions].reduce((sum, [key, interactionCount]) => (spend.has(key) ? sum : sum + interactionCount), 0);
  const fallbackUnitCost = safeDiv(Math.max(totalSpend - matchedSpend, 0), unmatchedInteractions);
  const unitCosts = new Map<string, number>();
  for (const [key, billedAmount] of spend) {
    const interactionCount = interactions.get(key) ?? 0;
    unitCosts.set(key, interactionCount > 0 ? safeDiv(billedAmount, interactionCount) : fallbackUnitCost);
  }
  return { unitCosts, fallbackUnitCost };
}

function estimateUserModelSpend(modelRows: ModelFeatureRow[], costs: ReturnType<typeof modelUnitCosts>) {
  const spendByUserDay = new Map<string, number>();
  for (const row of modelRows) {
    const key = `${row.userId.toString()}:${String(row.day)}`;
    const interactions = row.userInitiatedInteractionCount + row.codeGenerationActivityCount;
    const unitCost = costs.unitCosts.get(normalizeModelKey(row.model)) ?? costs.fallbackUnitCost;
    spendByUserDay.set(key, (spendByUserDay.get(key) ?? 0) + interactions * unitCost);
  }
  return spendByUserDay;
}

function buildTeams(rows: ConsumptionRows, totalInteractions: number, totalLoc: number, modelSpendRows: ReturnType<typeof groupModelSpend>) {
  const teamById = new Map(rows.teams.map((team) => [team.teamId.toString(), team.slug ?? `team-${team.teamId.toString()}`]));
  const userDay = new Map(rows.users.map((row) => [`${row.userId.toString()}:${String(row.day)}`, row]));
  const spendByUserDay = estimateUserModelSpend(rows.modelFeatures, modelUnitCosts(modelSpendRows, rows.modelFeatures));
  const aggregates = new Map<string, TeamAggregate>();

  for (const bridge of rows.bridges) {
    const teamId = bridge.teamId.toString();
    const userId = bridge.userId.toString();
    const day = String(bridge.day);
    const fact = userDay.get(`${userId}:${day}`);
    if (!fact) continue;
    const aggregate = aggregates.get(teamId) ?? {
      teamId,
      teamSlug: teamById.get(teamId) ?? `team-${teamId}`,
      userIds: new Set<string>(),
      interactions: 0,
      locAdded: 0,
      agentUsers: new Set<string>(),
      cliRequests: 0,
      estimatedBilledAmount: 0,
    };
    aggregate.userIds.add(userId);
    aggregate.interactions += consumptionUnits(fact);
    aggregate.locAdded += n(fact.locAddedSum);
    aggregate.cliRequests += fact.cliRequestCount;
    aggregate.estimatedBilledAmount += spendByUserDay.get(`${userId}:${day}`) ?? 0;
    if (fact.usedAgent) aggregate.agentUsers.add(userId);
    aggregates.set(teamId, aggregate);
  }

  return [...aggregates.values()]
    .filter((team) => team.userIds.size >= PRIVACY_THRESHOLD)
    .map((team) => ({
      teamId: team.teamId,
      teamSlug: team.teamSlug,
      activeUsers: team.userIds.size,
      interactions: team.interactions,
      locAdded: team.locAdded,
      agentUsers: team.agentUsers.size,
      cliRequests: team.cliRequests,
      interactionShare: safeDiv(team.interactions, totalInteractions),
      locShare: safeDiv(team.locAdded, totalLoc),
      suppressed: false,
      estimatedBilledAmount: team.estimatedBilledAmount,
    }))
    .sort((a, b) => b.interactions - a.interactions);
}

function buildSuggestions(
  top20Share: number | null,
  topTeam: { teamSlug: string; interactionShare: number } | undefined,
  premiumShare: number | null,
  costConsciousShare: number | null,
): ConsumptionPatternsResponse['suggestions'] {
  const suggestions: ConsumptionPatternsResponse['suggestions'] = [];
  if (top20Share != null && top20Share >= 0.6) {
    suggestions.push({
      id: 'power-user-cohort',
      title: 'Create a power-user enablement cost center',
      rationale: `The top 20% cohort drives ${(top20Share * 100).toFixed(0)}% of consumption. Budgeting this cohort separately makes premium demand easier to explain.`,
      confidence: top20Share >= 0.75 ? 'high' : 'medium',
      suggestedCostCenter: 'copilot-power-users',
      source: 'cohort',
      supportingMetric: top20Share,
    });
  }
  if (topTeam && topTeam.interactionShare >= 0.3) {
    suggestions.push({
      id: `team-${topTeam.teamSlug}`,
      title: `Consider a ${topTeam.teamSlug} cost center`,
      rationale: `${topTeam.teamSlug} drives ${(topTeam.interactionShare * 100).toFixed(0)}% of measured consumption across teams above the privacy threshold.`,
      confidence: topTeam.interactionShare >= 0.45 ? 'high' : 'medium',
      suggestedCostCenter: topTeam.teamSlug,
      source: 'team',
      supportingMetric: topTeam.interactionShare,
    });
  }
  if (premiumShare != null && premiumShare >= 0.5) {
    suggestions.push({
      id: 'premium-models',
      title: 'Separate premium model spend',
      rationale: `Premium/non-mini models account for ${(premiumShare * 100).toFixed(0)}% of billed AI-credit spend.`,
      confidence: premiumShare >= 0.7 ? 'high' : 'medium',
      suggestedCostCenter: 'copilot-premium-models',
      source: 'model',
      supportingMetric: premiumShare,
    });
  }
  if (costConsciousShare != null && costConsciousShare < 0.6) {
    suggestions.push({
      id: 'included-pool-burn',
      title: 'Track billed overage separately',
      rationale: `Only ${(costConsciousShare * 100).toFixed(0)}% of model quantity is covered by included credits in this window.`,
      confidence: 'medium',
      suggestedCostCenter: 'copilot-metered-overage',
      source: 'org',
      supportingMetric: costConsciousShare,
    });
  }
  return suggestions;
}

export function computeConsumptionPatterns(rows: ConsumptionRows, currency: string): ConsumptionPatternsResponse {
  const users = aggregateUsers(rows.users);
  const ranked = [...users].sort((a, b) => b.interactions - a.interactions);
  const totals = sumUsers(ranked);
  const activeUsers = ranked.length;
  const top10Count = activeUsers ? Math.max(1, Math.ceil(activeUsers * 0.1)) : 0;
  const top20Count = activeUsers ? Math.max(1, Math.ceil(activeUsers * 0.2)) : 0;
  const top10Share = top10Count >= PRIVACY_THRESHOLD ? safeDiv(sumUsers(ranked.slice(0, top10Count)).interactions, totals.interactions) : null;
  const top20Share = top20Count >= PRIVACY_THRESHOLD ? safeDiv(sumUsers(ranked.slice(0, top20Count)).interactions, totals.interactions) : null;
  const modelSpend = groupModelSpend(rows.credits);
  const totalIncluded = modelSpend.reduce((sum, row) => sum + row.includedQuantity, 0);
  const totalBilledQuantity = modelSpend.reduce((sum, row) => sum + row.billedQuantity, 0);
  const totalBilledAmount = modelSpend.reduce((sum, row) => sum + row.billedAmount, 0);
  const billingAvailable = rows.credits.length > 0 && totalIncluded + totalBilledQuantity + totalBilledAmount > 0;
  const premiumModelSpend = modelSpend
    .filter((row) => !isCostEffectiveModel(row.model))
    .reduce((sum, row) => sum + row.billedAmount, 0);
  const premiumModelSpendShare = billingAvailable ? safeDiv(premiumModelSpend, totalBilledAmount) : null;
  const costConsciousShare = billingAvailable ? safeDiv(totalIncluded, totalIncluded + totalBilledQuantity) : null;
  const teamsWithSpend = buildTeams(rows, totals.interactions, totals.locAdded, modelSpend);
  const topTeam = teamsWithSpend.at(0);
  const maxTeamScore = Math.max(...teamsWithSpend.map((team) => safeDiv(team.interactions, team.estimatedBilledAmount + 1)), 1);
  const costConscious = billingAvailable && rows.modelFeatures.length > 0
    ? teamsWithSpend
      .map((team) => {
        const score = safeDiv(safeDiv(team.interactions, team.estimatedBilledAmount + 1), maxTeamScore);
        return {
          segment: team.teamSlug,
          scope: 'team' as const,
          score,
          interactions: team.interactions,
          billedAmount: Math.round(team.estimatedBilledAmount * 100) / 100,
          rationale: score >= 0.75 ? 'High consumption with relatively low estimated model overage.' : 'Consumption depends more heavily on billed model usage.',
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
    : [];

  return {
    headlines: {
      activeUsers,
      top20InteractionShare: top20Share,
      top10InteractionShare: top10Share,
      topTeamInteractionShare: topTeam ? topTeam.interactionShare : null,
      premiumModelSpendShare,
      costConsciousShare,
      billingAvailable,
      currency,
    },
    concentration: buildConcentration(ranked, totals),
    cohorts: buildCohorts(ranked, totals),
    teams: teamsWithSpend.map(({ estimatedBilledAmount, ...team }) => team),
    modelSpend: billingAvailable ? modelSpend : [],
    costConscious,
    suggestions: buildSuggestions(
      top20Share,
      topTeam ? { teamSlug: topTeam.teamSlug, interactionShare: topTeam.interactionShare } : undefined,
      premiumModelSpendShare,
      costConsciousShare,
    ),
  };
}

export async function queryConsumptionPatterns(orgId: string, range: DateRange): Promise<ConsumptionPatternsResponse> {
  const knobs = await getKnobs();
  return safeQuery(emptyConsumption(knobs.currency), async () => {
    const users = await db.select().from(factUserDaily).where(and(eq(factUserDaily.orgId, orgId), gte(factUserDaily.day, range.from), lte(factUserDaily.day, range.to)));
    const [modelFeatures, bridges, credits] = await Promise.all([
      db.select().from(factUserDailyByModelFeature).where(and(eq(factUserDailyByModelFeature.orgId, orgId), gte(factUserDailyByModelFeature.day, range.from), lte(factUserDailyByModelFeature.day, range.to))),
      db.select().from(bridgeUserTeam).where(and(eq(bridgeUserTeam.orgId, orgId), gte(bridgeUserTeam.day, range.from), lte(bridgeUserTeam.day, range.to))),
      db.select().from(factAiCreditsDaily).where(and(eq(factAiCreditsDaily.orgId, orgId), gte(factAiCreditsDaily.day, range.from), lte(factAiCreditsDaily.day, range.to))),
    ]);
    const teamIds = [...new Set(bridges.map((row) => row.teamId))];
    const teams = teamIds.length ? await db.select().from(dimTeam).where(inArray(dimTeam.teamId, teamIds)) : [];
    return computeConsumptionPatterns({ users, modelFeatures, bridges, teams, credits }, knobs.currency);
  });
}
