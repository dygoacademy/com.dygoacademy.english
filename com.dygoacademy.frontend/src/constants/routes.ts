/**
 * Single source of truth for route paths. Next.js route groups —
 * (auth), (dashboard) — don't appear in the URL, so the paths below are
 * the *actual* browser paths; both src/middleware.ts and any nav
 * component must agree on these, which is the whole reason this file
 * exists instead of each place hardcoding its own strings.
 *
 * URL reshuffle (live-requested 2026-09-17, "that will make more sense
 * for now"): what used to be three separate ideas at three separate URLs
 * — the public guest trial at "/", the signed-in due-now dashboard at
 * "/topics", and the topics grid at "/topics/browse" — moved one level
 * each: "/" is now the signed-in front door (was "/topics"), "/topics" is
 * now the grid (was "/topics/browse"), and the guest trial moved out to
 * "/search". ROUTES.home and ROUTES.topics keep their names because what
 * they conceptually point to (the front door, the topics section) hasn't
 * changed — only which URL serves it has. Every call site below was
 * updated to match; see git history on this file for the URLs each
 * constant used to hold if you're tracing an old bookmark or log line.
 */

/** Paths that require a signed-in session. Prefix-matched. */
export const PROTECTED_PATH_PREFIXES = [
  // The signed-in front door itself — was implicitly covered by the old
  // '/topics' entry back when the front door lived at that URL; now that
  // it's at the bare root, it needs its own entry. isProtectedPath's
  // `pathname === prefix` check means this only ever matches the exact
  // "/", never every route (a naive prefix-match on '/' would).
  '/',
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
  /** Signed-in front door (due-now dashboard) — was "/topics" until the 2026-09-17 reshuffle. */
  home: '/',
  login: '/login',
  register: '/register',
  /** Anonymous "try one word" landing page — was "/" until the 2026-09-17 reshuffle. */
  search: '/search',
  /** Topics grid — was "/topics/browse" until the 2026-09-17 reshuffle. */
  topics: '/topics',
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

/**
 * Phase 9, "Targeted Re-Quiz" — a one-shot `sessionStorage` handoff of the
 * missed word ids from `study/page.tsx` to `quiz/page.tsx?mode=requiz`,
 * instead of a query param (a comma-joined list of UUIDs in the URL is
 * ugly and has a length edge case this doesn't). Lives here rather than
 * in either page file, same reasoning as this file's own header on
 * `ROUTES` — both the writer and the reader must agree on the exact key
 * string, so it belongs in one shared place, not exported from one page
 * file into another. `quiz/page.tsx` reads this once on mount and
 * doesn't rely on it surviving past that — a stale value from an earlier
 * session is harmless, since it's only ever read immediately after
 * `study/page.tsx` just wrote it.
 */
export const REQUIZ_STORAGE_KEY = 'dygo:requiz-word-ids';
