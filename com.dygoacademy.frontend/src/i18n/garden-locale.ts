/**
 * The signed-in learner's language settings for one request (UI-L).
 * Server only: reads the session, the profile row, the `dygo_locale`
 * cookie and `Accept-Language`. Wrapped in React `cache` so the (garden)
 * layout and `request.ts` share one Supabase round trip per request.
 *
 * The profile is read with `select('*')` on purpose: until the UI-L
 * migration (`ui_locale`, `meaning_locale`) is applied the columns are
 * simply missing and the cookie / browser language take over, instead of
 * the whole garden failing on an unknown column.
 */
import { cache } from 'react';
import { cookies, headers } from 'next/headers';

import { createServerSupabaseClient } from '@/lib/supabase/server';

import {
  DEFAULT_TIME_ZONE,
  LOCALE_COOKIE,
  formattingLocale,
  isAppLocale,
  isMeaningLocale,
  resolveAppLocale,
  storedTimeZone,
  type AppLocale,
  type MeaningLocale,
} from './config';

export interface GardenLocaleContext {
  /** Which messages file the garden reads. */
  appLocale: AppLocale;
  /** What next-intl formats dates and numbers with (e.g. en-SG, vi-VN). */
  formatLocale: string;
  /** IANA zone the learner's day is measured in. */
  timeZone: string;
  /** The review card's extra meaning line; null = English only. */
  meaningLocale: MeaningLocale | null;
  /** The raw stored values, for the language sheet. */
  stored: { uiLocale: AppLocale | null; meaningLocale: MeaningLocale | null };
  signedIn: boolean;
}

interface ProfileLocaleRow {
  ui_locale?: string | null;
  meaning_locale?: string | null;
  timezone?: string | null;
}

/** The session user, once per request (the (garden) layout uses it too). */
export const getGardenUser = cache(async () => {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return { supabase, user };
  } catch {
    return { supabase: null, user: null };
  }
});

const getProfileLocaleRow = cache(async (): Promise<ProfileLocaleRow | null> => {
  const { supabase, user } = await getGardenUser();
  if (!supabase || !user) return null;
  try {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    return (data as ProfileLocaleRow | null) ?? null;
  } catch {
    return null;
  }
});

export const getGardenLocaleContext = cache(async (): Promise<GardenLocaleContext> => {
  const [cookieStore, headerList, profile, { user }] = await Promise.all([
    cookies(),
    headers(),
    getProfileLocaleRow(),
    getGardenUser(),
  ]);
  const appLocale = resolveAppLocale({
    profile: profile?.ui_locale,
    cookie: cookieStore.get(LOCALE_COOKIE)?.value,
    acceptLanguage: headerList.get('accept-language'),
  });
  const timeZone = storedTimeZone(profile?.timezone) ?? DEFAULT_TIME_ZONE;
  const meaningLocale = isMeaningLocale(profile?.meaning_locale) ? profile?.meaning_locale : null;
  return {
    appLocale,
    formatLocale: formattingLocale(appLocale, storedTimeZone(profile?.timezone)),
    timeZone,
    meaningLocale,
    stored: {
      uiLocale: isAppLocale(profile?.ui_locale) ? profile?.ui_locale : null,
      meaningLocale,
    },
    signedIn: Boolean(user),
  };
});
