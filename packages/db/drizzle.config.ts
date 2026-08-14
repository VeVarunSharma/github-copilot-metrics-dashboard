import { defineConfig } from 'drizzle-kit';
import { loadEnvFromWorkspaceRoot } from './src/load-env.js';

loadEnvFromWorkspaceRoot();

if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL is not set; drizzle-kit commands that connect to the database will fail.');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/*.ts',
  out: './drizzle',
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
});
