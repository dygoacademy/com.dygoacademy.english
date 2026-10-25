import {
  HEARD_TRUST_SCORE,
  heardOtherWord,
  spelledSyllables,
  syllabify,
  SyllableMismatchError,
  toScorerWordResult,
  WOBBLY_SCORE,
  type PronunciationReply,
} from './pronunciation-word';

const ph = (s: string) => s.split(' ');
const phones = (pairs: [string, number][]) => pairs.map(([phone, score]) => ({ phone, score }));

describe('syllabify', () => {
  it('gives one syllable per vowel, consonants to the next one', () => {
    expect(syllabify(ph('M IH T AH G EY T'))).toEqual([ph('M IH'), ph('T AH'), ph('G EY T')]); // mi·ti·gate
    expect(syllabify(ph('HH AH L OW'))).toEqual([ph('HH AH'), ph('L OW')]);
  });

  it('keeps all but the last consonant of a cluster, or the last two when they can start a word', () => {
    expect(syllabify(ph('B AE S K AH T'))).toEqual([ph('B AE S'), ph('K AH T')]); // bas·ket
    expect(syllabify(ph('P AH M P K IH N'))).toEqual([ph('P AH M P'), ph('K IH N')]); // pump·kin
    expect(syllabify(ph('EY P R AH N'))).toEqual([ph('EY'), ph('P R AH N')]); // a·pron
    expect(syllabify(ph('EH K S T R AH'))).toEqual([ph('EH K S'), ph('T R AH')]); // eks·tra
  });

  it('handles one syllable, no vowel and no phones', () => {
    expect(syllabify(ph('K AE T'))).toEqual([ph('K AE T')]);
    expect(syllabify(ph('HH M'))).toEqual([ph('HH M')]);
    expect(syllabify([])).toEqual([]);
  });
});

const reply = (
  over: Partial<PronunciationReply['words'][0]> = {},
  top: Partial<PronunciationReply> = {},
): PronunciationReply => ({
  total: 90,
  heard_text: 'mitigate',
  duration_ms: 900,
  latency_ms: 700,
  words: [
    {
      index: 0,
      text: 'mitigate',
      score: 92,
      status: 'ok',
      heard: null,
      phones: phones([
        ['M', 95],
        ['IH', 90],
        ['T', 92],
        ['AH', 94],
        ['G', 91],
        ['EY', 93],
        ['T', 92],
      ]),
      ...over,
    },
  ],
  ...top,
});
const MITIGATE = '/ˈmɪt.ɪ.ɡeɪt/';
const STONES = [
  { text: 'mi', stressed: true },
  { text: 'ti', stressed: false },
  { text: 'gate', stressed: false },
];

describe('toScorerWordResult', () => {
  it('one syllable per stored stone, scored by the mean of its phones', () => {
    const r = toScorerWordResult(reply(), 'mitigate', MITIGATE, STONES);
    expect(r.status).toBe('ok');
    expect(r.total).toBe(92);
    expect(r.syllables.map((s) => s.ipa)).toEqual(['ˈmɪt', 'ɪ', 'ɡeɪt']);
    expect(r.syllables.map((s) => s.text)).toEqual(['mi', 'ti', 'gate']);
    expect(r.syllables.map((s) => s.score)).toEqual([93, 93, 92]);
    expect(r.syllables.every((s) => !s.wobbly && s.heard_ipa === null)).toBe(true);
    expect(r.duration_ms).toBe(900);
    expect(r.latency_ms).toBe(700);
  });

  it('marks the syllable that went wrong as wobbly', () => {
    const bad = reply({
      phones: phones([
        ['M', 95],
        ['IH', 90],
        ['T', 92],
        ['AH', 20],
        ['G', 91],
        ['EY', 93],
        ['T', 92],
      ]),
    });
    const r = toScorerWordResult(bad, 'mitigate', MITIGATE, STONES);
    expect(r.syllables.map((s) => s.wobbly)).toEqual([false, true, false]);
    expect(r.syllables[1].score).toBeLessThan(WOBBLY_SCORE);
  });

  it('wobbly is one rule: a syllable under 60 (no 70 line, no single-phone rule)', () => {
    expect(WOBBLY_SCORE).toBe(60);
    const at = (score: number, last = 99) =>
      toScorerWordResult(
        reply({
          phones: phones([
            ['M', 99],
            ['IH', 99],
            ['T', score],
            ['AH', score],
            ['G', 99],
            ['EY', 99],
            ['T', last],
          ]),
        }),
        'mitigate',
        MITIGATE,
        STONES,
      ).syllables;
    expect(at(65)[1].wobbly).toBe(false); // 65 wobbled under the old 70 line
    expect(at(59)[1].wobbly).toBe(true);
    expect(at(99, 40)[2].wobbly).toBe(false); // one phone at 40: the mean is 79
  });

  it('gives each syllable its time in the take and what it sounded like', () => {
    const timed = reply({
      phones: [
        { phone: 'M', score: 95, start_ms: 100, end_ms: 160, heard: 'm' },
        { phone: 'IH', score: 90, start_ms: 160, end_ms: 240, heard: 'ɪ' },
        { phone: 'T', score: 50, start_ms: 240, end_ms: 300, heard: 't' },
        { phone: 'AH', score: 40, start_ms: 300, end_ms: 380, heard: 'aɪ' },
        { phone: 'G', score: 91, start_ms: 380, end_ms: 430, heard: 'ɡ' },
        { phone: 'EY', score: 93, start_ms: 430, end_ms: 560, heard: null },
        { phone: 'T', score: 92, start_ms: 560, end_ms: 600, heard: 't' },
      ],
    });
    const r = toScorerWordResult(timed, 'mitigate', MITIGATE, STONES).syllables;
    expect(r.map((s) => [s.start_ms, s.end_ms])).toEqual([
      [100, 240],
      [240, 380],
      [380, 600],
    ]);
    expect(r.map((s) => s.heard_ipa)).toEqual(['mɪ', 'taɪ', null]); // gate: one phone unsure
    // An older scorer gives no times: null, not a guess.
    expect(toScorerWordResult(reply(), 'mitigate', MITIGATE, STONES).syllables[0]).toMatchObject({
      start_ms: null,
      end_ms: null,
      heard_ipa: null,
    });
  });

  it('not_heard when nothing was heard or the word is missing', () => {
    expect(
      toScorerWordResult(reply({}, { heard_text: ' ' }), 'mitigate', MITIGATE, STONES),
    ).toMatchObject({
      status: 'not_heard',
      total: 0,
      syllables: [],
    });
    expect(
      toScorerWordResult(reply({ status: 'missing', score: 20 }), 'mitigate', MITIGATE, STONES)
        .status,
    ).toBe('not_heard');
    expect(toScorerWordResult({ ...reply(), words: [] }, 'mitigate', MITIGATE, STONES).status).toBe(
      'not_heard',
    );
  });

  it('not_heard for a clip with almost no voice, even if Whisper made a word of the noise', () => {
    const silent = reply(
      { heard: 'you', score: 27, status: 'unclear' },
      { heard_text: 'You', voiced_ms: 0 },
    );
    expect(toScorerWordResult(silent, 'mitigate', MITIGATE, STONES).status).toBe('not_heard');
    const spoken = reply({}, { voiced_ms: 640 });
    expect(toScorerWordResult(spoken, 'mitigate', MITIGATE, STONES).status).toBe('ok');
  });

  it('other_word when Whisper heard a shorter word, however well the sounds scored', () => {
    // migrate for mitigate: a syllable left out (the scorer trusts sounds of 90+, so heard is null)
    const migrate = reply({ score: 95, heard: null }, { heard_text: 'Migrate.' });
    expect(toScorerWordResult(migrate, 'mitigate', MITIGATE, STONES).status).toBe('other_word');
    // cloud for cloudy (Dylan, 2026-10-25: it passed)
    const cloud = reply(
      {
        text: 'cloudy',
        score: 93,
        heard: null,
        phones: phones([
          ['K', 95],
          ['L', 94],
          ['AW', 96],
          ['D', 92],
          ['IY', 88],
        ]),
      },
      { heard_text: 'Cloud.' },
    );
    expect(
      toScorerWordResult(cloud, 'cloudy', '/ˈklaʊ.di/', [
        { text: 'clou', stressed: true },
        { text: 'dy', stressed: false },
      ]).status,
    ).toBe('other_word');
  });

  it('other_word when Whisper heard another word and the sounds are not clearly right', () => {
    const unclear = reply(
      { heard: 'migrant', score: 85, status: 'unclear' },
      { heard_text: 'migrant' },
    );
    expect(toScorerWordResult(unclear, 'mitigate', MITIGATE, STONES).status).toBe('other_word');
    const wobbly = reply(
      {
        score: 92,
        phones: phones([
          ['M', 95],
          ['IH', 90],
          ['T', 92],
          ['AH', 20],
          ['G', 91],
          ['EY', 93],
          ['T', 92],
        ]),
      },
      { heard_text: 'mitigant' },
    );
    expect(toScorerWordResult(wobbly, 'mitigate', MITIGATE, STONES).status).toBe('other_word');
  });

  it('ok when Whisper misheard a word whose sounds are all right (same length, 90+, no wobble)', () => {
    const r = toScorerWordResult(
      reply({ score: HEARD_TRUST_SCORE + 2 }, { heard_text: 'Mitty gate' }),
      'mitigate',
      MITIGATE,
      STONES,
    );
    expect(r.status).toBe('ok');
  });

  it('ok when Whisper heard the word, with punctuation, capitals, extra words or UK spelling', () => {
    for (const heard_text of ['Mitigate.', 'mitigate, mitigate', 'I mitigate']) {
      expect(
        toScorerWordResult(reply({}, { heard_text }), 'mitigate', MITIGATE, STONES).status,
      ).toBe('ok');
    }
    expect(heardOtherWord('Colour', 'color')).toBeNull();
    expect(heardOtherWord('criticise', 'criticize')).toBeNull();
    expect(heardOtherWord('look up', 'look up')).toBeNull();
    expect(heardOtherWord('lookup', 'look up')).toBeNull();
  });

  it('a scorer split that differs from the stored stones is a scoring error, never one stone', () => {
    const two = [
      { text: 'miti', stressed: true },
      { text: 'gate', stressed: false },
    ];
    expect(() => toScorerWordResult(reply(), 'mitigate', MITIGATE, two)).toThrow(
      SyllableMismatchError,
    );
    // Labels fall back to the stone text when the IPA splits differently.
    const r = toScorerWordResult(reply(), 'mitigate', '/ˈmɪtɪɡeɪt/', STONES);
    expect(r.syllables.map((s) => s.ipa)).toEqual(['mi', 'ti', 'gate']);
  });

  it('a one-stone word takes all its phones as one syllable', () => {
    const cat = reply(
      {
        text: 'cat',
        phones: phones([
          ['K', 90],
          ['AE', 80],
          ['T', 70],
        ]),
      },
      { heard_text: 'cat' },
    );
    const r = toScorerWordResult(cat, 'cat', '/kæt/', [{ text: 'cat', stressed: true }]);
    expect(r.syllables).toHaveLength(1);
    expect(r.syllables[0]).toMatchObject({ text: 'cat', score: 80, wobbly: false });
  });

  it('uses the overall total when the word was not scored (no phones known)', () => {
    const r = toScorerWordResult(reply({ score: null, phones: [] }, { total: 77 }), 'zzqxv', '', [
      { text: 'zzqxv', stressed: true },
    ]);
    expect(r.total).toBe(77);
    expect(r.syllables).toHaveLength(1);
  });
});

describe('heardOtherWord', () => {
  it('says a heard word is shorter when it drops a syllable or the start or end', () => {
    expect(heardOtherWord('Cloud.', 'cloudy')).toEqual({ heard: 'cloud', shorter: true });
    expect(heardOtherWord('car', 'cart')).toEqual({ heard: 'car', shorter: true });
    expect(heardOtherWord('ticket', 'pocket')).toEqual({ heard: 'ticket', shorter: false });
  });
});

describe('spelledSyllables', () => {
  it('counts vowel groups, y as a vowel, without a silent e', () => {
    expect(spelledSyllables('cloud')).toBe(1);
    expect(spelledSyllables('cloudy')).toBe(2);
    expect(spelledSyllables('mitigate')).toBe(3);
    expect(spelledSyllables('migrate')).toBe(2);
    expect(spelledSyllables('table')).toBe(2);
    expect(spelledSyllables('the')).toBe(1);
  });
});
