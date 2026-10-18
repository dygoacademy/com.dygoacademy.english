/**
 * Who is signed in, for server code (middleware, layouts, pages), without a
 * round trip to the auth server on every request (2026-10-18).
 *
 * `getSession()` reads the session cookie and only calls the auth server
 * when the access token has expired and needs refreshing; the token is then
 * verified locally with SUPABASE_JWT_SECRET (see ./jwt.ts), so a forged or
 * tampered cookie still counts as signed out.
 *
 * SUPABASE_JWT_SECRET is server-only (no NEXT_PUBLIC_ prefix), loaded by
 * Next from com.dygoacademy.frontend/.env.production.local on UAT. Without
 * it this falls back to `getUser()`, the old per-request auth-server check,
 * so a missing secret is slower, never less safe.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { verifyAccessToken } from '@/lib/supabase/jwt';

export interface SessionUser {
  id: string;
  email?: string;
}

export async function getSessionUser(supabase: SupabaseClient): Promise<SessionUser | null> {
  const secret = process.env.SUPABASE_JWT_SECRET;

  if (!secret) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user ? { id: user.id, email: user.email } : null;
  }

  // Only the access token is read: `session.user` comes straight from the
  // cookie and isn't trusted (supabase-js warns when server code reads it).
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return null;

  const claims = await verifyAccessToken(session.access_token, secret);
  return claims ? { id: claims.sub, email: claims.email } : null;
}

/**
 * Where server code reaches Supabase. On UAT the Next server and Kong run on
 * the same Mac, so SUPABASE_INTERNAL_URL (http://localhost:8000) skips the
 * trip out through Cloudflare and back down the tunnel. The browser always
 * uses NEXT_PUBLIC_SUPABASE_URL. The session cookie name is pinned
 * (./cookie.ts), so the two URLs share one cookie.
 */
export function supabaseServerUrl(publicUrl: string): string {
  return process.env.SUPABASE_INTERNAL_URL || publicUrl;
}
