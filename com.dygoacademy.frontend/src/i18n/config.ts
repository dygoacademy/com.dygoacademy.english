/**
 * Word Garden languages (phase 12 implementation plan.md, step UI-L).
 *
 * Deliberately free of next/headers so the same helpers work in the
 * request config, server actions, client components and tests.
 *
 * Two kinds of locale live here:
 *  - the **app language** (`AppLocale`): which messages file the garden
 *    reads (`en`, `zh-CN`, `vi`). It's what the learner picks.
 *  - the **formatting locale**: what dates, times and numbers are
 *    formatted with. English is `en-SG` ("Friday, 25 September") unless
 *    the learner's time zone is in the Americas, then `en-US` (Sunday week
 *    start); Vietnamese is `vi-VN` ("Thứ Sáu, 25 tháng 9", "1.200");
 *    Chinese is `zh-CN`. The next-intl provider is given the formatting
 *    locale, so `useFormatter()` formats the right way; plural rules are
 *    the same as the bare language's.
 *
 * Only the (garden) and (garden-reference) layouts use any of this;
 * classic screens stay English (plan §10 rule 3).
 */
export const LOCALES = ['en', 'zh-CN', 'vi'] as const;
export type AppLocale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = 'en';

/** Languages the review card can show a meaning line in (besides English). */
export const MEANING_LOCALES = ['zh-CN', 'vi'] as const;
export type MeaningLocale = (typeof MEANING_LOCALES)[number];

/** Set by the language sheet (and before sign-in); read after the profile. */
export const LOCALE_COOKIE = 'dygo_locale';
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * The day is measured in this zone when the profile has never stored one
 * (`profiles.timezone` defaults to the literal 'UTC', the schema's "never
 * set" value). Same default as the backend's `DEFAULT_TIMEZONE`.
 */
export const DEFAULT_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function isMeaningLocale(value: unknown): value is MeaningLocale {
  return typeof value === 'string' && (MEANING_LOCALES as readonly string[]).includes(value);
}

/** A stored time zone, or null for the 'UTC' "never set" value and junk. */
export function storedTimeZone(value: unknown): string | null {
  if (typeof value !== 'string' || value === '' || value === 'UTC') return null;
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return value;
  } catch {
    return null;
  }
}

/**
 * Maps one language tag to an app language: `zh*` → zh-CN, `vi*` → vi,
 * `en*` → en, anything else → null.
 */
export function appLocaleForTag(tag: string): AppLocale | null {
  const lower = tag.trim().toLowerCase();
  if (lower === 'zh' || lower.startsWith('zh-')) return 'zh-CN';
  if (lower === 'vi' || lower.startsWith('vi-')) return 'vi';
  if (lower === 'en' || lower.startsWith('en-')) return 'en';
  return null;
}

/**
 * The best app language in an `Accept-Language` header, by q-value
 * (ties keep header order). Null when none of the three is listed.
 */
export function localeFromAcceptLanguage(header: string | null | undefined): AppLocale | null {
  if (!header) return null;
  const ranked = header
    .split(',')
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith('q='))
        ?.slice(2);
      const quality = q === undefined ? 1 : Number(q);
      return { tag, quality: Number.isFinite(quality) ? quality : 0, index };
    })
    .filter((entry) => entry.tag && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);
  for (const entry of ranked) {
    const locale = appLocaleForTag(entry.tag);
    if (locale) return locale;
  }
  return null;
}

/**
 * Which language the garden uses: 1) the profile's `ui_locale`, 2) the
 * `dygo_locale` cookie, 3) `Accept-Language`, 4) English.
 */
export function resolveAppLocale(sources: {
  profile?: string | null;
  cookie?: string | null;
  acceptLanguage?: string | null;
}): AppLocale {
  if (isAppLocale(sources.profile)) return sources.profile;
  if (isAppLocale(sources.cookie)) return sources.cookie;
  return localeFromAcceptLanguage(sources.acceptLanguage) ?? DEFAULT_LOCALE;
}

/** The formatting locale for an app language (see the file comment). */
export function formattingLocale(locale: AppLocale, timeZone?: string | null): string {
  switch (locale) {
    case 'vi':
      return 'vi-VN';
    case 'zh-CN':
      return 'zh-CN';
    default:
      return timeZone?.startsWith('America/') ? 'en-US' : 'en-SG';
  }
}

/** The app language a formatting locale belongs to ('en-SG' → 'en'). */
export function appLocaleOf(locale: string): AppLocale {
  return appLocaleForTag(locale) ?? DEFAULT_LOCALE;
}

/** First day of the week, JS numbering (0 = Sunday, 1 = Monday). */
export function weekStartsOn(locale: string): 0 | 1 {
  return locale === 'en-US' ? 0 : 1;
}

/**
 * How short weekday names look in the A4 harvest strip: "Mon" in English
 * and Chinese ("周一"), the narrow "T2" in Vietnamese (the canvas's
 * `-vi` reference), where the short form "Thứ 2" doesn't fit.
 */
export function shortWeekdayStyle(locale: string): 'short' | 'narrow' {
  return appLocaleOf(locale) === 'vi' ? 'narrow' : 'short';
}
