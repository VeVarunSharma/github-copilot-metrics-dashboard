export { createDb, db, pingDb } from './client.js';
export type { Database } from './client.js';
export * from './schema/index.js';

import type {
  bridgeUserTeam,
  dimFeature,
  dimIde,
  dimLanguage,
  dimModel,
  dimOrg,
  dimRepo,
  dimTeam,
  dimUser,
  factAiCreditsDaily,
  factBillingDaily,
  factCiDaily,
  factCommitDaily,
  factDoraDaily,
  factOrgDaily,
  factOrgDailyByFeature,
  factOrgDailyByIde,
  factOrgDailyByLanguageFeature,
  factOrgDailyByLanguageModel,
  factOrgDailyByModelFeature,
  factReleaseDaily,
  factRoiDaily,
  factTeamValueDaily,
  factUserDaily,
  factUserDailyByFeature,
  factUserDailyByIde,
  factUserDailyByLanguageFeature,
  factUserDailyByLanguageModel,
  factUserDailyByModelFeature,
  factValueDaily,
  factWorkflowRunDaily,
  ingestionRun,
  settings,
} from './schema/index.js';

export type DimOrg = typeof dimOrg.$inferSelect;
export type NewDimOrg = typeof dimOrg.$inferInsert;
export type DimRepo = typeof dimRepo.$inferSelect;
export type NewDimRepo = typeof dimRepo.$inferInsert;
export type DimUser = typeof dimUser.$inferSelect;
export type NewDimUser = typeof dimUser.$inferInsert;
export type DimTeam = typeof dimTeam.$inferSelect;
export type NewDimTeam = typeof dimTeam.$inferInsert;
export type DimFeature = typeof dimFeature.$inferSelect;
export type NewDimFeature = typeof dimFeature.$inferInsert;
export type DimIde = typeof dimIde.$inferSelect;
export type NewDimIde = typeof dimIde.$inferInsert;
export type DimLanguage = typeof dimLanguage.$inferSelect;
export type NewDimLanguage = typeof dimLanguage.$inferInsert;
export type DimModel = typeof dimModel.$inferSelect;
export type NewDimModel = typeof dimModel.$inferInsert;
export type FactOrgDaily = typeof factOrgDaily.$inferSelect;
export type NewFactOrgDaily = typeof factOrgDaily.$inferInsert;
export type FactOrgDailyByFeature = typeof factOrgDailyByFeature.$inferSelect;
export type NewFactOrgDailyByFeature = typeof factOrgDailyByFeature.$inferInsert;
export type FactOrgDailyByIde = typeof factOrgDailyByIde.$inferSelect;
export type NewFactOrgDailyByIde = typeof factOrgDailyByIde.$inferInsert;
export type FactOrgDailyByLanguageFeature = typeof factOrgDailyByLanguageFeature.$inferSelect;
export type NewFactOrgDailyByLanguageFeature = typeof factOrgDailyByLanguageFeature.$inferInsert;
export type FactOrgDailyByLanguageModel = typeof factOrgDailyByLanguageModel.$inferSelect;
export type NewFactOrgDailyByLanguageModel = typeof factOrgDailyByLanguageModel.$inferInsert;
export type FactOrgDailyByModelFeature = typeof factOrgDailyByModelFeature.$inferSelect;
export type NewFactOrgDailyByModelFeature = typeof factOrgDailyByModelFeature.$inferInsert;
export type FactUserDaily = typeof factUserDaily.$inferSelect;
export type NewFactUserDaily = typeof factUserDaily.$inferInsert;
export type FactUserDailyByFeature = typeof factUserDailyByFeature.$inferSelect;
export type NewFactUserDailyByFeature = typeof factUserDailyByFeature.$inferInsert;
export type FactUserDailyByIde = typeof factUserDailyByIde.$inferSelect;
export type NewFactUserDailyByIde = typeof factUserDailyByIde.$inferInsert;
export type FactUserDailyByLanguageFeature = typeof factUserDailyByLanguageFeature.$inferSelect;
export type NewFactUserDailyByLanguageFeature = typeof factUserDailyByLanguageFeature.$inferInsert;
export type FactUserDailyByLanguageModel = typeof factUserDailyByLanguageModel.$inferSelect;
export type NewFactUserDailyByLanguageModel = typeof factUserDailyByLanguageModel.$inferInsert;
export type FactUserDailyByModelFeature = typeof factUserDailyByModelFeature.$inferSelect;
export type NewFactUserDailyByModelFeature = typeof factUserDailyByModelFeature.$inferInsert;
export type BridgeUserTeam = typeof bridgeUserTeam.$inferSelect;
export type NewBridgeUserTeam = typeof bridgeUserTeam.$inferInsert;
export type FactBillingDaily = typeof factBillingDaily.$inferSelect;
export type NewFactBillingDaily = typeof factBillingDaily.$inferInsert;
export type FactAiCreditsDaily = typeof factAiCreditsDaily.$inferSelect;
export type NewFactAiCreditsDaily = typeof factAiCreditsDaily.$inferInsert;
export type FactReleaseDaily = typeof factReleaseDaily.$inferSelect;
export type NewFactReleaseDaily = typeof factReleaseDaily.$inferInsert;
export type FactWorkflowRunDaily = typeof factWorkflowRunDaily.$inferSelect;
export type NewFactWorkflowRunDaily = typeof factWorkflowRunDaily.$inferInsert;
export type FactCommitDaily = typeof factCommitDaily.$inferSelect;
export type NewFactCommitDaily = typeof factCommitDaily.$inferInsert;
export type IngestionRun = typeof ingestionRun.$inferSelect;
export type NewIngestionRun = typeof ingestionRun.$inferInsert;
export type Settings = typeof settings.$inferSelect;
export type NewSettings = typeof settings.$inferInsert;
export type FactValueDaily = typeof factValueDaily.$inferSelect;
export type NewFactValueDaily = typeof factValueDaily.$inferInsert;
export type FactRoiDaily = typeof factRoiDaily.$inferSelect;
export type NewFactRoiDaily = typeof factRoiDaily.$inferInsert;
export type FactTeamValueDaily = typeof factTeamValueDaily.$inferSelect;
export type NewFactTeamValueDaily = typeof factTeamValueDaily.$inferInsert;
export type FactDoraDaily = typeof factDoraDaily.$inferSelect;
export type NewFactDoraDaily = typeof factDoraDaily.$inferInsert;
export type FactCiDaily = typeof factCiDaily.$inferSelect;
export type NewFactCiDaily = typeof factCiDaily.$inferInsert;
