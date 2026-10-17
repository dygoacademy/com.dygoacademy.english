/**
 * Browser Supabase client — for Client Components only. Safe to call
 * per-render; the returned client is stateless config, not a connection.
 *
 * Usage: `import { createClient } from '@/lib/supabase/client'`.
 */
import { createBrowserClient } from '@supabase/ssr';

import { env } from '@/config/env';

import { AUTH_COOKIE_OPTIONS } from '@/lib/supabase/cookie';

export function createClient() {
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
  });
}
