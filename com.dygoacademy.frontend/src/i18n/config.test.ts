import { describe, expect, it } from 'vitest';

import {
  appLocaleOf,
  englishFor,
  formattingLocale,
  languageOf,
  localeFromAcceptLanguage,
  normalizeLocale,
  normalizeMeaningLocale,
  resolveAppLocale,
  shortWeekdayStyle,
  storedTimeZone,
  weekStartsOn,
} from './config';

describe('resolveAppLocale (profile → cookie → Accept-Language → English for the zone)', () => {
  it('prefers the profile', () => {
    expect(resolveAppLocale({ profile: 'vi-VN', cookie: 'zh-CN', acceptLanguage: 'en' })).toBe('vi-VN');
  });

  it('falls back to the cookie, then the browser language', () => {
    expect(resolveAppLocale({ profile: null, cookie: 'zh-CN', acceptLanguage: 'vi' })).toBe('zh-CN');
    expect(resolveAppLocale({ profile: 'klingon', cookie: undefined, acceptLanguage: 'vi-VN,en;q=0.5' })).toBe(
      'vi-VN',
    );
  });

  it('defaults to English for the zone', () => {
    expect(resolveAppLocale({})).toBe('en-SG');
    expect(resolveAppLocale({ acceptLanguage: 'fr-FR,de;q=0.8' })).toBe('en-SG');
    expect(resolveAppLocale({ timeZone: 'America/Los_Angeles' })).toBe('en-US');
  });

  it('still reads the short codes stored before the change', () => {
    expect(resolveAppLocale({ cookie: 'vi' })).toBe('vi-VN');
    expect(resolveAppLocale({ profile: 'en', timeZone: 'America/New_York' })).toBe('en-US');
    expect(resolveAppLocale({ profile: 'en', timeZone: 'Asia/Singapore' })).toBe('en-SG');
  });
});

describe('normalizeLocale / normalizeMeaningLocale', () => {
  it('accepts the four codes in any case and nothing else', () => {
    expect(normalizeLocale('en-us')).toBe('en-US');
    expect(normalizeLocale('ZH-cn')).toBe('zh-CN');
    expect(normalizeLocale('fr-FR')).toBeNull();
    expect(normalizeLocale(42)).toBeNull();
  });

  it('maps the old meaning code', () => {
    expect(normalizeMeaningLocale('vi')).toBe('vi-VN');
    expect(normalizeMeaningLocale('zh-CN')).toBe('zh-CN');
    expect(normalizeMeaningLocale('en-SG')).toBeNull();
  });
});

describe('localeFromAcceptLanguage', () => {
  it('maps Chinese, Vietnamese and English variants', () => {
    expect(localeFromAcceptLanguage('zh-TW')).toBe('zh-CN');
    expect(localeFromAcceptLanguage('zh-Hans-CN,zh;q=0.9')).toBe('zh-CN');
    expect(localeFromAcceptLanguage('vi')).toBe('vi-VN');
    expect(localeFromAcceptLanguage('en-US')).toBe('en-US');
    expect(localeFromAcceptLanguage('en-GB')).toBe('en-SG');
    expect(localeFromAcceptLanguage('en', 'America/Chicago')).toBe('en-US');
  });

  it('respects q-values and order', () => {
    expect(localeFromAcceptLanguage('en;q=0.5,vi;q=0.8')).toBe('vi-VN');
    expect(localeFromAcceptLanguage('fr,vi,zh')).toBe('vi-VN');
    expect(localeFromAcceptLanguage('fr')).toBeNull();
  });
});

describe('formats', () => {
  it('formats with the locale itself', () => {
    expect(formattingLocale('en-SG')).toBe('en-SG');
    expect(formattingLocale('en-US')).toBe('en-US');
    expect(formattingLocale('vi-VN')).toBe('vi-VN');
    expect(formattingLocale('zh-CN')).toBe('zh-CN');
    expect(englishFor('America/New_York')).toBe('en-US');
    expect(englishFor(null)).toBe('en-SG');
  });

  it('finds the app locale and language of a formatting locale', () => {
    expect(appLocaleOf('en-SG')).toBe('en-SG');
    expect(appLocaleOf('vi-VN')).toBe('vi-VN');
    expect(appLocaleOf('en-GB')).toBe('en-SG');
    expect(languageOf('zh-CN')).toBe('zh');
    expect(languageOf('en-US')).toBe('en');
  });

  it('starts the week on Sunday only in en-US', () => {
    expect(weekStartsOn('en-US')).toBe(0);
    expect(weekStartsOn('en-SG')).toBe(1);
    expect(weekStartsOn('vi-VN')).toBe(1);
    expect(weekStartsOn('zh-CN')).toBe(1);
  });

  it('uses narrow weekday names only in Vietnamese', () => {
    expect(shortWeekdayStyle('vi-VN')).toBe('narrow');
    expect(shortWeekdayStyle('en-SG')).toBe('short');
    expect(shortWeekdayStyle('zh-CN')).toBe('short');
  });
});

describe('storedTimeZone', () => {
  it('treats UTC (never set) and junk as unset', () => {
    expect(storedTimeZone('UTC')).toBeNull();
    expect(storedTimeZone('Not/AZone')).toBeNull();
    expect(storedTimeZone('Asia/Singapore')).toBe('Asia/Singapore');
  });
});
