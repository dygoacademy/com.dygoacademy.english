/**
 * UI-A auth paths. `/forgot-password` arrives with A-4; `routes.ts` is
 * left alone until UI-8, so the auth screens keep their links here.
 */
export const AUTH_HREFS = {
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
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
