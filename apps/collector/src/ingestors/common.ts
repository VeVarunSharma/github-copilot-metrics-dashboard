import { BillingUsageSummarySchema, AiCreditsUsageSchema } from '@ghcp-dash/contracts';
import type { z } from 'zod';
import { writeBronzeNdjson } from '../bronze/storage.js';
import { claimIngestionRun, failIngestionRun, finalizeIngestionRun } from '../checkpoint/ingestion-run.js';
import { FeatureUnavailableError, NoContentError } from '../github/client.js';
import { downloadSignedNdjson, fetchDownloadLinks, parseNdjson } from '../github/download.js';
import type { Scope } from '../github/scope.js';
import { ensureOrgExists } from '../silver/common.js';
import type { IngestContext, IngestResult } from './types.js';

export async function ingestSignedNdjsonRows<T>(
  context: IngestContext,
  source: string,
  scope: Scope,
  day: string | null,
  endpoint: string,
  schema: z.ZodType<T>,
  persist: (rows: T[]) => Promise<number>,
): Promise<IngestResult> {
  const orgId = scope.slug;
  if (!context.dryRun) await ensureOrgExists(context.database, orgId);
  const claimed = await claimIngestionRun(context.database, source, orgId, day, context.dryRun);
  if (claimed.skipped) return { source, orgId, day, rowsWritten: 0, status: 'success' };
  try {
    const links = await fetchDownloadLinks(context.client, endpoint);
    const raw = await downloadSignedNdjson(context.client, links.download_links);
    const bronzePath = await writeBronzeNdjson(context.bronzeDir, source, orgId, day, raw);
    const rows = parseNdjson(raw).map((json) => {
      const parsed = schema.safeParse(json);
      if (!parsed.success) throw new Error(`Failed to parse ${source} NDJSON row`, { cause: parsed.error });
      return parsed.data;
    });
    const rowsWritten = context.dryRun ? rows.length : await persist(rows);
    await finalizeIngestionRun(context.database, claimed.runId, 'success', rowsWritten, bronzePath, context.dryRun, context.logger);
    return { source, orgId, day, rowsWritten, status: 'success', bronzePath };
  } catch (error) {
    if (error instanceof NoContentError) {
      await finalizeIngestionRun(context.database, claimed.runId, 'no_content', 0, undefined, context.dryRun, context.logger);
      return { source, orgId, day, rowsWritten: 0, status: 'no_content' };
    }
    await failIngestionRun(context.database, claimed.runId, error, context.dryRun, context.logger);
    throw error;
  }
}

export async function ingestSignedNdjsonReport<T>(
  context: IngestContext,
  source: string,
  scope: Scope,
  day: string | null,
  endpoint: string,
  schema: z.ZodType<T>,
  persist: (report: T) => Promise<number>,
): Promise<IngestResult> {
  const orgId = scope.slug;
  if (!context.dryRun) await ensureOrgExists(context.database, orgId);
  const claimed = await claimIngestionRun(context.database, source, orgId, day, context.dryRun);
  if (claimed.skipped) return { source, orgId, day, rowsWritten: 0, status: 'success' };
  try {
    const links = await fetchDownloadLinks(context.client, endpoint);
    const raw = await downloadSignedNdjson(context.client, links.download_links);
    const bronzePath = await writeBronzeNdjson(context.bronzeDir, source, orgId, day, raw);
    const objects = parseNdjson(raw);
    let rowsWritten = 0;
    for (const json of objects) {
      const parsed = schema.safeParse(json);
      if (!parsed.success) throw new Error(`Failed to parse ${source} report`, { cause: parsed.error });
      rowsWritten += context.dryRun ? 1 : await persist(parsed.data);
    }
    await finalizeIngestionRun(context.database, claimed.runId, 'success', rowsWritten, bronzePath, context.dryRun, context.logger);
    return { source, orgId, day, rowsWritten, status: 'success', bronzePath };
  } catch (error) {
    if (error instanceof NoContentError) {
      await finalizeIngestionRun(context.database, claimed.runId, 'no_content', 0, undefined, context.dryRun, context.logger);
      return { source, orgId, day, rowsWritten: 0, status: 'no_content' };
    }
    await failIngestionRun(context.database, claimed.runId, error, context.dryRun, context.logger);
    throw error;
  }
}

export async function ingestJsonResponse<T>(
  context: IngestContext,
  source: string,
  scope: Scope,
  day: string | null,
  endpoint: string,
  schema: z.ZodType<T>,
  persist: (body: T) => Promise<number>,
  allow404 = false,
): Promise<IngestResult> {
  const orgId = scope.slug;
  if (!context.dryRun) await ensureOrgExists(context.database, orgId);
  const claimed = await claimIngestionRun(context.database, source, orgId, day, context.dryRun);
  if (claimed.skipped) return { source, orgId, day, rowsWritten: 0, status: 'success' };
  try {
    const response = await context.client.request(endpoint, {}, { allow404 });
    const text = await response.text();
    const bronzePath = await writeBronzeNdjson(context.bronzeDir, source, orgId, day, text.endsWith('\n') ? text : `${text}\n`);
    const parsed = schema.safeParse(JSON.parse(text) as unknown);
    if (!parsed.success) throw new Error(`Failed to parse ${source} response`, { cause: parsed.error });
    const rowsWritten = context.dryRun ? countUsageItems(parsed.data) : await persist(parsed.data);
    await finalizeIngestionRun(context.database, claimed.runId, 'success', rowsWritten, bronzePath, context.dryRun, context.logger);
    return { source, orgId, day, rowsWritten, status: 'success', bronzePath };
  } catch (error) {
    if (error instanceof FeatureUnavailableError || error instanceof NoContentError) {
      await finalizeIngestionRun(context.database, claimed.runId, 'no_content', 0, undefined, context.dryRun, context.logger);
      return { source, orgId, day, rowsWritten: 0, status: 'no_content' };
    }
    await failIngestionRun(context.database, claimed.runId, error, context.dryRun, context.logger);
    throw error;
  }
}

function countUsageItems(value: unknown): number {
  const billing = BillingUsageSummarySchema.safeParse(value);
  if (billing.success) return billing.data.usageItems.length;
  const credits = AiCreditsUsageSchema.safeParse(value);
  if (credits.success) return credits.data.usageItems.length;
  return 1;
}
