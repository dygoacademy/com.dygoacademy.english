/**
 * Paths for the Word Garden UI rebuild (ui rebuild implementation plan.md).
 *
 * Kept out of constants/routes.ts on purpose while both UIs live side by
 * side: the final URLs are an open decision in the plan, so every new
 * screen lives under /garden/... for now. UI-8 folds these into ROUTES
 * (and PROTECTED_PATH_PREFIXES) when the garden moves to its final URLs.
 */
export const GARDEN_ROUTES = {
  /** Today's Garden (A1), or Welcome back (A5) after 2+ missed days. */
  home: '/garden',
  /**
   * Flag-only token/type test page (UI-1). The folder is `%5Ftokens`
   * because a leading underscore marks a private, non-routable folder in
   * the App Router; `%5F` is Next's documented escape for a URL segment
   * that really starts with `_`.
   */
  tokens: '/garden/_tokens',
  /** Flag-only component gallery (UI-2); folder `%5Fgallery`, same reason. */
  gallery: '/garden/_gallery',
  /** A2 Review (watering) and A3 Mission complete. */
  review: '/garden/review',
  reviewDone: '/garden/review/done',
  /** A4 Weekly harvest. */
  missions: '/garden/missions',
  /** A6 Topics and A7 Topic bed. */
  topics: '/garden/topics',
  topic: (id: string) => `/garden/topics/${encodeURIComponent(id)}`,
  /** Garden quiz (U5-5/6): a bed's quiz, or the leech drill back to that bed. */
  quiz: (topicId?: string, mode?: 'leech') => {
    const params = new URLSearchParams();
    if (topicId) params.set('topic', topicId);
    if (mode) params.set('mode', mode);
    const query = params.toString();
    return query ? `/garden/quiz?${query}` : '/garden/quiz';
  },
  /** A8 Me. */
  me: '/garden/me',
  /** UI-G shared gardens: GR1 list, GR2 a garden, GR3/GR4 tend (admins), GR6 join. */
  groups: '/garden/groups',
  group: (id: string) => `/garden/groups/${encodeURIComponent(id)}`,
  groupManage: (id: string, tab: 'tricky' | 'gardeners' = 'tricky') =>
    `/garden/groups/${encodeURIComponent(id)}/manage${tab === 'gardeners' ? '?tab=gardeners' : ''}`,
  join: (token: string) => `/garden/join/${encodeURIComponent(token)}`,
  /**
   * Flag-only, dev-only canvas reference pages (UI-fidelity 4): each renders
   * one screen with the canvas sample data for the pixel diff. Folder
   * `%5Freference`, same reason as above.
   */
  reference: (name: string) => `/garden/_reference/${name}`,
} as const;

/** Path prefix of the reference pages (they 404 in production). */
export const GARDEN_REFERENCE_PREFIX = '/garden/_reference';

export const GARDEN_PATH_PREFIX = '/garden';

/**
 * iPad navigation (UI-3 U3-2): the side rail at `medium` (600–1023px) and the
 * sidebar at `expanded` (≥ 1024px) in place of the bottom tab bar. Off unless
 * NEXT_PUBLIC_GARDEN_IPAD_NAV is the literal "true"; UI-7 turns it on with
 * the iPad layouts. Below 600px the tab bar is unchanged either way.
 */
export function isGardenIpadNavOn(
  value: string | undefined = process.env.NEXT_PUBLIC_GARDEN_IPAD_NAV,
): boolean {
  return value === 'true';
}
