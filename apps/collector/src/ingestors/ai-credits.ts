import { AiCreditsUsageSchema } from '@ghcp-dash/contracts';
import { scopeUrls, type Scope } from '../github/scope.js';
import { upsertAiCredits } from '../silver/upsert-ai-credits.js';
import { ingestJsonResponse } from './common.js';
import type { IngestContext, IngestResult } from './types.js';

export function ingestAiCredits(context: IngestContext, scope: Scope, day: string): Promise<IngestResult> {
  return ingestJsonResponse(
    context,
    'ai_credits',
    scope,
    day,
    scopeUrls.aiCreditsUsage(scope, day),
    AiCreditsUsageSchema,
    (usage) => upsertAiCredits(context.database, scope.slug, usage),
    true,
  );
}
