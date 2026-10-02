import { NextResponse, type NextRequest } from 'next/server';

import { GARDEN_REFERENCE_PREFIX, GARDEN_ROUTES } from '@/constants/garden';
import { ROUTES } from '@/constants/routes';
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
 * Since UI-8 U8-3 the Word Garden is the only signed-in UI: the front
 * door ("/"), invite links (/join/<token>) and the deleted classic paths
 * redirect into /garden. U8-5 replaces these with the final short URLs.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The canvas reference pages (UI-fidelity 4) are a development tool for
  // the pixel diff: they don't exist in production builds unless the build
  // opted in with GARDEN_REFERENCE_PAGES=on (see lib/garden-reference.ts).
  if (
    !referencePagesAllowed() &&
    (pathname === GARDEN_REFERENCE_PREFIX || pathname.startsWith(`${GARDEN_REFERENCE_PREFIX}/`))
  ) {
    return NextResponse.rewrite(new URL('/__garden-ui-disabled', request.url));
  }

  const response = await updateSession(request);

  // updateSession only returns a redirect for an auth bounce (anonymous
  // visitor on a protected path). Leave those alone: the garden redirect
  // is for signed-in users, and the next request re-runs this anyway.
  if (response.headers.has('location')) return response;

  const target = gardenTarget(pathname);
  if (!target) return response;

  const redirect = NextResponse.redirect(new URL(target, request.url));
  // Carry over any refreshed Supabase session cookies.
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

/** Where a signed-in request for the front door or a classic path goes. */
function gardenTarget(pathname: string): string | null {
  if (pathname === ROUTES.home) return GARDEN_ROUTES.home;

  const joinToken = pathname.match(/^\/join\/([^/]+)\/?$/)?.[1];
  if (joinToken) return GARDEN_ROUTES.join(decodeURIComponent(joinToken));

  const topicId = pathname.match(/^\/topics\/([^/]+)\/?$/)?.[1];
  if (topicId) return GARDEN_ROUTES.topic(decodeURIComponent(topicId));

  const groupId = pathname.match(/^\/groups\/([^/]+)\/?$/)?.[1];
  if (groupId) return GARDEN_ROUTES.group(decodeURIComponent(groupId));

  const path = pathname.replace(/\/$/, '');
  if (path === '/study') return GARDEN_ROUTES.review;
  if (path === '/topics') return GARDEN_ROUTES.topics;
  if (path === '/quiz') return GARDEN_ROUTES.quiz();
  if (path === '/groups') return GARDEN_ROUTES.groups;
  if (path === '/analytics' || path === '/settings') return GARDEN_ROUTES.me;
  return null;
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
