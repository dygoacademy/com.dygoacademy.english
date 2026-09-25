/**
 * Paths for the Word Garden UI rebuild (ui rebuild implementation plan.md).
 *
 * Kept out of constants/routes.ts on purpose while both UIs live side by
 * side: the final URLs are an open decision in the plan, so every new
 * screen lives under /garden/... for now. UI-8 folds these into ROUTES
 * (and PROTECTED_PATH_PREFIXES) when the garden moves to its final URLs.
 */
export const GARDEN_ROUTES = {
  /** Today's Garden (A1) — an empty placeholder until UI-4. */
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
} as const;

export const GARDEN_PATH_PREFIX = '/garden';
