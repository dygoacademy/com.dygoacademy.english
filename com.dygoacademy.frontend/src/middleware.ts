import { NextResponse, type NextRequest } from 'next/server';

import { GARDEN_PATH_PREFIX, GARDEN_REFERENCE_PREFIX, GARDEN_ROUTES } from '@/constants/garden';
import { ROUTES } from '@/constants/routes';
import {
  GARDEN_UI_COOKIE,
  GARDEN_UI_COOKIE_MAX_AGE,
  GARDEN_UI_QUERY_PARAM,
  isGardenEnabled,
  parseUiQuery,
  type UiVariant,
} from '@/lib/garden-ui';
import { referencePagesAllowed } from '@/lib/garden-reference';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Runs on every matched request before any Server Component. Three jobs:
 * refresh the Supabase session cookie (see lib/supabase/middleware.ts for
 * why that's mandatory, not optional), and turn an expired/missing
 * session into a redirect for anything under PROTECTED_PATH_PREFIXES
 * (src/constants/routes.ts) — this is the edge half of the auth guard.
 * The (dashboard) layout re-checks server-side as defense in depth, in
 * case a route is ever added here without updating the matcher below.
 *
 * Third job (UI-0 of the Word Garden rebuild): the garden UI flag. A
 * `?ui=garden|classic` query stores a per-browser override cookie, and a
 * signed-in, flagged user who lands on the front door ("/") is sent to
 * the garden. With the flag off and no cookie, nothing below changes the
 * response — classic users get exactly what updateSession returned.
 */
export async function middleware(request: NextRequest) {
  const uiOverride = parseUiQuery(request.nextUrl.searchParams.get(GARDEN_UI_QUERY_PARAM));
  if (uiOverride) {
    // Written to the request too, so the Server Components rendering this
    // same request (the (garden) layout's flag gate) already see it.
    request.cookies.set(GARDEN_UI_COOKIE, uiOverride);
  }

  const gardenOn = isGardenEnabled(request.cookies.get(GARDEN_UI_COOKIE)?.value);
  const { pathname } = request.nextUrl;

  // Unflagged requests for /garden/... must look exactly like they did
  // before UI-0: a 404. Done here rather than only in the (garden) layout
  // because the App Router renders a page in parallel with its layouts,
  // so a layout-level notFound() still streams the page's RSC payload
  // (seen with `next dev` on 2026-09-25). Rewriting to a path no route
  // matches gives the app's normal not-found page with a real 404 status.
  if (
    !gardenOn &&
    (pathname === GARDEN_PATH_PREFIX || pathname.startsWith(`${GARDEN_PATH_PREFIX}/`))
  ) {
    return rememberUiOverride(
      NextResponse.rewrite(new URL('/__garden-ui-disabled', request.url)),
      uiOverride,
    );
  }

  // The canvas reference pages (UI-fidelity 4) are a development tool for
  // the pixel diff: they don't exist in production builds unless the build
  // opted in with GARDEN_REFERENCE_PAGES=on (see lib/garden-reference.ts).
  if (
    !referencePagesAllowed() &&
    (pathname === GARDEN_REFERENCE_PREFIX || pathname.startsWith(`${GARDEN_REFERENCE_PREFIX}/`))
  ) {
    return rememberUiOverride(
      NextResponse.rewrite(new URL('/__garden-ui-disabled', request.url)),
      uiOverride,
    );
  }

  let response = await updateSession(request);

  // updateSession only returns a redirect for an auth bounce (anonymous
  // visitor on a protected path). Leave those alone: the garden redirect
  // is for signed-in users, and the next request re-runs this anyway.
  const isAuthRedirect = response.headers.has('location');

  if (!isAuthRedirect && gardenOn && pathname === ROUTES.home) {
    const gardenUrl = new URL(GARDEN_ROUTES.home, request.url);
    const redirect = NextResponse.redirect(gardenUrl);
    // Carry over any refreshed Supabase session cookies.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    response = redirect;
  }

  // UI-G: invite links are the classic /join/<token> (they work for
  // everyone). A signed-in, flagged user opens the garden's join screen
  // (GR6) instead. Unflagged users get exactly what they got before.
  const joinToken = pathname.match(/^\/join\/([^/]+)\/?$/)?.[1];
  if (!isAuthRedirect && gardenOn && joinToken && !response.headers.has('location')) {
    const redirect = NextResponse.redirect(new URL(GARDEN_ROUTES.join(joinToken), request.url));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    response = redirect;
  }

  return rememberUiOverride(response, uiOverride);
}

/** Persists a `?ui=` choice on whatever response this request ends with. */
function rememberUiOverride(response: NextResponse, uiOverride: UiVariant | null): NextResponse {
  if (uiOverride) {
    response.cookies.set(GARDEN_UI_COOKIE, uiOverride, {
      path: '/',
      maxAge: GARDEN_UI_COOKIE_MAX_AGE,
      sameSite: 'lax',
    });
  }
  return response;
}

export const config = {
  matcher: [
    /*
     * Match every path except static assets and Next internals — running
     * the session refresh on those would be wasted work, not a security
     * issue, but there's no reason to pay for it.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
