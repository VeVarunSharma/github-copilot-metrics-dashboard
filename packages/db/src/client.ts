import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

export type Database = ReturnType<typeof createDb>;

function maxConnections(): number {
  const parsed = Number.parseInt(process.env.DB_MAX_CONNECTIONS ?? '10', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
}

export function createDb(url: string) {
  const client = postgres(url, { max: maxConnections() });
  return drizzle(client, { schema, casing: 'snake_case' });
}

let singleton: Database | undefined;

function getSingletonDb(): Database {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required to initialize the database client.');
  }

  singleton ??= createDb(url);
  return singleton;
}

export const db = new Proxy({} as Database, {
  get(_target, prop, receiver) {
    return Reflect.get(getSingletonDb() as object, prop, receiver);
  },
});

export async function pingDb(database: Database): Promise<boolean> {
  try {
    await database.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}
