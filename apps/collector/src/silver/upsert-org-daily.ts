import {
  factOrgDaily,
  factOrgDailyByFeature,
  factOrgDailyByIde,
  factOrgDailyByLanguageFeature,
  factOrgDailyByLanguageModel,
  factOrgDailyByModelFeature,
  type Database,
} from '@ghcp-dash/db';
import type { OrgDailyReport, OrgDailyTotal } from '@ghcp-dash/contracts';
import { cliTotals, ensureDimensions, metrics, type OrgDimension } from './common.js';

function pr(row: OrgDailyTotal) {
  return row.pull_requests;
}

async function upsertTotal(database: Database, orgId: string, row: OrgDailyTotal): Promise<void> {
  const pull = pr(row);
  const values = {
    orgId,
    day: row.day,
    dailyActiveUsers: row.daily_active_users,
    weeklyActiveUsers: row.weekly_active_users,
    monthlyActiveUsers: row.monthly_active_users,
    monthlyActiveChatUsers: row.monthly_active_chat_users ?? 0,
    monthlyActiveAgentUsers: row.monthly_active_agent_users ?? 0,
    dailyActiveCliUsers: row.daily_active_cli_users ?? 0,
    ...metrics(row),
    prTotalCreated: pull?.total_created ?? 0,
    prTotalCreatedByCopilot: pull?.total_created_by_copilot ?? 0,
    prTotalMerged: pull?.total_merged ?? 0,
    prTotalMergedCreatedByCopilot: pull?.total_merged_created_by_copilot ?? 0,
    prTotalReviewed: pull?.total_reviewed ?? 0,
    prTotalReviewedByCopilot: pull?.total_reviewed_by_copilot ?? 0,
    prTotalSuggestions: pull?.total_suggestions ?? 0,
    prTotalAppliedSuggestions: pull?.total_applied_suggestions ?? 0,
    prTotalCopilotSuggestions: pull?.total_copilot_suggestions ?? 0,
    prTotalCopilotAppliedSuggestions: pull?.total_copilot_applied_suggestions ?? 0,
    prMedianMinutesToMerge: pull?.median_minutes_to_merge?.toString() ?? null,
    prMedianMinutesToMergeCopilotAuthored: pull?.median_minutes_to_merge_copilot_authored?.toString() ?? null,
    prMedianMinutesToMergeCopilotReviewed: pull?.median_minutes_to_merge_copilot_reviewed?.toString() ?? null,
    ...cliTotals(row),
    ingestedAt: new Date(),
  };
  await database.insert(factOrgDaily).values(values).onConflictDoUpdate({ target: [factOrgDaily.orgId, factOrgDaily.day], set: values });
}

export async function upsertOrgDaily(database: Database, orgId: string, report: OrgDailyReport): Promise<number> {
  let rows = 0;
  const orgs: OrgDimension[] = [];
  const features = new Set<string>();
  const ides = new Set<string>();
  const languages = new Set<string>();
  const models = new Set<string>();

  for (const total of report.day_totals) {
    orgs.push({ orgId, day: total.day });
    for (const item of total.totals_by_feature ?? []) features.add(item.feature);
    for (const item of total.totals_by_ide ?? []) ides.add(item.ide);
    for (const item of total.totals_by_language_feature ?? []) {
      languages.add(item.language);
      features.add(item.feature);
    }
    for (const item of total.totals_by_language_model ?? []) {
      languages.add(item.language);
      models.add(item.model);
    }
    for (const item of total.totals_by_model_feature ?? []) {
      models.add(item.model);
      features.add(item.feature);
    }
  }

  await ensureDimensions(database, { orgs, features, ides, languages, models });

  await database.transaction(async (tx) => {
    const txDb = tx as unknown as Database;
    for (const total of report.day_totals) {
      await upsertTotal(txDb, orgId, total);
      rows += 1;

      for (const item of total.totals_by_feature ?? []) {
        const values = { orgId, day: total.day, feature: item.feature, ...metrics(item) };
        await txDb.insert(factOrgDailyByFeature).values(values).onConflictDoUpdate({ target: [factOrgDailyByFeature.orgId, factOrgDailyByFeature.day, factOrgDailyByFeature.feature], set: values });
        rows += 1;
      }
      for (const item of total.totals_by_ide ?? []) {
        const values = { orgId, day: total.day, ide: item.ide, ...metrics(item) };
        await txDb.insert(factOrgDailyByIde).values(values).onConflictDoUpdate({ target: [factOrgDailyByIde.orgId, factOrgDailyByIde.day, factOrgDailyByIde.ide], set: values });
        rows += 1;
      }
      for (const item of total.totals_by_language_feature ?? []) {
        const values = { orgId, day: total.day, language: item.language, feature: item.feature, ...metrics(item) };
        await txDb.insert(factOrgDailyByLanguageFeature).values(values).onConflictDoUpdate({ target: [factOrgDailyByLanguageFeature.orgId, factOrgDailyByLanguageFeature.day, factOrgDailyByLanguageFeature.language, factOrgDailyByLanguageFeature.feature], set: values });
        rows += 1;
      }
      for (const item of total.totals_by_language_model ?? []) {
        const values = { orgId, day: total.day, language: item.language, model: item.model, ...metrics(item) };
        await txDb.insert(factOrgDailyByLanguageModel).values(values).onConflictDoUpdate({ target: [factOrgDailyByLanguageModel.orgId, factOrgDailyByLanguageModel.day, factOrgDailyByLanguageModel.language, factOrgDailyByLanguageModel.model], set: values });
        rows += 1;
      }
      for (const item of total.totals_by_model_feature ?? []) {
        const values = { orgId, day: total.day, model: item.model, feature: item.feature, ...metrics(item) };
        await txDb.insert(factOrgDailyByModelFeature).values(values).onConflictDoUpdate({ target: [factOrgDailyByModelFeature.orgId, factOrgDailyByModelFeature.day, factOrgDailyByModelFeature.model, factOrgDailyByModelFeature.feature], set: values });
        rows += 1;
      }
    }
  });
  return rows;
}
