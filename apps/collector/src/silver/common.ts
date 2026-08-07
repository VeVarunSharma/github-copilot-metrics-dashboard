import { createHash } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { dimFeature, dimIde, dimLanguage, dimModel, dimOrg, dimTeam, dimUser, settings, type Database } from '@ghcp-dash/db';
import { withSerializedDimensionWrites } from './dimension-gate.js';

export const DIMENSION_ADVISORY_LOCK_KEY = 4_827_312_495_983_647;

export interface MetricFields {
  code_acceptance_activity_count: number;
  code_generation_activity_count: number;
  loc_added_sum: number;
  loc_deleted_sum: number;
  loc_suggested_to_add_sum: number;
  loc_suggested_to_delete_sum: number;
  user_initiated_interaction_count?: number;
}

export function metrics(row: MetricFields) {
  return {
    codeAcceptanceActivityCount: row.code_acceptance_activity_count,
    codeGenerationActivityCount: row.code_generation_activity_count,
    locAddedSum: BigInt(row.loc_added_sum),
    locDeletedSum: BigInt(row.loc_deleted_sum),
    locSuggestedToAddSum: BigInt(row.loc_suggested_to_add_sum),
    locSuggestedToDeleteSum: BigInt(row.loc_suggested_to_delete_sum),
    userInitiatedInteractionCount: row.user_initiated_interaction_count ?? 0,
  };
}

export function cliTotals(row: { totals_by_cli?: { prompt_count: number; request_count: number; session_count: number; token_usage: { prompt_tokens_sum: number; output_tokens_sum: number } } }) {
  const cli = row.totals_by_cli;
  if (!cli) {
    return {
      cliPromptCount: 0,
      cliRequestCount: 0,
      cliSessionCount: 0,
      cliPromptTokensSum: 0n,
      cliOutputTokensSum: 0n,
    };
  }
  return {
    cliPromptCount: cli.prompt_count,
    cliRequestCount: cli.request_count,
    cliSessionCount: cli.session_count,
    cliPromptTokensSum: BigInt(cli.token_usage.prompt_tokens_sum),
    cliOutputTokensSum: BigInt(cli.token_usage.output_tokens_sum),
  };
}

export interface OrgDimension {
  orgId: string;
  day: string;
}

export interface UserDimension {
  userId: bigint;
  login: string;
  day: string;
  pseudonymSalt: string;
}

export interface TeamDimension {
  teamId: bigint;
  orgId: string;
  slug: string;
  day: string;
}

export interface RequiredDimensions {
  orgs?: readonly OrgDimension[];
  users?: readonly UserDimension[];
  teams?: readonly TeamDimension[];
  features?: Iterable<string>;
  ides?: Iterable<string>;
  languages?: Iterable<string>;
  models?: Iterable<string>;
}

function sortedUnique(values: Iterable<string> | undefined): string[] {
  return Array.from(new Set(values ?? [])).sort((a, b) => a.localeCompare(b));
}

function sortedUniqueOrgs(orgs: readonly OrgDimension[] | undefined): OrgDimension[] {
  const deduped = new Map<string, OrgDimension>();
  for (const org of orgs ?? []) {
    deduped.set(`${org.orgId}\0${org.day}`, org);
  }
  return Array.from(deduped.values()).sort((a, b) => a.orgId.localeCompare(b.orgId) || a.day.localeCompare(b.day));
}

function sortedUniqueUsers(users: readonly UserDimension[] | undefined): UserDimension[] {
  const deduped = new Map<string, UserDimension>();
  for (const user of users ?? []) {
    deduped.set(`${user.userId.toString()}\0${user.day}`, user);
  }
  return Array.from(deduped.values()).sort((a, b) => (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : a.day.localeCompare(b.day)));
}

function sortedUniqueTeams(teams: readonly TeamDimension[] | undefined): TeamDimension[] {
  const deduped = new Map<string, TeamDimension>();
  for (const team of teams ?? []) {
    deduped.set(`${team.teamId.toString()}\0${team.day}`, team);
  }
  return Array.from(deduped.values()).sort((a, b) => (a.teamId < b.teamId ? -1 : a.teamId > b.teamId ? 1 : a.day.localeCompare(b.day)));
}

export async function ensureDimensions(database: Database, dimensions: RequiredDimensions): Promise<void> {
  await withDimensionAdvisoryLock(database, async (lockedDatabase) => {
    for (const org of sortedUniqueOrgs(dimensions.orgs)) {
      await ensureOrg(lockedDatabase, org.orgId, org.day);
    }
    for (const user of sortedUniqueUsers(dimensions.users)) {
      await ensureUser(lockedDatabase, user.userId, user.login, user.day, user.pseudonymSalt);
    }
    for (const team of sortedUniqueTeams(dimensions.teams)) {
      await ensureTeam(lockedDatabase, team.teamId, team.orgId, team.slug, team.day);
    }
    for (const feature of sortedUnique(dimensions.features)) {
      await ensureFeature(lockedDatabase, feature);
    }
    for (const ide of sortedUnique(dimensions.ides)) {
      await ensureIde(lockedDatabase, ide);
    }
    for (const language of sortedUnique(dimensions.languages)) {
      await ensureLanguage(lockedDatabase, language);
    }
    for (const model of sortedUnique(dimensions.models)) {
      await ensureModel(lockedDatabase, model);
    }
  });
}

export async function withDimensionAdvisoryLock<T>(database: Database, work: (lockedDatabase: Database) => Promise<T>): Promise<T> {
  return database.transaction(async (tx) => {
    const txDb = tx as unknown as Database;
    await txDb.execute(sql`select pg_advisory_xact_lock(${DIMENSION_ADVISORY_LOCK_KEY})`);
    return withSerializedDimensionWrites(() => work(txDb));
  });
}

export async function ensureOrg(database: Database, orgId: string, day: string): Promise<void> {
  await database.insert(dimOrg).values({ orgId, displayName: orgId, firstSeenDay: day, lastSeenDay: day }).onConflictDoUpdate({ target: dimOrg.orgId, set: { lastSeenDay: day } });
}

/** Ensure a dim_org row exists, using today's UTC date when no day is known yet. */
export async function ensureOrgExists(database: Database, orgId: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await withDimensionAdvisoryLock(database, async (lockedDatabase) => {
    await lockedDatabase
      .insert(dimOrg)
      .values({ orgId, displayName: orgId, firstSeenDay: today, lastSeenDay: today })
      .onConflictDoNothing({ target: dimOrg.orgId });
  });
}

export async function ensureFeature(database: Database, name: string): Promise<void> {
  await database.insert(dimFeature).values({ name, displayName: name }).onConflictDoNothing({ target: dimFeature.name });
}
export async function ensureIde(database: Database, name: string): Promise<void> {
  await database.insert(dimIde).values({ name, displayName: name }).onConflictDoNothing({ target: dimIde.name });
}
export async function ensureLanguage(database: Database, name: string): Promise<void> {
  await database.insert(dimLanguage).values({ name, displayName: name }).onConflictDoNothing({ target: dimLanguage.name });
}
export async function ensureModel(database: Database, name: string): Promise<void> {
  await database.insert(dimModel).values({ name, displayName: name }).onConflictDoNothing({ target: dimModel.name });
}

export async function readPseudonymSalt(database: Database): Promise<string> {
  const rows = await database.select({ value: settings.value }).from(settings).where(eq(settings.key, 'pseudonym_salt')).limit(1);
  const salt = rows[0]?.value;
  if (typeof salt !== 'string' || salt.length === 0) {
    throw new Error('pseudonym_salt setting is required before ingesting user-level facts. Run pnpm db:seed first.');
  }
  return salt;
}

export function pseudonymForUser(userId: bigint, login: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${userId}:${login}`).digest('hex').slice(0, 16);
}

export async function ensureUser(database: Database, userId: bigint, login: string, day: string, salt: string): Promise<void> {
  const pseudonym = pseudonymForUser(userId, login, salt);
  await database.insert(dimUser).values({ userId, userLogin: login, pseudonym, firstSeenDay: day, lastSeenDay: day }).onConflictDoUpdate({ target: dimUser.userId, set: { userLogin: login, pseudonym, lastSeenDay: day } });
}

export async function ensureTeam(database: Database, teamId: bigint, orgId: string, slug: string, day: string): Promise<void> {
  await database.insert(dimTeam).values({ teamId, orgId, slug, firstSeenDay: day, lastSeenDay: day }).onConflictDoUpdate({ target: dimTeam.teamId, set: { orgId, slug, lastSeenDay: day } });
}
