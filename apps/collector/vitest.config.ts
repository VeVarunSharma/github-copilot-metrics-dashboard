import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node', globals: true },
  resolve: {
    alias: {
      '@ghcp-dash/contracts': fileURLToPath(new URL('../../packages/contracts/src/index.ts', import.meta.url)),
      '@ghcp-dash/db': fileURLToPath(new URL('../../packages/db/src/index.ts', import.meta.url)),
      '@ghcp-dash/value': fileURLToPath(new URL('../../packages/value/src/index.ts', import.meta.url)),
    },
  },
});
