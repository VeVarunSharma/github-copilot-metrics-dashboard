import {
  factUserDaily,
  factUserDailyByFeature,
  factUserDailyByIde,
  factUserDailyByLanguageFeature,
  factUserDailyByLanguageModel,
  factUserDailyByModelFeature,
  type Database,
} from '@ghcp-dash/db';
import type { UserDailyRow } from '@ghcp-dash/contracts';
import { cliTotals, ensureDimensions, metrics, readPseudonymSalt, type OrgDimension, type UserDimension } from './common.js';

export async function upsertUsersDaily(database: Database, orgId: string, rowsIn: UserDailyRow[]): Promise<number> {
  let rows = 0;
  const pseudonymSalt = await readPseudonymSalt(database);
  const orgs: OrgDimension[] = [];
  const users: UserDimension[] = [];
  const features = new Set<string>();
  const ides = new Set<string>();
  const languages = new Set<string>();
  const models = new Set<string>();

  for (const row of rowsIn) {
    orgs.push({ orgId, day: row.day });
    users.push({ userId: BigInt(row.user_id), login: row.user_login, day: row.day, pseudonymSalt });
    for (const item of row.totals_by_feature ?? []) features.add(item.feature);
    for (const item of row.totals_by_ide ?? []) ides.add(item.ide);
    for (const item of row.totals_by_language_feature ?? []) {
      languages.add(item.language);
      features.add(item.feature);
    }
    for (const item of row.totals_by_language_model ?? []) {
      languages.add(item.language);
      models.add(item.model);
    }
    for (const item of row.totals_by_model_feature ?? []) {
      models.add(item.model);
      features.add(item.feature);
    }
  }

  await ensureDimensions(database, { orgs, users, features, ides, languages, models });

  await database.transaction(async (tx) => {
    const txDb = tx as unknown as Database;
    for (const row of rowsIn) {
      const userId = BigInt(row.user_id);
      const values = { orgId, userId, day: row.day, usedChat: row.used_chat ?? false, usedAgent: row.used_agent ?? false, usedCli: row.used_cli ?? false, ...metrics(row), ...cliTotals(row), ingestedAt: new Date() };
      await txDb.insert(factUserDaily).values(values).onConflictDoUpdate({ target: [factUserDaily.userId, factUserDaily.orgId, factUserDaily.day], set: values });
      rows += 1;
      for (const item of row.totals_by_feature ?? []) {
        const child = { orgId, userId, day: row.day, feature: item.feature, ...metrics(item) };
        await txDb.insert(factUserDailyByFeature).values(child).onConflictDoUpdate({ target: [factUserDailyByFeature.userId, factUserDailyByFeature.orgId, factUserDailyByFeature.day, factUserDailyByFeature.feature], set: child });
        rows += 1;
      }
      for (const item of row.totals_by_ide ?? []) {
        const child = { orgId, userId, day: row.day, ide: item.ide, ...metrics(item) };
        await txDb.insert(factUserDailyByIde).values(child).onConflictDoUpdate({ target: [factUserDailyByIde.userId, factUserDailyByIde.orgId, factUserDailyByIde.day, factUserDailyByIde.ide], set: child });
        rows += 1;
      }
      for (const item of row.totals_by_language_feature ?? []) {
        const child = { orgId, userId, day: row.day, language: item.language, feature: item.feature, ...metrics(item) };
        await txDb.insert(factUserDailyByLanguageFeature).values(child).onConflictDoUpdate({ target: [factUserDailyByLanguageFeature.userId, factUserDailyByLanguageFeature.orgId, factUserDailyByLanguageFeature.day, factUserDailyByLanguageFeature.language, factUserDailyByLanguageFeature.feature], set: child });
        rows += 1;
      }
      for (const item of row.totals_by_language_model ?? []) {
        const child = { orgId, userId, day: row.day, language: item.language, model: item.model, ...metrics(item) };
        await txDb.insert(factUserDailyByLanguageModel).values(child).onConflictDoUpdate({ target: [factUserDailyByLanguageModel.userId, factUserDailyByLanguageModel.orgId, factUserDailyByLanguageModel.day, factUserDailyByLanguageModel.language, factUserDailyByLanguageModel.model], set: child });
        rows += 1;
      }
      for (const item of row.totals_by_model_feature ?? []) {
        const child = { orgId, userId, day: row.day, model: item.model, feature: item.feature, ...metrics(item) };
        await txDb.insert(factUserDailyByModelFeature).values(child).onConflictDoUpdate({ target: [factUserDailyByModelFeature.userId, factUserDailyByModelFeature.orgId, factUserDailyByModelFeature.day, factUserDailyByModelFeature.model, factUserDailyByModelFeature.feature], set: child });
        rows += 1;
      }
    }
  });
  return rows;
}
