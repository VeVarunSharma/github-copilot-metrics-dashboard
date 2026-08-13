import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true },
  resolve: { alias: { '@': path.resolve(__dirname, 'src'), '@ghcp-dash/value': path.resolve(__dirname, '../../packages/value/src/index.ts'), '@ghcp-dash/contracts': path.resolve(__dirname, '../../packages/contracts/src/index.ts'), '@ghcp-dash/db': path.resolve(__dirname, '../../packages/db/src/index.ts') } },
});
