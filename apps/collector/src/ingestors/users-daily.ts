import { UserDailyRowSchema } from '@ghcp-dash/contracts';
import { scopeUrls, type Scope } from '../github/scope.js';
import { upsertUsersDaily } from '../silver/upsert-users-daily.js';
import { ingestSignedNdjsonRows } from './common.js';
import type { IngestContext, IngestResult } from './types.js';

export function ingestUsersDaily(context: IngestContext, scope: Scope, day: string): Promise<IngestResult> {
  return ingestSignedNdjsonRows(
    context,
    'users_daily',
    scope,
    day,
    scopeUrls.usersOneDay(scope, day),
    UserDailyRowSchema,
    (rows) => upsertUsersDaily(context.database, scope.slug, rows),
  );
}
