import { bridgeUserTeam, type Database } from '@ghcp-dash/db';
import type { UserTeamRow } from '@ghcp-dash/contracts';
import { ensureDimensions, readPseudonymSalt, type OrgDimension, type TeamDimension, type UserDimension } from './common.js';

export async function upsertUserTeams(database: Database, orgId: string, rowsIn: UserTeamRow[]): Promise<number> {
  let rows = 0;
  const pseudonymSalt = await readPseudonymSalt(database);
  const orgs: OrgDimension[] = [];
  const users: UserDimension[] = [];
  const teams: TeamDimension[] = [];

  for (const row of rowsIn) {
    const userId = BigInt(row.user_id);
    const teamId = BigInt(row.team_id);
    orgs.push({ orgId, day: row.day });
    users.push({ userId, login: row.user_login, day: row.day, pseudonymSalt });
    teams.push({ teamId, orgId, slug: row.slug, day: row.day });
  }

  await ensureDimensions(database, { orgs, users, teams });

  await database.transaction(async (tx) => {
    const txDb = tx as unknown as Database;
    for (const row of rowsIn) {
      const userId = BigInt(row.user_id);
      const teamId = BigInt(row.team_id);
      const values = { userId, teamId, orgId, day: row.day };
      await txDb.insert(bridgeUserTeam).values(values).onConflictDoUpdate({ target: [bridgeUserTeam.userId, bridgeUserTeam.teamId, bridgeUserTeam.day], set: values });
      rows += 1;
    }
  });
  return rows;
}
