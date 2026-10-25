import {
  buildSyllables,
  fitSpelling,
  ipaUnits,
  ipaPerStone,
  storedStones,
  syllableSpans,
} from './pron-syllables';

const STONES = [
  { text: 'mi', stressed: true },
  { text: 'ti', stressed: false },
  { text: 'gate', stressed: false },
];

describe('buildSyllables', () => {
  it('one stone per syllable from the spelling and the IPA, no spans yet', () => {
    expect(buildSyllables('mitigate', '/ˈmɪt.ɪ.ɡeɪt/')).toEqual(
      STONES.map((s) => ({ ...s, start_ms: null, end_ms: null })),
    );
    expect(buildSyllables('sunny', '/ˈsʌn.i/').map((s) => s.text)).toEqual(['sun', 'ny']);
    // The spelling, never IPA, on the stones (compensation had kɑːmpen · seɪʃn).
    expect(
      buildSyllables('compensation', '/ˌkɑːmpenˈseɪʃn/').map((s) => [s.text, s.stressed]),
    ).toEqual([
      ['com', false],
      ['pen', false],
      ['sa', true],
      ['tion', false],
    ]);
    expect(buildSyllables('check-up', '/ˈtʃɛkˌʌp/').map((s) => s.text)).toEqual(['check', 'up']);
    expect(buildSyllables('cloud', '/klaʊd/')).toEqual([
      { text: 'cloud', stressed: true, start_ms: null, end_ms: null },
    ]);
  });

  it('none without an IPA, or for a phrase (the word is then blocked)', () => {
    expect(buildSyllables('mitigate', null)).toEqual([]);
    expect(buildSyllables('flat tyre', '/ˌflæt ˈtaɪə/')).toEqual([]);
  });
});

describe('ipaUnits', () => {
  it('one per vowel sound: diphthongs and long vowels are one, unmarked syllabic n / l count', () => {
    expect(ipaUnits('/ˌkɑːmpenˈseɪʃn/').map((u) => u.stressed)).toEqual([
      false,
      false,
      true,
      false,
    ]);
    expect(ipaUnits('/ˈsnoʊi/')).toHaveLength(2);
    expect(ipaUnits('/ˈɡɑːrdn/')).toHaveLength(2);
    expect(ipaUnits('/ˈsɜːkl/')).toHaveLength(2);
    expect(ipaUnits('/fɪlm/')).toHaveLength(1); // m after l is not its own syllable
    expect(ipaUnits('/aɪl/')).toHaveLength(1);
    expect(ipaUnits(null)).toEqual([]);
  });
});

describe('fitSpelling', () => {
  it('joins a silent e inside a compound, and a final -ed that is not a syllable', () => {
    expect(fitSpelling(['ho', 'me', 'work'], 2)).toEqual(['home', 'work']);
    expect(fitSpelling(['ti', 'me', 'ta', 'ble'], 3)).toEqual(['time', 'ta', 'ble']);
    expect(fitSpelling(['fur', 'ni', 'shed'], 2)).toEqual(['fur', 'nished']);
  });
  it('splits two vowels said apart', () => {
    expect(fitSpelling(['diet'], 2)).toEqual(['di', 'et']);
    expect(fitSpelling(['pun', 'ctual'], 3)).toEqual(['pun', 'ctu', 'al']);
  });
});

describe('ipaPerStone', () => {
  it("the IPA's own syllables, stress marks kept, when they match the stones", () => {
    expect(ipaPerStone('/ˈmɪt.ɪ.ɡeɪt/', 3)).toEqual(['ˈmɪt', 'ɪ', 'ɡeɪt']);
    expect(ipaPerStone('/ˌkɒm.penˈseɪ.ʃən/', 4)).toEqual(['ˌkɒm', 'pen', 'ˈseɪ', 'ʃən']);
  });

  it('null when the IPA splits differently or is missing', () => {
    expect(ipaPerStone('/kənˈdɪʃənəl/', 4)).toBeNull();
    expect(ipaPerStone(null, 2)).toBeNull();
  });
});

describe('syllableSpans', () => {
  it('scales the SSML mark times onto the word clip’s voiced part', () => {
    // Measured for "mitigate" (2026-10-25): plain clip voiced 0.031–0.800 s;
    // marked clip voiced 0.030–1.018 s with marks at 0.015, 0.260, 0.550.
    const spans = syllableSpans(
      STONES,
      { start: 0.031, end: 0.8 },
      {
        times: [0.015, 0.26, 0.55],
        voiced: { start: 0.03, end: 1.018 },
      },
    );
    expect(spans).toEqual([
      { start_ms: 31, end_ms: 210 },
      { start_ms: 210, end_ms: 436 },
      { start_ms: 436, end_ms: 800 },
    ]);
  });

  it('without marks, splits the voiced part by letters; spans never run backwards', () => {
    expect(syllableSpans(STONES, { start: 0, end: 0.8 })).toEqual([
      { start_ms: 0, end_ms: 200 },
      { start_ms: 200, end_ms: 400 },
      { start_ms: 400, end_ms: 800 },
    ]);
    const odd = syllableSpans(
      STONES,
      { start: 0, end: 1 },
      {
        times: [0, 0.9, 0.1],
        voiced: { start: 0, end: 1 },
      },
    );
    expect(odd.every((s) => s.end_ms >= s.start_ms)).toBe(true);
  });
});

describe('storedStones', () => {
  const us = [{ text: 'a', stressed: true, start_ms: 0, end_ms: 1 }];
  const uk = [{ text: 'b', stressed: true, start_ms: 0, end_ms: 1 }];
  it("the accent's own, else the other accent's, else none", () => {
    expect(storedStones({ syllables_us: us, syllables_uk: uk }, 'UK')).toEqual({
      syllables: uk,
      accent: 'UK',
    });
    expect(storedStones({ syllables_us: us, syllables_uk: null }, 'UK')).toEqual({
      syllables: us,
      accent: 'US',
    });
    expect(storedStones({ syllables_us: [], syllables_uk: null }, 'US')).toEqual({
      syllables: [],
      accent: 'US',
    });
  });
});
