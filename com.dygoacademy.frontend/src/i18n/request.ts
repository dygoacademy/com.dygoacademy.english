import { getRequestConfig } from 'next-intl/server';

import { getGardenLocaleContext } from './garden-locale';
import { loadMessages } from './messages';

/**
 * next-intl request config (design system §14, phase 12 plan UI-L).
 *
 * The app language comes from the profile's `ui_locale`, then the
 * `dygo_locale` cookie, then `Accept-Language`, then English (see
 * `config.ts`). No locale segment in the URL. next-intl is handed the
 * *formatting* locale (en-US, vi-VN or zh-CN) so every
 * `useFormatter()` call formats for the learner's region, plus the
 * learner's time zone.
 *
 * Only the garden route groups call next-intl; classic screens keep
 * their hard-coded English strings until UI-8 deletes them. The canvas
 * reference pages pick their language from `?locale=` and pass their
 * own messages to the provider (see (garden-reference)).
 */
export default getRequestConfig(async () => {
  const context = await getGardenLocaleContext();
  return {
    locale: context.formatLocale,
    timeZone: context.timeZone,
    messages: await loadMessages(context.appLocale),
  };
});
