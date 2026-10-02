/**
 * Fail fast at build/boot rather than at the first request — mirrors
 * com.dygoacademy.backend/src/config/env.validation.ts. A missing or
 * malformed NEXT_PUBLIC_SUPABASE_URL would otherwise surface as a cryptic
 * "fetch failed" deep inside a component tree instead of a clear error here.
 *
 * Only NEXT_PUBLIC_-prefixed vars belong in this file — anything without
 * that prefix is invisible in the browser bundle by design, and importing
 * it here would silently break in the client (undefined, not an error).
 *
 * Every other module reads config through `env`, not `process.env`
 * directly — this file is the single source of truth for what the
 * frontend requires to run.
 */
import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z
    .string()
    .url('NEXT_PUBLIC_API_URL must be a full URL, e.g. http://localhost:3001/api/v1'),
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('NEXT_PUBLIC_SUPABASE_URL must be a full URL, e.g. http://localhost:8000'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required — see com.dygoacademy.frontend/.env.example'),
});

function loadEnv() {
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n  - ');
    throw new Error(
      `Invalid frontend environment configuration:\n  - ${detail}\n\n` +
        'Copy com.dygoacademy.frontend/.env.example to .env.local and fill in the values.',
    );
  }

  return parsed.data;
}

export const env = loadEnv();
