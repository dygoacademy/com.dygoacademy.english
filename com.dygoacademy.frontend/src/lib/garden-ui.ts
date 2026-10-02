/**
 * Word Garden UI flag (ui rebuild implementation plan.md, UI-0).
 *
 * Two ways in, one way out:
 *  - NEXT_PUBLIC_GARDEN_UI=true turns the garden on for everyone on that
 *    deployment (the UI-8 switch-over).
 *  - `?ui=garden` on any URL sets the GARDEN_UI_COOKIE for one browser
 *    (beta users, Dylan testing on a real iPhone).
 *
 * The `?ui=classic` escape hatch was removed in UI-8 (2026-10-02): there is
 * no way to opt back into the classic UI. A leftover "classic" cookie is
 * ignored, so the env flag decides for that browser.
 *
 * Deliberately free of next/headers and next/server imports so the same
 * helpers work in middleware (edge) and in Server Components.
 */
import { env } from '@/config/env';

export const GARDEN_UI_COOKIE = 'dygo_ui';
export const GARDEN_UI_QUERY_PARAM = 'ui';
/** One year — the override should outlive a browser restart. */
export const GARDEN_UI_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type UiVariant = 'garden';

/** The deployment-wide flag. Only the literal "true" turns it on. */
export function isGardenFlagOn(): boolean {
  return env.NEXT_PUBLIC_GARDEN_UI === 'true';
}

/**
 * Reads a `?ui=` query value. Anything other than "garden" (including the
 * removed "classic") is ignored (returns null), so it never changes state.
 */
export function parseUiQuery(value: string | null | undefined): UiVariant | null {
  return value === 'garden' ? value : null;
}

/** Whether a request with this cookie value should see the garden. */
export function isGardenEnabled(cookieValue: string | null | undefined): boolean {
  return cookieValue === 'garden' || isGardenFlagOn();
}
