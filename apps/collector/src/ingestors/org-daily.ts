import { OrgDailyTotalSchema, type OrgDailyReport } from '@ghcp-dash/contracts';
import { scopeUrls, type Scope } from '../github/scope.js';
import { upsertOrgDaily } from '../silver/upsert-org-daily.js';
import { ingestSignedNdjsonReport } from './common.js';
import type { IngestContext, IngestResult } from './types.js';
import type { z } from 'zod';

/**
 * The 1-day report endpoint returns a single day-total object directly,
 * not wrapped in a `{ day_totals: [...] }` envelope (unlike the 28-day endpoint).
 * We wrap it client-side so upsertOrgDaily can use one code path.
 */
const SingleDayWrapperSchema = OrgDailyTotalSchema.transform(
  (total): OrgDailyReport => ({
    day_totals: [total],
    report_start_day: total.day,
    report_end_day: total.day,
  }),
) as unknown as z.ZodType<OrgDailyReport>;

export function ingestOrgDaily(context: IngestContext, scope: Scope, day: string): Promise<IngestResult> {
  return ingestSignedNdjsonReport(
    context,
    'org_daily',
    scope,
    day,
    scopeUrls.oneDayReport(scope, day),
    SingleDayWrapperSchema,
    (report) => upsertOrgDaily(context.database, scope.slug, report),
  );
}
