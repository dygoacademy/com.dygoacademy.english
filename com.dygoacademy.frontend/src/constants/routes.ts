/**
 * Single source of truth for route paths. Next.js route groups —
 * (auth), (garden) — don't appear in the URL, so the paths below are
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
 * "/search". UI-8 U8-3 deleted the classic signed-in screens, and U8-5
 * gave the garden its final short URLs (decision 1): `/garden` is the
 * home, the screens live at /review, /topics/**, /missions, /me,
 * /groups/**, /quiz and /join/**. legacyRedirect() below maps the old
 * `/garden/<x>` and classic paths onto them (permanent redirects in
 * middleware.ts). The guest trial at "/search" was deleted on 2026-10-03
 * (the public home page at "/" replaced it); "/search" now redirects to "/".
 */

import { GARDEN_REFERENCE_PREFIX, GARDEN_ROUTES } from './garden';

/** Paths that require a signed-in session. Prefix-matched. */
export const PROTECTED_PATH_PREFIXES = [
  // The signed-in front door itself — was implicitly covered by the old
  // '/topics' entry back when the front door lived at that URL; now that
  // it's at the bare root, it needs its own entry. isProtectedPath's
  // `pathname === prefix` check means this only ever matches the exact
  // "/", never every route (a naive prefix-match on '/' would).
  '/',
  // Word Garden screens at their final short URLs (UI-8 U8-5). '/join'
  // too: redeeming an invite needs a session.
  '/review',
  '/topics',
  '/missions',
  '/me',
  '/groups',
  '/quiz',
  '/join',
  // Phase 13 Sound Garden / The Pond.
  '/sounds',
  // Onboarding OB1–OB5 (/welcome/level … /welcome/ready), right after sign-up.
  '/welcome',
  // The garden home (Phase 12 UI-3 U3-5a): listing it lets middleware.ts
  // bounce through /login and come back with `next`. The dev/fixture
  // pages under it are carved out in PUBLIC_GARDEN_DEV_PREFIXES; old
  // /garden/<x> links are redirected before the auth check.
  '/garden',
] as const;

/**
 * Garden dev/fixture pages that stay public even though '/garden' is
 * protected: `npm run garden:diff` and the Playwright screenshot suite load
 * them signed out. They're still gated by the garden flag (and the reference
 * pages by GARDEN_REFERENCE_PAGES) in middleware.ts, and render only canvas
 * sample data, never a user's.
 */
export const PUBLIC_GARDEN_DEV_PREFIXES = [
  GARDEN_REFERENCE_PREFIX,
  GARDEN_ROUTES.gallery,
  GARDEN_ROUTES.tokens,
] as const;

/** Auth-only paths — a signed-in user is redirected away from these. */
export const AUTH_PATHS = ['/login', '/register'] as const;

export const ROUTES = {
  /** Bare domain: signed in → /garden, signed out → the public home page (Home page HP-1). */
  home: '/',
  login: '/login',
  register: '/register',
} as const;

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isProtectedPath(pathname: string): boolean {
  if (PUBLIC_GARDEN_DEV_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))) {
    return false;
  }
  return PROTECTED_PATH_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

export function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((path) => pathname === path);
}

/** Garden screens that moved from `/garden/<x>` to `/<x>` in UI-8 U8-5. */
export const LEGACY_GARDEN_SEGMENTS = [
  'review',
  'topics',
  'missions',
  'me',
  'groups',
  'quiz',
  'join',
] as const;

/** Deleted classic paths (UI-8 U8-3) and where they live now. */
const LEGACY_CLASSIC_PATHS: Record<string, string> = {
  '/study': GARDEN_ROUTES.review,
  '/analytics': GARDEN_ROUTES.me,
  '/settings': GARDEN_ROUTES.me,
  // The guest "try one word" page, deleted 2026-10-03: the public home page
  // at "/" (Home page HP-1) replaced it.
  '/search': '/',
};

/**
 * The final URL for an old path (UI-8 U8-5, decision 1), or null when the
 * path is already final. Path only: middleware.ts keeps the query string
 * and answers with a permanent (308) redirect, before the auth check, so a
 * signed-out visitor bounces through /login with the new path as `next`.
 * `/garden/<x>/rest` → `/<x>/rest` for the moved screens; the dev pages
 * (/garden/_reference, _gallery, _tokens) and `/garden` itself stay.
 * The signed-in `/` → `/garden` hop depends on the session, so it isn't
 * here (see middleware.ts).
 */
export function legacyRedirect(pathname: string): string | null {
  const garden = pathname.match(/^\/garden\/([^/]+)(\/.*)?$/);
  if (garden && (LEGACY_GARDEN_SEGMENTS as readonly string[]).includes(garden[1])) {
    return `/${garden[1]}${garden[2] ?? ''}`;
  }
  const path = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  return LEGACY_CLASSIC_PATHS[path] ?? null;
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
