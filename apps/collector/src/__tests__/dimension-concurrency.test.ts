import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { createDb, dimFeature, dimIde, dimLanguage, dimModel, dimOrg, dimRepo, factOrgDaily, factOrgDailyByFeature, factOrgDailyByIde, factOrgDailyByLanguageFeature, factOrgDailyByLanguageModel, factOrgDailyByModelFeature, type Database } from '@ghcp-dash/db';
import type { GithubRepo, OrgDailyReport } from '@ghcp-dash/contracts';
import { runPool } from '../commands/context.js';
import type { Scope } from '../github/scope.js';
import { DIMENSION_ADVISORY_LOCK_KEY } from '../silver/common.js';
import { upsertOrgDaily } from '../silver/upsert-org-daily.js';
import { upsertRepos } from '../silver/upsert-repos.js';

const describeIfDatabase = process.env.DATABASE_URL ? describe : describe.skip;

const orgId = 'collector-concurrency-test-org';
const feature = 'collector-concurrency-test-feature';
const ide = 'collector-concurrency-test-ide';
const language = 'collector-concurrency-test-language';
const model = 'collector-concurrency-test-model';
const days = Array.from({ length: 16 }, (_, index) => `2026-07-${String(index + 1).padStart(2, '0')}`);
const firstDay = '2026-07-01';
const testScope: Scope = { kind: 'org', slug: orgId };
const testRepos: GithubRepo[] = [
  { id: 8_800_000_001, name: 'collector-concurrency-repo-a', full_name: `${orgId}/collector-concurrency-repo-a`, default_branch: 'main', archived: false, fork: false, private: true, pushed_at: '2026-07-01T00:00:00Z' },
  { id: 8_800_000_002, name: 'collector-concurrency-repo-b', full_name: `${orgId}/collector-concurrency-repo-b`, default_branch: 'main', archived: false, fork: false, private: true, pushed_at: '2026-07-01T00:00:00Z' },
  { id: 8_800_000_003, name: 'collector-concurrency-repo-c', full_name: `${orgId}/collector-concurrency-repo-c`, default_branch: 'develop', archived: false, fork: false, private: true, pushed_at: '2026-07-01T00:00:00Z' },
];

const metricFields = {
  code_acceptance_activity_count: 1,
  code_generation_activity_count: 2,
  loc_added_sum: 3,
  loc_deleted_sum: 4,
  loc_suggested_to_add_sum: 5,
  loc_suggested_to_delete_sum: 6,
  user_initiated_interaction_count: 7,
};

function reportForDay(day: string): OrgDailyReport {
  return {
    report_start_day: day,
    report_end_day: day,
    day_totals: [
      {
        day,
        daily_active_users: 1,
        weekly_active_users: 1,
        monthly_active_users: 1,
        ...metricFields,
        totals_by_feature: [{ feature, ...metricFields }],
        totals_by_ide: [{ ide, ...metricFields }],
        totals_by_language_feature: [{ language, feature, ...metricFields }],
        totals_by_language_model: [{ language, model, ...metricFields }],
        totals_by_model_feature: [{ model, feature, ...metricFields }],
      },
    ],
  };
}

function sleep(ms: number): Promise<'blocked'> {
  return new Promise((resolve) => {
    setTimeout(() => resolve('blocked'), ms);
  });
}

async function expectCompletes<T>(work: Promise<T>): Promise<T> {
  const result = await Promise.race([work, new Promise<'timed_out'>((resolve) => setTimeout(() => resolve('timed_out'), 5_000))]);
  expect(result).not.toBe('timed_out');
  return result as T;
}

async function cleanup(database: Database): Promise<void> {
  await database.execute(sql`delete from fact_release_daily where org_id = ${orgId}`);
  await database.execute(sql`delete from fact_workflow_run_daily where org_id = ${orgId}`);
  await database.execute(sql`delete from fact_commit_daily where org_id = ${orgId}`);
  await database.execute(sql`delete from fact_org_daily_by_feature where org_id = ${orgId}`);
  await database.execute(sql`delete from fact_org_daily_by_ide where org_id = ${orgId}`);
  await database.execute(sql`delete from fact_org_daily_by_language_feature where org_id = ${orgId}`);
  await database.execute(sql`delete from fact_org_daily_by_language_model where org_id = ${orgId}`);
  await database.execute(sql`delete from fact_org_daily_by_model_feature where org_id = ${orgId}`);
  await database.execute(sql`delete from fact_org_daily where org_id = ${orgId}`);
  await database.execute(sql`delete from dim_repo where org_id = ${orgId}`);
  await database.execute(sql`delete from dim_org where org_id = ${orgId}`);
  await database.execute(sql`delete from dim_feature where name = ${feature}`);
  await database.execute(sql`delete from dim_ide where name = ${ide}`);
  await database.execute(sql`delete from dim_language where name = ${language}`);
  await database.execute(sql`delete from dim_model where name = ${model}`);
}

async function close(database: Database): Promise<void> {
  await (database as unknown as { $client?: { end: () => Promise<void> } }).$client?.end();
}

describeIfDatabase('dimension upserts under collector concurrency', () => {
  const database = createDb(process.env.DATABASE_URL ?? '');

  beforeAll(async () => {
    await cleanup(database);
  });

  afterAll(async () => {
    await cleanup(database);
    await close(database);
  });

  it('waits on the cross-process advisory lock before writing shared dimensions', async () => {
    let releaseLock: () => void = () => undefined;
    let markLocked: () => void = () => undefined;
    const locked = new Promise<void>((resolve) => {
      markLocked = resolve;
    });
    const released = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    const holder = database.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(${DIMENSION_ADVISORY_LOCK_KEY})`);
      markLocked();
      await released;
    });

    await locked;
    const pending = upsertOrgDaily(database, orgId, reportForDay(firstDay)).then(() => 'finished' as const);
    await expect(Promise.race([pending, sleep(150)])).resolves.toBe('blocked');

    releaseLock();
    await holder;
    await expect(pending).resolves.toBe('finished');
  });

  it('dedupes overlapping dimensions when upserts run with concurrency greater than one', async () => {
    await runPool(days, 8, async (day) => {
      await upsertOrgDaily(database, orgId, reportForDay(day));
    });

    await runPool(days, 8, async (day) => {
      await upsertOrgDaily(database, orgId, reportForDay(day));
    });

    await expect(database.select().from(dimOrg).where(eq(dimOrg.orgId, orgId))).resolves.toHaveLength(1);
    await expect(database.select().from(dimFeature).where(eq(dimFeature.name, feature))).resolves.toHaveLength(1);
    await expect(database.select().from(dimIde).where(eq(dimIde.name, ide))).resolves.toHaveLength(1);
    await expect(database.select().from(dimLanguage).where(eq(dimLanguage.name, language))).resolves.toHaveLength(1);
    await expect(database.select().from(dimModel).where(eq(dimModel.name, model))).resolves.toHaveLength(1);
    await expect(database.select().from(factOrgDaily).where(eq(factOrgDaily.orgId, orgId))).resolves.toHaveLength(days.length);
    await expect(database.select().from(factOrgDailyByFeature).where(eq(factOrgDailyByFeature.orgId, orgId))).resolves.toHaveLength(days.length);
    await expect(database.select().from(factOrgDailyByIde).where(eq(factOrgDailyByIde.orgId, orgId))).resolves.toHaveLength(days.length);
    await expect(database.select().from(factOrgDailyByLanguageFeature).where(eq(factOrgDailyByLanguageFeature.orgId, orgId))).resolves.toHaveLength(days.length);
    await expect(database.select().from(factOrgDailyByLanguageModel).where(eq(factOrgDailyByLanguageModel.orgId, orgId))).resolves.toHaveLength(days.length);
    await expect(database.select().from(factOrgDailyByModelFeature).where(eq(factOrgDailyByModelFeature.orgId, orgId))).resolves.toHaveLength(days.length);
  });

  it('dedupes repository dimensions when repo upserts run concurrently', async () => {
    const passes = Array.from({ length: 24 }, (_, index) => index);

    await expectCompletes(runPool(passes, 8, async () => {
      await upsertRepos(database, testScope, testRepos);
    }));

    await expectCompletes(runPool(passes, 8, async (index) => {
      await upsertRepos(database, testScope, index % 2 === 0 ? [...testRepos].reverse() : testRepos);
    }));

    const repoRows = await database.select().from(dimRepo).where(eq(dimRepo.orgId, orgId));
    expect(repoRows).toHaveLength(testRepos.length);
    expect(repoRows.map((repo) => repo.repoId).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))).toEqual(testRepos.map((repo) => BigInt(repo.id)));
  });
});
