import {
  buildSsml,
  buildTimings,
  encodeWav,
  findTargetIndex,
  ipaSyllables,
  parseWav,
  PcmClip,
  startsFromTimepoints,
  targetIpaFor,
  tokenize,
  trimSilence,
  validateTimings,
} from './speaking-timings';

const RATE = 16000;

/** A clip of `segments`: [seconds, loud?] in order. Loud = a 220 Hz tone at half scale. */
function clipOf(segments: [number, boolean][]): PcmClip {
  const total = Math.round(segments.reduce((s, [d]) => s + d, 0) * RATE);
  const samples = new Int16Array(total);
  let i = 0;
  for (const [d, loud] of segments) {
    const n = Math.round(d * RATE);
    for (let k = 0; k < n; k++, i++) {
      samples[i] = loud ? Math.round(16000 * Math.sin((2 * Math.PI * 220 * i) / RATE)) : 0;
    }
  }
  return { samples, sampleRate: RATE };
}

const SENTENCE = 'Planting more trees can help mitigate the effects of climate change.';

describe('tokenize / findTargetIndex', () => {
  it('keeps punctuation on tokens and finds the target word', () => {
    const tokens = tokenize(`  ${SENTENCE} `);
    expect(tokens).toHaveLength(11);
    expect(tokens[10]).toBe('change.');
    expect(findTargetIndex(tokens, 'mitigate')).toBe(5);
  });

  it('matches inflections and ignores case and punctuation', () => {
    expect(findTargetIndex(tokenize('Droughts are getting worse.'), 'drought')).toBe(0);
    expect(findTargetIndex(tokenize('The road is deteriorating fast.'), 'deteriorate')).toBe(3);
    expect(findTargetIndex(tokenize('They mitigated it, quickly.'), 'mitigate')).toBe(1);
    expect(findTargetIndex(tokenize('Nothing here matches.'), 'mitigate')).toBe(-1);
  });

  it('does not take a much longer word as an inflection', () => {
    expect(findTargetIndex(tokenize('Sustainability matters.'), 'sustain')).toBe(-1);
  });

  it('matches a multi-word entry in a row and returns its first token', () => {
    expect(findTargetIndex(tokenize('We ate at the food court, then left.'), 'food court')).toBe(4);
    expect(findTargetIndex(tokenize('Long beans grow fast.'), 'long beans')).toBe(0);
    // last word may be inflected; the words must be adjacent
    expect(findTargetIndex(tokenize('Two food courts opened.'), 'food court')).toBe(1);
    expect(findTargetIndex(tokenize('Food at the court.'), 'food court')).toBe(-1);
    expect(findTargetIndex(tokenize('Say hello world!'), 'Hello  World')).toBe(1);
  });
});

describe('targetIpaFor', () => {
  it('keeps the IPA of a single word as is', () => {
    expect(targetIpaFor('mitigate', '/ˈmɪt.ɪ.ɡeɪt/')).toBe('/ˈmɪt.ɪ.ɡeɪt/');
    expect(targetIpaFor('mitigate', null)).toBeNull();
  });

  it('uses the first word of a phrase IPA, always with a stressed syllable', () => {
    expect(targetIpaFor('food court', '/ˈfuːd ˌkɔːrt/')).toBe('/ˈfuːd/');
    expect(targetIpaFor('french beans', '/ˌfrentʃ ˈbiːnz/')).toBe('/ˈfrentʃ/');
    expect(targetIpaFor('hello world', '/hə.loʊ ˈwɜːld/')).toBe('/ˈhə.loʊ/');
    expect(ipaSyllables(targetIpaFor('hello world', '/həˈloʊ ˈwɜːld/'))).toEqual([
      { stressed: false },
      { stressed: true },
    ]);
  });
});

describe('buildSsml / startsFromTimepoints', () => {
  it('puts a mark before each token and at the end, escaping XML', () => {
    expect(buildSsml(['Rock', '&', 'roll.'])).toBe(
      '<speak><mark name="w0"/>Rock <mark name="w1"/>&amp; <mark name="w2"/>roll.<mark name="end"/></speak>',
    );
  });

  it('maps timepoints to token starts and the end mark', () => {
    const tps = [
      { markName: 'w1', timeSeconds: 0.4 },
      { markName: 'w0' }, // Google omits timeSeconds when it is 0
      { markName: 'end', timeSeconds: 0.9 },
    ];
    expect(startsFromTimepoints(2, tps)).toEqual({ starts: [0, 0.4], end: 0.9 });
  });

  it('throws when a token has no timepoint', () => {
    expect(() => startsFromTimepoints(2, [{ markName: 'w0', timeSeconds: 0 }])).toThrow('w1');
  });
});

describe('ipaSyllables', () => {
  it('splits on dots and stress marks; only primary stress counts', () => {
    expect(ipaSyllables('/ˈmɪt.ɪ.ɡeɪt/')).toEqual([
      { stressed: true },
      { stressed: false },
      { stressed: false },
    ]);
    const bio = ipaSyllables('/ˌbaɪ.oʊ.daɪˈvɜːr.sə.ti/');
    expect(bio).toHaveLength(6);
    expect(bio.map((s) => s.stressed)).toEqual([false, false, false, true, false, false]);
  });

  it('treats a single unmarked syllable as stressed, and handles no IPA', () => {
    expect(ipaSyllables('/draʊt/')).toEqual([{ stressed: true }]);
    expect(ipaSyllables(null)).toEqual([]);
    expect(ipaSyllables('')).toEqual([]);
  });

  it('uses only the first of several transcriptions', () => {
    expect(ipaSyllables('/ˈæn.əl.aɪz/, /ˈæn.l̩.aɪz/')).toHaveLength(3);
  });
});

describe('trimSilence', () => {
  it('pulls word edges in over silence', () => {
    const clip = clipOf([
      [0.2, false],
      [0.3, true],
      [0.2, false],
    ]);
    const { start, end } = trimSilence(clip, 0, 0.7);
    expect(start).toBeCloseTo(0.2, 1);
    expect(end).toBeCloseTo(0.5, 1);
  });

  it('leaves an all-silent range alone', () => {
    const clip = clipOf([[0.5, false]]);
    expect(trimSilence(clip, 0.1, 0.4)).toEqual({ start: 0.1, end: 0.4 });
  });
});

describe('buildTimings', () => {
  // "help mitigate it": three words with pauses between them.
  const clip = clipOf([
    [0.05, false],
    [0.25, true], // help 0.05–0.30
    [0.1, false],
    [0.45, true], // mitigate 0.40–0.85
    [0.1, false],
    [0.15, true], // it 0.95–1.10
    [0.2, false],
  ]);
  const tokens = ['help', 'mitigate', 'it.'];

  it('builds valid timings with trimmed ends and target syllables', () => {
    const timings = buildTimings({
      tokens,
      starts: [0, 0.35, 0.9],
      end: 1.2,
      clip,
      targetIndex: 1,
      targetIpa: '/ˈmɪt.ɪ.ɡeɪt/',
    });
    expect(timings.duration).toBeCloseTo(1.3, 3);
    expect(timings.words.map((w) => w.text)).toEqual(tokens);
    expect(timings.words[0].end).toBeCloseTo(0.3, 1);
    expect(timings.words[1].start).toBeCloseTo(0.4, 1);
    expect(timings.words[1].end).toBeCloseTo(0.85, 1);
    expect(timings.words[0].syllables).toEqual([]);
    const syl = timings.words[1].syllables;
    expect(syl).toHaveLength(3);
    expect(syl[0].stressed).toBe(true);
    expect(syl[0].start).toBe(timings.words[1].start);
    expect(syl[2].end).toBe(timings.words[1].end);
    expect(validateTimings(timings, { tokenCount: 3, targetIndex: 1 })).toEqual([]);
  });

  it('rejects a start count that does not match the tokens', () => {
    expect(() =>
      buildTimings({ tokens, starts: [0, 0.4], clip, targetIndex: 1, targetIpa: null }),
    ).toThrow('expected 3');
  });
});

describe('validateTimings', () => {
  const good = {
    duration: 1,
    words: [
      { text: 'Hi', start: 0, end: 0.4, syllables: [{ start: 0, end: 0.4, stressed: true }] },
      { text: 'there.', start: 0.5, end: 0.9, syllables: [] },
    ],
  };

  it('accepts the handover shape', () => {
    expect(validateTimings(good, { tokenCount: 2, targetIndex: 0 })).toEqual([]);
  });

  it('reports each problem', () => {
    expect(validateTimings(null)).toEqual(['timings: not an object']);
    expect(validateTimings({ words: [] })).toContain('duration: must be a positive number');
    expect(
      validateTimings({ duration: 1, words: [{ text: 'a', start: 0.5, end: 0.2, syllables: [] }] }),
    ).toContain('words[0]: end before start');
    expect(
      validateTimings({ duration: 0.5, words: [{ text: 'a', start: 0, end: 0.9, syllables: [] }] }),
    ).toContain('words[0]: ends after the clip');
    expect(validateTimings(good, { tokenCount: 3 })).toContain('words: expected 3, got 2');
    expect(validateTimings(good, { targetIndex: 1 })).toContain('target word 1: no syllables');
  });
});

describe('parseWav / encodeWav', () => {
  it('round-trips mono 16-bit PCM', () => {
    const clip = clipOf([[0.01, true]]);
    const back = parseWav(encodeWav(clip));
    expect(back.sampleRate).toBe(RATE);
    expect(Array.from(back.samples)).toEqual(Array.from(clip.samples));
  });

  it('rejects non-WAV input', () => {
    expect(() => parseWav(Buffer.from('not audio at all'))).toThrow('not a WAV');
  });
});
