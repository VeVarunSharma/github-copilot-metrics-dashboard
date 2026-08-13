import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';

/**
 * Load `.env` by walking up from the current working directory to the workspace root.
 *
 * pnpm runs filtered package scripts (e.g. `pnpm --filter @ghcp-dash/db migrate`) with the
 * cwd set to the package directory, which has no `.env`. Plain `import 'dotenv/config'` only
 * reads `<cwd>/.env`, so it silently misses the root `.env` and leaves `DATABASE_URL` unset.
 * This walk-up matches the collector's env discovery so every db script behaves the same way
 * regardless of where it is invoked from. Existing process env vars are never overridden.
 */
export function loadEnvFromWorkspaceRoot(maxDepth = 6): void {
  let dir = process.cwd();
  for (let i = 0; i < maxDepth; i += 1) {
    const candidate = resolve(dir, '.env');
    if (existsSync(candidate)) {
      loadDotenv({ path: candidate });
      return;
    }
    const parent = dirname(dir);
    if (parent === dir) return;
    dir = parent;
  }
}
