import { describe, expect, it } from 'vitest';

import {
  appLocaleOf,
  formattingLocale,
  localeFromAcceptLanguage,
  resolveAppLocale,
  shortWeekdayStyle,
  storedTimeZone,
  weekStartsOn,
} from './config';

describe('resolveAppLocale (profile → cookie → Accept-Language → en)', () => {
  it('prefers the profile', () => {
    expect(resolveAppLocale({ profile: 'vi', cookie: 'zh-CN', acceptLanguage: 'en' })).toBe('vi');
  });
  it('falls back to the cookie, then the browser', () => {
    expect(resolveAppLocale({ profile: null, cookie: 'zh-CN', acceptLanguage: 'vi' })).toBe('zh-CN');
    expect(resolveAppLocale({ profile: 'fr', cookie: 'xx', acceptLanguage: 'vi-VN,vi;q=0.9' })).toBe(
      'vi',
    );
  });
  it('defaults to English', () => {
    expect(resolveAppLocale({})).toBe('en');
    expect(resolveAppLocale({ acceptLanguage: 'fr-FR,de;q=0.8' })).toBe('en');
  });
});

describe('localeFromAcceptLanguage', () => {
  it('maps zh* to zh-CN and vi* to vi', () => {
    expect(localeFromAcceptLanguage('zh-TW')).toBe('zh-CN');
    expect(localeFromAcceptLanguage('zh-Hans-CN,zh;q=0.9')).toBe('zh-CN');
    expect(localeFromAcceptLanguage('vi')).toBe('vi');
  });
  it('follows q-values, then header order', () => {
    expect(localeFromAcceptLanguage('en;q=0.5,vi;q=0.8')).toBe('vi');
    expect(localeFromAcceptLanguage('fr,vi,zh')).toBe('vi');
    expect(localeFromAcceptLanguage('vi;q=0')).toBeNull();
    expect(localeFromAcceptLanguage('')).toBeNull();
  });
});

describe('formatting locale', () => {
  it('uses en-SG for English, en-US in the Americas', () => {
    expect(formattingLocale('en')).toBe('en-SG');
    expect(formattingLocale('en', 'Asia/Singapore')).toBe('en-SG');
    expect(formattingLocale('en', 'America/New_York')).toBe('en-US');
    expect(formattingLocale('vi', 'America/New_York')).toBe('vi-VN');
    expect(formattingLocale('zh-CN')).toBe('zh-CN');
  });
  it('maps back to the app language', () => {
    expect(appLocaleOf('en-SG')).toBe('en');
    expect(appLocaleOf('vi-VN')).toBe('vi');
    expect(appLocaleOf('zh-CN')).toBe('zh-CN');
  });
  it('starts the week on Sunday only for en-US', () => {
    expect(weekStartsOn('en-US')).toBe(0);
    expect(weekStartsOn('en-SG')).toBe(1);
    expect(weekStartsOn('vi-VN')).toBe(1);
    expect(weekStartsOn('zh-CN')).toBe(1);
  });
  it('uses narrow weekday names only in Vietnamese', () => {
    expect(shortWeekdayStyle('vi-VN')).toBe('narrow');
    expect(shortWeekdayStyle('en-SG')).toBe('short');
  });
});

describe('storedTimeZone', () => {
  it("treats 'UTC' (the schema default) and junk as not set", () => {
    expect(storedTimeZone('UTC')).toBeNull();
    expect(storedTimeZone('Not/AZone')).toBeNull();
    expect(storedTimeZone(null)).toBeNull();
    expect(storedTimeZone('Asia/Singapore')).toBe('Asia/Singapore');
  });
});
