/**
 * Word Garden UI flag (ui rebuild implementation plan.md, UI-0).
 *
 * Two ways in, one way out:
 *  - NEXT_PUBLIC_GARDEN_UI=true turns the garden on for everyone on that
 *    deployment (the UI-8 switch-over).
 *  - `?ui=garden` on any URL sets the GARDEN_UI_COOKIE for one browser
 *    (beta users, Dylan testing on a real iPhone). `?ui=classic` stores
 *    "classic" instead, which also beats the env flag — that is the
 *    one-week escape hatch UI-8 needs once the flag defaults to on.
 *
 * Deliberately free of next/headers and next/server imports so the same
 * helpers work in middleware (edge) and in Server Components.
 */
import { env } from '@/config/env';

export const GARDEN_UI_COOKIE = 'dygo_ui';
export const GARDEN_UI_QUERY_PARAM = 'ui';
/** One year — the override should outlive a browser restart. */
export const GARDEN_UI_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type UiVariant = 'garden' | 'classic';

/** The deployment-wide flag. Only the literal "true" turns it on. */
export function isGardenFlagOn(): boolean {
  return env.NEXT_PUBLIC_GARDEN_UI === 'true';
}

/**
 * Reads a `?ui=` query value. Anything other than the two known variants
 * is ignored (returns null), so a stray `?ui=` never changes state.
 */
export function parseUiQuery(value: string | null | undefined): UiVariant | null {
  return value === 'garden' || value === 'classic' ? value : null;
}

/** Whether a request with this cookie value should see the garden. */
export function isGardenEnabled(cookieValue: string | null | undefined): boolean {
  if (cookieValue === 'classic') return false;
  return cookieValue === 'garden' || isGardenFlagOn();
}
