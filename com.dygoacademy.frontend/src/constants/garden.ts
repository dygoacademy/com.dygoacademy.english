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
  /** A8 Me. */
  me: '/garden/me',
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
