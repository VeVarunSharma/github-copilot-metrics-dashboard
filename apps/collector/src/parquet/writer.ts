import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { sql, type SQL } from 'drizzle-orm';
import { type Database } from '@ghcp-dash/db';
import parquet from 'parquetjs-lite';
const { ParquetSchema, ParquetWriter } = parquet;

const SILVER_TABLES = [
  'dim_org',
  'dim_user',
  'dim_team',
  'dim_feature',
  'dim_ide',
  'dim_language',
  'dim_model',
  'fact_org_daily',
  'fact_org_daily_by_feature',
  'fact_org_daily_by_ide',
  'fact_org_daily_by_language_feature',
  'fact_org_daily_by_language_model',
  'fact_org_daily_by_model_feature',
  'fact_user_daily',
  'fact_user_daily_by_feature',
  'fact_user_daily_by_ide',
  'fact_user_daily_by_language_feature',
  'bridge_user_team',
  'fact_billing_daily',
  'fact_ai_credits_daily',
  'ingestion_run',
  'settings',
];

function rowsFromResult(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  if (result !== null && typeof result === 'object' && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: Record<string, unknown>[] }).rows;
  }
  return [];
}

function fieldType(value: unknown): Record<string, unknown> {
  if (typeof value === 'number') return Number.isInteger(value) ? { type: 'INT64', optional: true } : { type: 'DOUBLE', optional: true };
  if (typeof value === 'bigint') return { type: 'INT64', optional: true };
  if (typeof value === 'boolean') return { type: 'BOOLEAN', optional: true };
  return { type: 'UTF8', optional: true };
}

function serialize(value: unknown): unknown {
  if (typeof value === 'bigint') return Number(value);
  if (value instanceof Date) return value.toISOString();
  if (value !== null && typeof value === 'object') return JSON.stringify(value);
  return value;
}

async function exportTable(database: Database, outDir: string, tableName: string): Promise<void> {
  const result = await database.execute(sql.raw(`select * from ${tableName}`) as SQL);
  const rows = rowsFromResult(result);
  const sample = rows[0] ?? { empty: '' };
  const schema = new ParquetSchema(Object.fromEntries(Object.entries(sample).map(([key, value]) => [key, fieldType(value)])));
  const writer = await ParquetWriter.openFile(schema, resolve(outDir, `${tableName}.parquet`));
  for (const row of rows) {
    await writer.appendRow(Object.fromEntries(Object.entries(row).map(([key, value]) => [key, serialize(value)])));
  }
  await writer.close();
}

export async function exportSilverParquet(database: Database, out: string): Promise<number> {
  const outDir = resolve(out, 'silver');
  await mkdir(outDir, { recursive: true });
  for (const tableName of SILVER_TABLES) await exportTable(database, outDir, tableName);
  return SILVER_TABLES.length;
}
