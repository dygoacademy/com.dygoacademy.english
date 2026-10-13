import { NextResponse, type NextRequest } from 'next/server';

import { GARDEN_REFERENCE_PREFIX } from '@/constants/garden';
import { legacyRedirect } from '@/constants/routes';
import { referencePagesAllowed } from '@/lib/garden-reference';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Runs on every matched request before any Server Component. Jobs:
 * refresh the Supabase session cookie (see lib/supabase/middleware.ts for
 * why that's mandatory, not optional), and turn an expired/missing
 * session into a redirect for anything under PROTECTED_PATH_PREFIXES
 * (src/constants/routes.ts) — this is the edge half of the auth guard.
 * The (garden) layout re-checks server-side as defense in depth.
 *
 * Since UI-8 U8-3 the Word Garden is the only signed-in UI, and since
 * U8-5 it lives at the final short URLs (decision 1): old `/garden/<x>`
 * links and the deleted classic paths get a permanent redirect (query
 * kept) before anything else. "/" is decided in updateSession (Home page
 * HP-1): signed in → /garden, signed out → the public home page.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Old URLs → final short URLs (UI-8 U8-5). Before the session check, so
  // a signed-out visitor's `next` is already the new path.
  const moved = legacyRedirect(pathname);
  if (moved) {
    const url = request.nextUrl.clone();
    url.pathname = moved;
    return NextResponse.redirect(url, 308);
  }

  // The canvas reference pages (UI-fidelity 4) are a development tool for
  // the pixel diff: they don't exist in production builds unless the build
  // opted in with GARDEN_REFERENCE_PAGES=on (see lib/garden-reference.ts).
  if (
    !referencePagesAllowed() &&
    (pathname === GARDEN_REFERENCE_PREFIX || pathname.startsWith(`${GARDEN_REFERENCE_PREFIX}/`))
  ) {
    return NextResponse.rewrite(new URL('/__garden-ui-disabled', request.url));
  }

  // Also answers "/": signed in → /garden, signed out → the public home
  // page (see lib/supabase/middleware.ts).
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match every path except static assets and Next internals — running
     * the session refresh on those would be wasted work, not a security
     * issue, but there's no reason to pay for it.
     * The PWA files (manifest, service worker, offline page) are static too.
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
