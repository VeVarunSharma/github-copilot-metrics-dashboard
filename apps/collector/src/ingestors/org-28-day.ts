import { OrgDailyReportSchema } from '@ghcp-dash/contracts';
import { scopeUrls, type Scope } from '../github/scope.js';
import { upsertOrgDaily } from '../silver/upsert-org-daily.js';
import { ingestSignedNdjsonReport } from './common.js';
import type { IngestContext, IngestResult } from './types.js';

export function ingestOrg28DayLatest(context: IngestContext, scope: Scope): Promise<IngestResult> {
  return ingestSignedNdjsonReport(
    context,
    'org_28_latest',
    scope,
    null,
    scopeUrls.twentyEightDayLatest(scope),
    OrgDailyReportSchema,
    (report) => upsertOrgDaily(context.database, scope.slug, report),
  );
}
