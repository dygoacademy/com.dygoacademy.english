/**
 * Word Garden languages (docs/plans/phase 12 implementation plan.md, step UI-L).
 *
 * Deliberately free of next/headers so the same helpers work in the
 * request config, server actions, client components and tests.
 *
 * Locale codes are full BCP 47 tags; English is `en-US`. One code is
 * both
 *  - the **app language**: which messages file the garden reads
 *    (`messages/<code>.json`), what the learner picks, what
 *    `profiles.ui_locale` and the `dygo_locale` cookie store; and
 *  - the **formatting locale**: dates, times and numbers ("Friday,
 *    September 25" and a Sunday week start in en-US, "Thứ Sáu,
 *    25 tháng 9" / "1.200" in vi-VN).
 *
 * Old short codes ('en', 'vi') from before locales became full BCP 47
 * tags are still understood when read (`normalizeLocale`), so existing
 * cookies keep working.
 *
 * Only the (garden) and (garden-reference) layouts use any of this;
 * classic screens stay English (plan §10 rule 3).
 */
export const LOCALES = ['en-US', 'vi-VN', 'zh-CN'] as const;
export type AppLocale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = 'en-US';

/** Languages the review card can show a meaning line in (besides English). */
export const MEANING_LOCALES = ['vi-VN', 'zh-CN'] as const;
export type MeaningLocale = (typeof MEANING_LOCALES)[number];

/** The language part of a locale ('en-US' → 'en'), for rules shared by a language. */
export type LanguageCode = 'en' | 'vi' | 'zh';

/** Set by the language sheet (and before sign-in); read after the profile. */
export const LOCALE_COOKIE = 'dygo_locale';
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Set by middleware on the home pages (`/`, `/vi`, `/zh`): the language their URL names. */
export const URL_LOCALE_HEADER = 'x-dygo-url-locale';

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

/**
 * A stored or requested value as an app locale: the three codes (any
 * case), the pre-2026-09-26 short codes ('en' → en-US,
 * 'vi' → vi-VN), or null.
 */
export function normalizeLocale(value: unknown): AppLocale | null {
  if (typeof value !== 'string') return null;
  const match = LOCALES.find((code) => code.toLowerCase() === value.trim().toLowerCase());
  if (match) return match;
  if (value === 'en') return 'en-US';
  if (value === 'vi') return 'vi-VN';
  return null;
}

/** A stored meaning language, including the old 'vi', or null. */
export function normalizeMeaningLocale(value: unknown): MeaningLocale | null {
  if (value === 'vi') return 'vi-VN';
  return isMeaningLocale(value) ? value : null;
}

/** 'en-US' → 'en', 'vi-VN' → 'vi', 'zh-CN' → 'zh'. */
export function languageOf(locale: string): LanguageCode {
  const lower = locale.toLowerCase();
  if (lower.startsWith('vi')) return 'vi';
  if (lower.startsWith('zh')) return 'zh';
  return 'en';
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
 * Maps one language tag to an app locale: `zh*` → zh-CN, `vi*` → vi-VN,
 * any `en*` (`en-US`, `en-GB`, bare `en`, …) → en-US, anything else →
 * null.
 */
export function appLocaleForTag(tag: string): AppLocale | null {
  const lower = tag.trim().toLowerCase();
  if (lower === 'zh' || lower.startsWith('zh-')) return 'zh-CN';
  if (lower === 'vi' || lower.startsWith('vi-')) return 'vi-VN';
  if (lower === 'en' || lower.startsWith('en-')) return 'en-US';
  return null;
}

/**
 * The best app locale in an `Accept-Language` header, by q-value
 * (ties keep header order). Null when none of the languages is listed.
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
 * Which locale the garden uses: 1) the profile's `ui_locale`, 2) the
 * `dygo_locale` cookie, 3) `Accept-Language`, 4) English (en-US).
 */
export function resolveAppLocale(sources: {
  profile?: string | null;
  cookie?: string | null;
  acceptLanguage?: string | null;
}): AppLocale {
  return (
    normalizeLocale(sources.profile) ??
    normalizeLocale(sources.cookie) ??
    localeFromAcceptLanguage(sources.acceptLanguage) ??
    'en-US'
  );
}

/**
 * The formatting locale for an app locale. Since the codes carry the
 * region, it's the code itself; kept as a function so callers don't
 * depend on that.
 */
export function formattingLocale(locale: AppLocale): string {
  return locale;
}

/** The app locale a formatting locale belongs to (unknown → en-US). */
export function appLocaleOf(locale: string): AppLocale {
  return normalizeLocale(locale) ?? appLocaleForTag(locale) ?? DEFAULT_LOCALE;
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
  return languageOf(locale) === 'vi' ? 'narrow' : 'short';
}
