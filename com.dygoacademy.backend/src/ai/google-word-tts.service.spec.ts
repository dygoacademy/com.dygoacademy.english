import { ipaForAccent, ipaForPhoneme, wordSsml } from './google-word-tts.service';

describe('ipaForPhoneme', () => {
  it('strips slashes and keeps stress marks and syllable dots', () => {
    expect(ipaForPhoneme('/ˈkaʊn.tɚ.fɪt/')).toBe('ˈkaʊn.tɚ.fɪt');
  });

  it('drops combining diacritics Google ignores the whole ph for (n̩)', () => {
    expect(ipaForPhoneme('/ˈɡɑːr.dn̩/')).toBe('ˈɡɑːr.dn');
  });

  it('says the US flap t̬ as ɾ after a vowel or r, which en-US accepts', () => {
    expect(ipaForPhoneme('/ˈwɔː.t̬ɚ/', 'US')).toBe('ˈwɔː.ɾɚ');
    expect(ipaForPhoneme('/ˈsɪt̬.i/')).toBe('ˈsɪɾ.i');
    expect(ipaForPhoneme('/ˈpɑːr.t̬i/')).toBe('ˈpɑːr.ɾi');
  });

  it('says t̬ after a consonant as a plain t, since no flap is said there', () => {
    expect(ipaForPhoneme('/ˈlɔɪ.əl.t̬i/')).toBe('ˈlɔɪ.əl.ti');
    expect(ipaForPhoneme('/ˈwɪn.t̬ɚ/')).toBe('ˈwɪn.tɚ');
    expect(ipaForPhoneme('/ˈpeɪn.t̬ɪŋ/')).toBe('ˈpeɪn.tɪŋ');
    expect(ipaForPhoneme('/ˈkaʊn.t̬ɚ.fɪt/')).toBe('ˈkaʊn.tɚ.fɪt');
  });

  it('maps US-only symbols for a UK voice, which drops a ph that has them', () => {
    expect(ipaForPhoneme('/ˈwɔː.t̬ɚ/', 'UK')).toBe('ˈwɔː.tə');
    expect(ipaForPhoneme('/bɝd/', 'UK')).toBe('bɜːd');
    expect(ipaForPhoneme('/ˈbʌɾɚ/', 'UK')).toBe('ˈbʌtə');
    expect(ipaForPhoneme('/ˈwɔː.tə/', 'UK')).toBe('ˈwɔː.tə');
  });

  it('keeps an optional sound but not its parentheses, and only the first alternative', () => {
    expect(ipaForPhoneme('/ˈkɑːn(t)ɪnənt/, /ˈkɒntɪnənt/')).toBe('ˈkɑːntɪnənt');
  });

  it('is null for no IPA or one that would break the SSML', () => {
    expect(ipaForPhoneme(null)).toBeNull();
    expect(ipaForPhoneme('//')).toBeNull();
    expect(ipaForPhoneme('a"b')).toBeNull();
  });
});

describe('wordSsml', () => {
  it('says the word from its IPA', () => {
    expect(wordSsml('counterfeit', '/ˈkaʊn.tɚ.fɪt/')).toBe(
      '<speak><phoneme alphabet="ipa" ph="ˈkaʊn.tɚ.fɪt">counterfeit</phoneme></speak>',
    );
  });

  it('adapts the IPA to a UK voice', () => {
    expect(wordSsml('water', '/ˈwɔː.t̬ɚ/', 'UK')).toBe(
      '<speak><phoneme alphabet="ipa" ph="ˈwɔː.tə">water</phoneme></speak>',
    );
  });

  it('falls back to the spelling, escaped, without IPA', () => {
    expect(wordSsml('rock & roll', null)).toBe('<speak>rock &amp; roll</speak>');
  });
});

describe('ipaForAccent', () => {
  const both = { ipa_us: '/ˈwɔː.t̬ɚ/', ipa_uk: '/ˈwɔː.tə/' };

  it("picks the accent's own IPA", () => {
    expect(ipaForAccent(both, 'US')).toBe('/ˈwɔː.t̬ɚ/');
    expect(ipaForAccent(both, 'UK')).toBe('/ˈwɔː.tə/');
  });

  it('falls back to the other accent, then null', () => {
    expect(ipaForAccent({ ipa_us: null, ipa_uk: '/ˈwɔː.tə/' }, 'US')).toBe('/ˈwɔː.tə/');
    expect(ipaForAccent({ ipa_us: '/ˈwɔː.t̬ɚ/', ipa_uk: null }, 'UK')).toBe('/ˈwɔː.t̬ɚ/');
    expect(ipaForAccent({}, 'UK')).toBeNull();
  });
});
