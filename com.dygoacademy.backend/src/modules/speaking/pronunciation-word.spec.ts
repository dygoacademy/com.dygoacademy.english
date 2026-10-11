import {
  OTHER_WORD_SCORE,
  syllabify,
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

describe('toScorerWordResult', () => {
  it('one stone per IPA syllable, scored by the mean of its phones', () => {
    const r = toScorerWordResult(reply(), 'mitigate', MITIGATE);
    expect(r.status).toBe('ok');
    expect(r.total).toBe(92);
    expect(r.syllables.map((s) => s.ipa)).toEqual(['ˈmɪt', 'ɪ', 'ɡeɪt']);
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
        ['AH', 30],
        ['G', 91],
        ['EY', 93],
        ['T', 92],
      ]),
    });
    const r = toScorerWordResult(bad, 'mitigate', MITIGATE);
    expect(r.syllables.map((s) => s.wobbly)).toEqual([false, true, false]);
    expect(r.syllables[1].score).toBeLessThan(WOBBLY_SCORE);
  });

  it('wobbles a syllable with one clearly wrong phone even when the mean is fine', () => {
    const one = reply({
      phones: phones([
        ['M', 99],
        ['IH', 99],
        ['T', 99],
        ['AH', 99],
        ['G', 99],
        ['EY', 99],
        ['T', 40],
      ]),
    });
    expect(toScorerWordResult(one, 'mitigate', MITIGATE).syllables[2].wobbly).toBe(true);
  });

  it('not_heard when nothing was heard or the word is missing', () => {
    expect(toScorerWordResult(reply({}, { heard_text: ' ' }), 'mitigate', MITIGATE)).toMatchObject({
      status: 'not_heard',
      total: 0,
      syllables: [],
    });
    expect(
      toScorerWordResult(reply({ status: 'missing', score: 20 }), 'mitigate', MITIGATE).status,
    ).toBe('not_heard');
    expect(toScorerWordResult({ ...reply(), words: [] }, 'mitigate', MITIGATE).status).toBe(
      'not_heard',
    );
  });

  it('not_heard for a clip with almost no voice, even if Whisper made a word of the noise', () => {
    const silent = reply(
      { heard: 'you', score: 27, status: 'unclear' },
      { heard_text: 'You', voiced_ms: 0 },
    );
    expect(toScorerWordResult(silent, 'mitigate', MITIGATE).status).toBe('not_heard');
    const spoken = reply({}, { voiced_ms: 640 });
    expect(toScorerWordResult(spoken, 'mitigate', MITIGATE).status).toBe('ok');
  });

  it('other_word when Whisper heard another word and the sounds are poor', () => {
    const r = toScorerWordResult(
      reply({ heard: 'migrate', score: OTHER_WORD_SCORE - 10, status: 'unclear' }),
      'mitigate',
      MITIGATE,
    );
    expect(r.status).toBe('other_word');
    // heard another word but the sounds are fine: Whisper misheard
    expect(
      toScorerWordResult(
        reply({ heard: 'migrate', score: 88, status: 'unclear' }),
        'mitigate',
        MITIGATE,
      ).status,
    ).toBe('ok');
  });

  it('falls back to one stone when the IPA syllables do not match the phones', () => {
    for (const ipa of ['', '/ˈmɪ.tɪ/', '/ˈmɪt/']) {
      const r = toScorerWordResult(reply(), 'mitigate', ipa);
      expect(r.syllables).toEqual([{ ipa: 'mitigate', score: 92, wobbly: false, heard_ipa: null }]);
    }
  });

  it('uses the overall total when the word was not scored (no phones known)', () => {
    const r = toScorerWordResult(reply({ score: null, phones: [] }, { total: 77 }), 'zzqxv', '');
    expect(r.total).toBe(77);
    expect(r.syllables).toHaveLength(1);
  });
});
