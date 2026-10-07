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
  normalizeLocale,
  normalizeMeaningLocale,
  resolveAppLocale,
  storedTimeZone,
  type AppLocale,
  type MeaningLocale,
} from './config';

export interface GardenLocaleContext {
  /** Which messages file the garden reads. */
  appLocale: AppLocale;
  /** What next-intl formats dates and numbers with (e.g. en-US, vi-VN). */
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
  /** Onboarding (20261008_onboarding.sql); missing until that migration is applied. */
  onboarded_at?: string | null;
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

/**
 * Onboarding OB1–OB5: true only when the profile says this learner hasn't
 * finished (`onboarded_at` is null). Everything else counts as done, so
 * nobody is ever stuck in onboarding: no profile row, a failed read, or a
 * database without the 20261008 migration (the column is then missing,
 * not null; same `select('*')` reasoning as above). Shares the cached
 * profile read with getGardenLocaleContext.
 */
export const needsOnboarding = cache(async (): Promise<boolean> => {
  const profile = await getProfileLocaleRow();
  return profile !== null && profile.onboarded_at === null;
});

export const getGardenLocaleContext = cache(async (): Promise<GardenLocaleContext> => {
  const [cookieStore, headerList, profile, { user }] = await Promise.all([
    cookies(),
    headers(),
    getProfileLocaleRow(),
    getGardenUser(),
  ]);
  const storedZone = storedTimeZone(profile?.timezone);
  const appLocale = resolveAppLocale({
    profile: profile?.ui_locale,
    cookie: cookieStore.get(LOCALE_COOKIE)?.value,
    acceptLanguage: headerList.get('accept-language'),
  });
  const timeZone = storedZone ?? DEFAULT_TIME_ZONE;
  const meaningLocale = normalizeMeaningLocale(profile?.meaning_locale);
  return {
    appLocale,
    formatLocale: formattingLocale(appLocale),
    timeZone,
    meaningLocale,
    stored: {
      uiLocale: normalizeLocale(profile?.ui_locale),
      meaningLocale,
    },
    signedIn: Boolean(user),
  };
});
