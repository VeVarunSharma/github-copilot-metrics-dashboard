import { BillingUsageSummarySchema } from '@ghcp-dash/contracts';
import { scopeUrls, type Scope } from '../github/scope.js';
import { upsertBilling } from '../silver/upsert-billing.js';
import { ingestJsonResponse } from './common.js';
import type { IngestContext, IngestResult } from './types.js';

export function ingestBilling(context: IngestContext, scope: Scope, day: string): Promise<IngestResult> {
  return ingestJsonResponse(
    context,
    'billing',
    scope,
    day,
    scopeUrls.billingUsage(scope, day),
    BillingUsageSummarySchema,
    (summary) => upsertBilling(context.database, scope.slug, summary),
    true,
  );
}
