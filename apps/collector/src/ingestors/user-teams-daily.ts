import { UserTeamRowSchema } from '@ghcp-dash/contracts';
import { scopeUrls, type Scope } from '../github/scope.js';
import { upsertUserTeams } from '../silver/upsert-user-teams.js';
import { ingestSignedNdjsonRows } from './common.js';
import type { IngestContext, IngestResult } from './types.js';

export function ingestUserTeamsDaily(context: IngestContext, scope: Scope, day: string): Promise<IngestResult> {
  return ingestSignedNdjsonRows(
    context,
    'user_teams',
    scope,
    day,
    scopeUrls.userTeamsOneDay(scope, day),
    UserTeamRowSchema,
    (rows) => upsertUserTeams(context.database, scope.slug, rows),
  );
}
