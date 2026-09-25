import { getRequestConfig } from 'next-intl/server';

/**
 * next-intl request config (design system §14.8, rebuild plan UI-1).
 *
 * English only for now: zh-CN and vi messages arrive in UI-7, and the
 * locale will then come from the profile's `ui_locale` (falling back to
 * the device language). No locale segment in the URL — the garden keeps
 * its /garden/... paths until the final-URL decision is made.
 *
 * Only the (garden) route group uses next-intl; classic screens keep
 * their hard-coded English strings until UI-8 deletes them.
 */
export const DEFAULT_LOCALE = 'en';

export default getRequestConfig(async () => {
  const locale = DEFAULT_LOCALE;
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
