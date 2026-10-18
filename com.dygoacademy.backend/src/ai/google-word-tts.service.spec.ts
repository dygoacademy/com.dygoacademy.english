import { ipaForPhoneme, wordSsml } from './google-word-tts.service';

describe('ipaForPhoneme', () => {
  it('strips slashes and keeps stress marks and syllable dots', () => {
    expect(ipaForPhoneme('/ˈkaʊn.tɚ.fɪt/')).toBe('ˈkaʊn.tɚ.fɪt');
  });

  it('drops combining diacritics Google ignores the whole ph for (t̬, n̩)', () => {
    expect(ipaForPhoneme('/ˈkaʊn.t̬ɚ.fɪt/')).toBe('ˈkaʊn.tɚ.fɪt');
    expect(ipaForPhoneme('/ˈɡɑːr.dn̩/')).toBe('ˈɡɑːr.dn');
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

  it('falls back to the spelling, escaped, without IPA', () => {
    expect(wordSsml('rock & roll', null)).toBe('<speak>rock &amp; roll</speak>');
  });
});
