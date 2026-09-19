/**
 * Session-refresh helper used by src/middleware.ts. This is the piece
 * that keeps a signed-in user's cookie valid — without it, access tokens
 * expire mid-session and every Server Component silently sees a logged-out
 * user. Pattern is Supabase's documented one for @supabase/ssr in the
 * Next.js App Router; don't reorder the steps, the comments below say why.
 */
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { CookieOptions } from '@supabase/ssr';

import { env } from '@/config/env';
import { isProtectedPath, ROUTES } from '@/constants/routes';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          // Cookies must be written to both the request (so this same
          // pass sees them) and a fresh response (so the browser does).
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser(), not getSession(): getSession() only decodes the local
  // cookie, which a tampered client could forge. getUser() revalidates
  // against the Supabase Auth server on every call — the one call in this
  // file that's allowed to be "slow" in exchange for actually being safe.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Root is a special case, not just another protected prefix: an
  // anonymous visitor hitting "/" (the signed-in front door since the
  // 2026-09-17 reshuffle) isn't trying to reach a specific page they'll
  // want to resume after logging in -- they're just a guest who landed on
  // the bare domain, so this sends them to the public entry point
  // (live-requested same day, "guest go to the website we should redirect
  // them to search page") instead of dead-ending them on a login form via
  // the generic `?next=` branch below.
  if (!user && request.nextUrl.pathname === ROUTES.home) {
    return NextResponse.redirect(new URL(ROUTES.search, request.url));
  }

  if (!user && isProtectedPath(request.nextUrl.pathname)) {
    const loginUrl = new URL(ROUTES.login, request.url);
    loginUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
