/**
 * UI-A auth paths. `/forgot-password` and `/reset-password` (A-4) are
 * garden-only pages; `routes.ts` is left alone until UI-8, so the auth
 * screens keep their links here.
 */
export const AUTH_HREFS = {
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
} as const;

/**
 * The `?next=` path to land on after sign-in, only if it stays on this
 * site (a path like `/join/abc`, never `//evil.example` or a full URL).
 */
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return null;
  }
  return value;
}

/**
 * The invite token when `next` is a join link (`/join/<token>`, UI-8 U8-5;
 * an old `/garden/join/<token>` link is redirected there first): the
 * register page then reads as AU3.
 */
export function inviteTokenFromNext(next: string | null | undefined): string | null {
  const match = next?.match(/^\/join\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** An auth page link that keeps the `?next=` path (sign in ↔ create account). */
export function authHrefWithNext(href: string, next: string | null | undefined): string {
  return next ? `${href}?next=${encodeURIComponent(next)}` : href;
}
