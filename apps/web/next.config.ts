import type { NextConfig } from 'next';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

// Next.js only auto-loads .env files from the app directory (apps/web), not the
// workspace root. The collector already walks up to find the root .env; without
// this, `pnpm web` starts without DATABASE_URL/AUTH_MODE unless the caller
// exports them manually. Load the root .env here, letting any pre-set process.env
// value win so inline env and deployment secrets are never overridden.
//
// Credential boundary (Constitution P3): the web app MUST NOT hold GitHub
// credentials. GITHUB_* keys are collector-only, so they are never loaded here
// even if present in the shared root .env.
function loadRootEnv(root: string): void {
  const envPath = join(root, '.env');
  if (!existsSync(envPath)) return;
  for (const rawLine of readFileSync(envPath, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!key || key.startsWith('GITHUB_') || key in process.env) continue;
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadRootEnv(repoRoot);

const nextConfig: NextConfig = {
  // Standalone output is only needed for the Docker image (Dockerfile.web sets BUILD_STANDALONE=1).
  // Leaving it unset locally lets `next build && next start` work normally without the
  // "next start does not work with output: standalone" warning / broken serving.
  output: process.env.BUILD_STANDALONE === '1' ? 'standalone' : undefined,
  outputFileTracingRoot: repoRoot,
  transpilePackages: ['@ghcp-dash/contracts', '@ghcp-dash/db', '@ghcp-dash/value'],
  webpack(config) {
    config.resolve.extensionAlias = { '.js': ['.ts', '.tsx', '.js'] };
    return config;
  },
};

export default nextConfig;
