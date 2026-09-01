/**
 * Single source of truth for route paths. Next.js route groups —
 * (auth), (dashboard) — don't appear in the URL, so the paths below are
 * the *actual* browser paths; both src/middleware.ts and any nav
 * component must agree on these, which is the whole reason this file
 * exists instead of each place hardcoding its own strings.
 */

/** Paths that require a signed-in session. Prefix-matched. */
export const PROTECTED_PATH_PREFIXES = [
  '/topics',
  '/study',
  '/quiz',
  '/analytics',
  '/settings',
  '/groups',
  '/join',
] as const;

/** Auth-only paths — a signed-in user is redirected away from these. */
export const AUTH_PATHS = ['/login', '/register'] as const;

export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  topics: '/topics',
  topicsBrowse: '/topics/browse',
  study: '/study',
  quiz: '/quiz',
  analytics: '/analytics',
  settings: '/settings',
  groups: '/groups',
  groupDetail: (groupId: string) => `/groups/${groupId}`,
  /**
   * `/join/:token` — the invite-redemption landing page (wireframe turn 3's
   * "the screen a new student lands on"). Kept under PROTECTED_PATH_PREFIXES
   * rather than public: `POST /invites/:token/redeem` requires a caller
   * identity (the joiner isn't a member yet, but they must be *someone* —
   * see InvitesController's own header comment), so an unauthenticated visit
   * needs to bounce through /login first regardless. middleware.ts's redirect
   * preserves the original path via `next`, so login returns them here.
   */
  join: (token: string) => `/join/${token}`,
} as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((path) => pathname === path);
}
