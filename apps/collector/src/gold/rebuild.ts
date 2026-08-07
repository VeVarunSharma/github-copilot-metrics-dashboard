import { and, eq, inArray } from 'drizzle-orm';
import {
  bridgeUserTeam,
  factAiCreditsDaily,
  factBillingDaily,
  factOrgDaily,
  factOrgDailyByFeature,
  factRoiDaily,
  factTeamValueDaily,
  factUserDaily,
  factValueDaily,
  settings,
  VALUE_TRANSLATION_KNOBS_KEY,
  type Database,
} from '@ghcp-dash/db';
import { classifyCopilotBillingSku, computeDailyValue, DEFAULT_KNOBS, snapshotKnobs, validateKnobs, type OrgDailyInputs, type SpendDailyInputs, type ValueKnobs } from '@ghcp-dash/value';

export interface GoldScope {
  orgId: string;
  day: string;
}

interface OrgFactRow { locAddedSum: unknown; prTotalMergedCreatedByCopilot: number; prTotalReviewedByCopilot: number; }
interface FeatureFactRow { feature: string; codeAcceptanceActivityCount: number; userInitiatedInteractionCount: number; }
interface UserFactRow { userId: bigint; usedAgent: boolean; codeAcceptanceActivityCount: number; userInitiatedInteractionCount: number; locAddedSum: unknown; }
interface BillingFactRow { sku: string; netAmount: unknown; }
interface CreditFactRow { billedAmount: unknown; }
interface BridgeRow { userId: bigint; teamId: bigint; }

function toNumber(value: unknown): number {
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return 0;
}

function normalizeKnobs(value: unknown): ValueKnobs {
  if (value === null || typeof value !== 'object') return DEFAULT_KNOBS;
  const record = value as Record<string, unknown>;
  const knobs: ValueKnobs = {
    currency: String(record.currency ?? DEFAULT_KNOBS.currency),
    avgLoadedEngCostPerHour: toNumber(record.avgLoadedEngCostPerHour ?? record.avg_loaded_eng_cost_per_hour ?? DEFAULT_KNOBS.avgLoadedEngCostPerHour),
    minPerAcceptedCompletion: toNumber(record.minPerAcceptedCompletion ?? record.min_per_accepted_completion ?? DEFAULT_KNOBS.minPerAcceptedCompletion),
    minPerChatRequest: toNumber(record.minPerChatRequest ?? record.min_per_chat_request ?? DEFAULT_KNOBS.minPerChatRequest),
    minPerAgentSession: toNumber(record.minPerAgentSession ?? record.min_per_agent_session ?? DEFAULT_KNOBS.minPerAgentSession),
    minSavedPerAuthoredPr: toNumber(record.minSavedPerAuthoredPr ?? record.min_saved_per_authored_pr ?? DEFAULT_KNOBS.minSavedPerAuthoredPr),
    minSavedPerReviewedPr: toNumber(record.minSavedPerReviewedPr ?? record.min_saved_per_reviewed_pr ?? DEFAULT_KNOBS.minSavedPerReviewedPr),
    locPerHourBaseline: toNumber(record.locPerHourBaseline ?? record.loc_per_hour_baseline ?? DEFAULT_KNOBS.locPerHourBaseline),
    blend: DEFAULT_KNOBS.blend,
  };
  const blend = record.blend;
  if (blend !== null && typeof blend === 'object') {
    const b = blend as Record<string, unknown>;
    knobs.blend = { activity: toNumber(b.activity), output: toNumber(b.output), delivery: toNumber(b.delivery) };
  }
  return knobs;
}

export function summarizeSpendInputs(billing: readonly BillingFactRow[], credits: readonly CreditFactRow[]): SpendDailyInputs {
  return {
    seatCost: billing
      .filter((row) => classifyCopilotBillingSku(row.sku) === 'seat')
      .reduce((sum, row) => sum + toNumber(row.netAmount), 0),
    premiumRequestSpend: billing
      .filter((row) => classifyCopilotBillingSku(row.sku) === 'premium-request')
      .reduce((sum, row) => sum + toNumber(row.netAmount), 0),
    aiCreditSpend: credits.reduce((sum, row) => sum + toNumber(row.billedAmount), 0),
  };
}

export async function readKnobs(database: Database): Promise<ValueKnobs> {
  const rows = await database.select().from(settings).where(eq(settings.key, VALUE_TRANSLATION_KNOBS_KEY));
  const knobs = rows[0] ? normalizeKnobs(rows[0].value) : DEFAULT_KNOBS;
  const validation = validateKnobs(knobs);
  if (!validation.ok) throw new Error(`Invalid value translation knobs: ${validation.errors.join('; ')}`);
  return knobs;
}

export async function discoverGoldScopes(database: Database): Promise<GoldScope[]> {
  const rows = await database.select({ orgId: factOrgDaily.orgId, day: factOrgDaily.day }).from(factOrgDaily);
  return rows;
}

export async function rebuildGold(database: Database, scopes?: GoldScope[]): Promise<number> {
  const knobs = await readKnobs(database);
  const scopeList = scopes ?? await discoverGoldScopes(database);
  let written = 0;
  for (const scope of scopeList) {
    written += await rebuildGoldForScope(database, scope, knobs);
  }
  return written;
}

async function rebuildGoldForScope(database: Database, scope: GoldScope, knobs: ValueKnobs): Promise<number> {
  const orgRows: OrgFactRow[] = await database.select().from(factOrgDaily).where(and(eq(factOrgDaily.orgId, scope.orgId), eq(factOrgDaily.day, scope.day)));
  const org = orgRows[0];
  if (!org) return 0;
  const features: FeatureFactRow[] = await database.select().from(factOrgDailyByFeature).where(and(eq(factOrgDailyByFeature.orgId, scope.orgId), eq(factOrgDailyByFeature.day, scope.day)));
  const users: UserFactRow[] = await database.select().from(factUserDaily).where(and(eq(factUserDaily.orgId, scope.orgId), eq(factUserDaily.day, scope.day)));
  const billing: BillingFactRow[] = await database.select().from(factBillingDaily).where(and(eq(factBillingDaily.orgId, scope.orgId), eq(factBillingDaily.day, scope.day)));
  const credits: CreditFactRow[] = await database.select().from(factAiCreditsDaily).where(and(eq(factAiCreditsDaily.orgId, scope.orgId), eq(factAiCreditsDaily.day, scope.day)));

  const inputs: OrgDailyInputs = {
    orgId: scope.orgId,
    day: scope.day,
    acceptedCompletions: features.filter((row) => row.feature === 'code_completion').reduce((sum, row) => sum + row.codeAcceptanceActivityCount, 0),
    chatRequests: features.filter((row) => ['chat', 'ask', 'edit', 'plan'].includes(row.feature)).reduce((sum, row) => sum + row.userInitiatedInteractionCount, 0),
    agentSessions: users.filter((row) => row.usedAgent).length,
    locAddedByCopilot: toNumber(org.locAddedSum),
    prMergedByCopilot: org.prTotalMergedCreatedByCopilot,
    prReviewedByCopilot: org.prTotalReviewedByCopilot,
  };
  const spend = summarizeSpendInputs(billing, credits);
  const computed = computeDailyValue(inputs, spend, knobs);
  const knobSnapshot = snapshotKnobs(knobs);

  await database.transaction(async (tx) => {
    const txDb = tx as unknown as Database;
    await txDb.delete(factValueDaily).where(and(eq(factValueDaily.orgId, scope.orgId), eq(factValueDaily.day, scope.day)));
    await txDb.delete(factRoiDaily).where(and(eq(factRoiDaily.orgId, scope.orgId), eq(factRoiDaily.day, scope.day)));
    await txDb.delete(factTeamValueDaily).where(and(eq(factTeamValueDaily.orgId, scope.orgId), eq(factTeamValueDaily.day, scope.day)));
    for (const estimate of Object.values(computed.estimators)) {
      await txDb.insert(factValueDaily).values({ orgId: scope.orgId, day: scope.day, estimator: estimate.estimator, hoursSaved: estimate.hoursSaved.toString(), dollarsSaved: estimate.dollarsSaved.toString(), knobSnapshot }).onConflictDoUpdate({ target: [factValueDaily.orgId, factValueDaily.day, factValueDaily.estimator], set: { hoursSaved: estimate.hoursSaved.toString(), dollarsSaved: estimate.dollarsSaved.toString(), knobSnapshot } });
    }
    await txDb.insert(factRoiDaily).values({ orgId: scope.orgId, day: scope.day, hoursSavedBlended: computed.roi.hoursSavedBlended.toString(), dollarsSavedBlended: computed.roi.dollarsSavedBlended.toString(), totalSpend: computed.roi.totalSpend.toString(), netValue: computed.roi.netValue.toString(), roiRatio: computed.roi.roiRatio.toString() }).onConflictDoUpdate({ target: [factRoiDaily.orgId, factRoiDaily.day], set: { hoursSavedBlended: computed.roi.hoursSavedBlended.toString(), dollarsSavedBlended: computed.roi.dollarsSavedBlended.toString(), totalSpend: computed.roi.totalSpend.toString(), netValue: computed.roi.netValue.toString(), roiRatio: computed.roi.roiRatio.toString() } });
  });

  await rebuildTeamGold(database, scope, knobs);
  return Object.values(computed.estimators).length + 1;
}

async function rebuildTeamGold(database: Database, scope: GoldScope, knobs: ValueKnobs): Promise<void> {
  const bridges: BridgeRow[] = await database.select().from(bridgeUserTeam).where(and(eq(bridgeUserTeam.orgId, scope.orgId), eq(bridgeUserTeam.day, scope.day)));
  const userIds = [...new Set(bridges.map((row) => row.userId))];
  if (userIds.length === 0) return;
  const users: UserFactRow[] = await database.select().from(factUserDaily).where(and(eq(factUserDaily.orgId, scope.orgId), eq(factUserDaily.day, scope.day), inArray(factUserDaily.userId, userIds)));
  const userById = new Map(users.map((user) => [user.userId.toString(), user]));
  const teamIds = [...new Set(bridges.map((row) => row.teamId.toString()))];
  await database.transaction(async (tx) => {
    const txDb = tx as unknown as Database;
    for (const teamIdText of teamIds) {
      const teamUsers = bridges.filter((bridge) => bridge.teamId.toString() === teamIdText).map((bridge) => userById.get(bridge.userId.toString())).filter((user): user is UserFactRow => user !== undefined);
      const inputs: OrgDailyInputs = {
        orgId: scope.orgId,
        day: scope.day,
        acceptedCompletions: teamUsers.reduce((sum, user) => sum + user.codeAcceptanceActivityCount, 0),
        chatRequests: teamUsers.reduce((sum, user) => sum + user.userInitiatedInteractionCount, 0),
        agentSessions: teamUsers.filter((user) => user.usedAgent).length,
        locAddedByCopilot: teamUsers.reduce((sum, user) => sum + toNumber(user.locAddedSum), 0),
        prMergedByCopilot: 0,
        prReviewedByCopilot: 0,
      };
      const computed = computeDailyValue(inputs, { seatCost: 0, premiumRequestSpend: 0, aiCreditSpend: 0 }, knobs);
      for (const estimate of Object.values(computed.estimators)) {
        const values = { teamId: BigInt(teamIdText), orgId: scope.orgId, day: scope.day, estimator: estimate.estimator, hoursSaved: estimate.hoursSaved.toString(), dollarsSaved: estimate.dollarsSaved.toString() };
        await txDb.insert(factTeamValueDaily).values(values).onConflictDoUpdate({ target: [factTeamValueDaily.teamId, factTeamValueDaily.day, factTeamValueDaily.estimator], set: values });
      }
    }
  });
}
