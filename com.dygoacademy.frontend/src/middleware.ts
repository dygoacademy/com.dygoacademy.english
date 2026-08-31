import type { NextRequest } from 'next/server';

import { updateSession } from '@/lib/supabase/middleware';

/**
 * Runs on every matched request before any Server Component. Two jobs:
 * refresh the Supabase session cookie (see lib/supabase/middleware.ts for
 * why that's mandatory, not optional), and turn an expired/missing
 * session into a redirect for anything under PROTECTED_PATH_PREFIXES
 * (src/constants/routes.ts) — this is the edge half of the auth guard.
 * The (dashboard) layout re-checks server-side as defense in depth, in
 * case a route is ever added here without updating the matcher below.
 */
export async function middleware(request: NextRequest) {
  return updateSession(request);
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
