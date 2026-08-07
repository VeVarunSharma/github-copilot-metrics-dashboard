import { and, count, eq } from 'drizzle-orm';
import { loadEnvFromWorkspaceRoot } from './load-env.js';
import { createDb, type Database } from './client.js';
import {
  dimOrg,
  dimTeam,
  factAiCreditsDaily,
  factBillingDaily,
  factOrgDaily,
  factOrgDailyByFeature,
  factOrgDailyByIde,
  factOrgDailyByLanguageFeature,
  factOrgDailyByLanguageModel,
  factOrgDailyByModelFeature,
  factRoiDaily,
  factUserDaily,
  factUserDailyByLanguageModel,
  factUserDailyByModelFeature,
  factValueDaily,
  bridgeUserTeam,
} from './schema/index.js';

const DEMO_ORG_SLUG = 'demo-org';
const MIN_DEMO_DAYS = 90;

function countValue(row: { value: number } | undefined): number {
  return row?.value ?? 0;
}

async function main(): Promise<void> {
  loadEnvFromWorkspaceRoot();
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required to run the demo smoke check.');

  const db = createDb(url);
  const [org] = await db
    .select({ orgId: dimOrg.orgId })
    .from(dimOrg)
    .where(and(eq(dimOrg.orgId, DEMO_ORG_SLUG), eq(dimOrg.displayName, '[demo] Demo organization')))
    .limit(1);
  const [orgDaily] = await db.select({ value: count() }).from(factOrgDaily).where(eq(factOrgDaily.orgId, DEMO_ORG_SLUG));
  const [byFeature] = await db
    .select({ value: count() })
    .from(factOrgDailyByFeature)
    .where(eq(factOrgDailyByFeature.orgId, DEMO_ORG_SLUG));
  const [byIde] = await db.select({ value: count() }).from(factOrgDailyByIde).where(eq(factOrgDailyByIde.orgId, DEMO_ORG_SLUG));
  const [byLanguageFeature] = await db
    .select({ value: count() })
    .from(factOrgDailyByLanguageFeature)
    .where(eq(factOrgDailyByLanguageFeature.orgId, DEMO_ORG_SLUG));
  const [byLanguageModel] = await db
    .select({ value: count() })
    .from(factOrgDailyByLanguageModel)
    .where(eq(factOrgDailyByLanguageModel.orgId, DEMO_ORG_SLUG));
  const [byModelFeature] = await db
    .select({ value: count() })
    .from(factOrgDailyByModelFeature)
    .where(eq(factOrgDailyByModelFeature.orgId, DEMO_ORG_SLUG));
  const [billing] = await db
    .select({ value: count() })
    .from(factBillingDaily)
    .where(eq(factBillingDaily.orgId, DEMO_ORG_SLUG));
  const [aiCredits] = await db
    .select({ value: count() })
    .from(factAiCreditsDaily)
    .where(eq(factAiCreditsDaily.orgId, DEMO_ORG_SLUG));
  const [userDaily] = await db.select({ value: count() }).from(factUserDaily).where(eq(factUserDaily.orgId, DEMO_ORG_SLUG));
  const [userLanguageModel] = await db
    .select({ value: count() })
    .from(factUserDailyByLanguageModel)
    .where(eq(factUserDailyByLanguageModel.orgId, DEMO_ORG_SLUG));
  const [userModelFeature] = await db
    .select({ value: count() })
    .from(factUserDailyByModelFeature)
    .where(eq(factUserDailyByModelFeature.orgId, DEMO_ORG_SLUG));
  const [teams] = await db.select({ value: count() }).from(dimTeam).where(eq(dimTeam.orgId, DEMO_ORG_SLUG));
  const [teamBridge] = await db.select({ value: count() }).from(bridgeUserTeam).where(eq(bridgeUserTeam.orgId, DEMO_ORG_SLUG));
  const [value] = await db.select({ value: count() }).from(factValueDaily).where(eq(factValueDaily.orgId, DEMO_ORG_SLUG));
  const [roi] = await db.select({ value: count() }).from(factRoiDaily).where(eq(factRoiDaily.orgId, DEMO_ORG_SLUG));

  const checks = [
    { name: 'demo org', rows: org ? 1 : 0, minimum: 1 },
    { name: 'adoption/org daily', rows: countValue(orgDaily), minimum: MIN_DEMO_DAYS },
    { name: 'code generation by feature', rows: countValue(byFeature), minimum: MIN_DEMO_DAYS },
    { name: 'code generation by IDE', rows: countValue(byIde), minimum: MIN_DEMO_DAYS },
    {
      name: 'code generation by language/feature',
      rows: countValue(byLanguageFeature),
      minimum: MIN_DEMO_DAYS,
    },
    {
      name: 'code generation by language/model',
      rows: countValue(byLanguageModel),
      minimum: MIN_DEMO_DAYS,
    },
    {
      name: 'code generation by model/feature',
      rows: countValue(byModelFeature),
      minimum: MIN_DEMO_DAYS,
    },
    { name: 'billing spend', rows: countValue(billing), minimum: 4 },
    { name: 'AI credits spend', rows: countValue(aiCredits), minimum: 4 },
    { name: 'consumption user daily', rows: countValue(userDaily), minimum: MIN_DEMO_DAYS },
    { name: 'consumption user language/model', rows: countValue(userLanguageModel), minimum: MIN_DEMO_DAYS },
    { name: 'consumption user model/feature', rows: countValue(userModelFeature), minimum: MIN_DEMO_DAYS },
    { name: 'consumption demo teams', rows: countValue(teams), minimum: 5 },
    { name: 'consumption team bridge', rows: countValue(teamBridge), minimum: MIN_DEMO_DAYS },
    { name: 'value estimates', rows: countValue(value), minimum: MIN_DEMO_DAYS * 3 },
    { name: 'ROI facts', rows: countValue(roi), minimum: MIN_DEMO_DAYS },
  ];

  const failures = checks.filter((check) => check.rows < check.minimum);
  if (failures.length > 0) {
    throw new Error(
      `Demo smoke failed: ${failures.map((check) => `${check.name} rows=${check.rows}, want>=${check.minimum}`).join('; ')}`,
    );
  }

  console.log(JSON.stringify({ status: 'ok', orgId: DEMO_ORG_SLUG, checks }));
}

await main();
process.exit(process.exitCode ?? 0);
