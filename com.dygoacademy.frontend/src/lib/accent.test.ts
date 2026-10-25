import { describe, expect, it } from 'vitest';

import { accentOf, forAccent } from './accent';

describe('accentOf', () => {
  it('is UK only for en-GB', () => {
    expect(accentOf('en-GB')).toBe('UK');
    expect(accentOf('en-US')).toBe('US');
    expect(accentOf(null)).toBe('US');
    expect(accentOf(undefined)).toBe('US');
  });
});

describe('forAccent', () => {
  const both = {
    ipa_us: '/ˈwɔː.t̬ɚ/',
    ipa_uk: '/ˈwɔː.tə/',
    audio_url: 'https://media.example/us.m4a',
    audio_url_uk: 'https://media.example/uk.m4a',
  };

  it("picks the accent's own IPA and clip", () => {
    expect(forAccent(both, 'US')).toEqual({ ipa: '/ˈwɔː.t̬ɚ/', audioSrc: 'https://media.example/us.m4a' });
    expect(forAccent(both, 'UK')).toEqual({ ipa: '/ˈwɔː.tə/', audioSrc: 'https://media.example/uk.m4a' });
  });

  it('falls back to the other accent when one is missing', () => {
    expect(forAccent({ ...both, ipa_uk: null, audio_url_uk: null }, 'UK')).toEqual({
      ipa: '/ˈwɔː.t̬ɚ/',
      audioSrc: 'https://media.example/us.m4a',
    });
    expect(forAccent({ ...both, ipa_us: null, audio_url: null }, 'US')).toEqual({
      ipa: '/ˈwɔː.tə/',
      audioSrc: 'https://media.example/uk.m4a',
    });
  });

  it('is null for a word with neither', () => {
    expect(forAccent({}, 'UK')).toEqual({ ipa: null, audioSrc: null });
  });
});
