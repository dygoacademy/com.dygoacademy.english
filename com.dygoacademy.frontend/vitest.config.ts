import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Frontend unit tests (Phase 12 plan UI-2). Vitest + Testing Library in
 * jsdom. Tests sit next to the code as `*.test.ts(x)`. Run `npm test`.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // src/config/env.ts refuses to load without these; tests never call the
    // real API or Supabase, so placeholders are enough (no .env.local needed).
    env: {
      NEXT_PUBLIC_API_URL: 'http://localhost:3001/api/v1',
      NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
});
