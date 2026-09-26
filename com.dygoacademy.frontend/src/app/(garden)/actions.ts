'use server';

import { cookies } from 'next/headers';

import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, isAppLocale } from '@/i18n/config';

/**
 * Stores the garden language in the `dygo_locale` cookie (UI-L). The
 * language sheet calls it together with the profile update, so the
 * choice also holds before sign-in and on a device whose profile read
 * fails. The profile's `ui_locale` still wins when both are set.
 */
export async function setGardenLocaleCookie(locale: string): Promise<void> {
  if (!isAppLocale(locale)) return;
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: 'lax',
  });
}
