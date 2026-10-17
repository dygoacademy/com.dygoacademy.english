/**
 * Server Supabase client — for Server Components, Route Handlers, and
 * Server Actions. Reads/writes the session via Next's `cookies()`.
 *
 * A Server Component calling `.setAll()` (as auth token refresh does) will
 * throw, because Server Components can't set cookies — that's expected
 * and safe to ignore *only* because src/middleware.ts refreshes the
 * session on every request before a Server Component ever runs. Route
 * Handlers and Server Actions don't have this restriction.
 *
 * Usage: `const supabase = await createServerSupabaseClient()`.
 */
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { env } from '@/config/env';

import { AUTH_COOKIE_OPTIONS } from '@/lib/supabase/cookie';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component — see the module doc above.
        }
      },
    },
  });
}
