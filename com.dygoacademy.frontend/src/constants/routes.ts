/**
 * Single source of truth for route paths. Next.js route groups —
 * (auth), (dashboard) — don't appear in the URL, so the paths below are
 * the *actual* browser paths; both src/middleware.ts and any nav
 * component must agree on these, which is the whole reason this file
 * exists instead of each place hardcoding its own strings.
 */

/** Paths that require a signed-in session. Prefix-matched. */
export const PROTECTED_PATH_PREFIXES = ['/topics', '/study', '/analytics', '/settings'] as const;

/** Auth-only paths — a signed-in user is redirected away from these. */
export const AUTH_PATHS = ['/login', '/register'] as const;

export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  topics: '/topics',
  study: '/study',
  analytics: '/analytics',
  settings: '/settings',
} as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((path) => pathname === path);
}
