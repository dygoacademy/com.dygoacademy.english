import { splitSpelling, wordSyllables } from './speaking-syllables';

const show = (word: string, ipa: string) =>
  wordSyllables(word, ipa)
    .map((s) => (s.stressed ? s.text.toUpperCase() : s.text))
    .join('·');

describe('wordSyllables (Pronunciation stones, Bees rows)', () => {
  it('mitigate → MI·ti·gate, the stress from the IPA', () => {
    expect(wordSyllables('mitigate', '/ˈmɪt.ɪ.ɡeɪt/')).toEqual([
      { text: 'mi', stressed: true },
      { text: 'ti', stressed: false },
      { text: 'gate', stressed: false },
    ]);
  });

  it('longer words: deforestation, ecosystem', () => {
    expect(show('deforestation', '/diːˌfɒr.ɪˈsteɪ.ʃən/')).toBe('de·fo·res·TA·tion');
    expect(show('ecosystem', '/ˈiː.kəʊˌsɪs.təm/')).toBe('E·co·sys·tem');
  });

  it('a count that differs from the IPA falls back to the IPA syllables', () => {
    // "hoped" spells 2 vowel groups but is said as 1 syllable.
    expect(wordSyllables('hoped', '/həʊpt/')).toEqual([{ text: 'həʊpt', stressed: true }]);
  });

  it('no IPA, no syllables', () => {
    expect(wordSyllables('mitigate', null)).toEqual([]);
    expect(wordSyllables('mitigate', '')).toEqual([]);
  });

  it('splits the spelling by vowel groups and keeps clusters together', () => {
    expect(splitSpelling('table')).toEqual(['ta', 'ble']);
    expect(splitSpelling('construct')).toEqual(['con', 'struct']);
    expect(splitSpelling('picket')).toEqual(['pick', 'et']);
    expect(splitSpelling('happy')).toEqual(['hap', 'py']);
    expect(splitSpelling('drought')).toEqual(['drought']);
    expect(splitSpelling('food court')).toEqual([]);
  });
});
