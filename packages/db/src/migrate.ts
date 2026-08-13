import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { loadEnvFromWorkspaceRoot } from './load-env.js';

loadEnvFromWorkspaceRoot();

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is required to run migrations.');
}

const max = Number.parseInt(process.env.DB_MAX_CONNECTIONS ?? '1', 10);
const client = postgres(url, { max: Number.isFinite(max) && max > 0 ? max : 1 });
const database = drizzle(client, { casing: 'snake_case' });
const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), '../drizzle');

try {
  await migrate(database, { migrationsFolder });
  console.log('Database migrations completed.');
} finally {
  await client.end();
}
