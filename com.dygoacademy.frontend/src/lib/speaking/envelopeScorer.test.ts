import { describe, expect, it } from 'vitest';

import type { SpeakingTimings } from '@/types';

import { stageForScore, TIP_KEYS } from './constants';
import { dtw, envelopeScorer, loudRange, scoreSpeaking } from './envelopeScorer';

/**
 * Synthetic "sentences" (handover §3 tests): each word is a 220 Hz tone
 * burst, 80 ms apart, after 200 ms of silence. The target "mitigate" is
 * three back-to-back syllables, the first one loud (stressed).
 */
const WORDS: Array<{ text: string; dur: number; amp: number }> = [
  { text: 'Planting', dur: 0.35, amp: 0.8 },
  { text: 'more', dur: 0.2, amp: 0.6 },
  { text: 'trees', dur: 0.3, amp: 0.8 },
  { text: 'can', dur: 0.15, amp: 0.5 },
  { text: 'help', dur: 0.25, amp: 0.7 },
  { text: 'mitigate', dur: 0.54, amp: 0 }, // syllables below
  { text: 'the', dur: 0.1, amp: 0.5 },
  { text: 'effects.', dur: 0.35, amp: 0.8 },
];
const TARGET = 5;
const STRESSED = [1, 0.4, 0.4];

interface Options {
  rate?: number;
  stretch?: number;
  targetAmps?: number[];
  silent?: number[];
  tailSeconds?: number;
}

function sentence({
  rate = 24000,
  stretch = 1,
  targetAmps = STRESSED,
  silent = [],
  tailSeconds = 0.3,
}: Options = {}) {
  const gap = 0.08 * stretch;
  const lead = 0.2;
  const total = lead + WORDS.reduce((s, w) => s + w.dur * stretch + gap, 0) + tailSeconds;
  const samples = new Float32Array(Math.round(total * rate));
  const timings: SpeakingTimings = { duration: total, words: [] };
  const tone = (from: number, dur: number, amp: number) => {
    const a = Math.round(from * rate);
    const b = Math.round((from + dur) * rate);
    for (let i = a; i < b; i++) samples[i] = amp * Math.sin((2 * Math.PI * 220 * i) / rate);
  };
  let t = lead;
  WORDS.forEach((w, index) => {
    const dur = w.dur * stretch;
    const quiet = silent.includes(index);
    if (index === TARGET) {
      const syl = dur / 3;
      const syllables = targetAmps.map((amp, k) => {
        if (!quiet) tone(t + k * syl, syl, amp * 0.8);
        return {
          start: t + k * syl,
          end: t + (k + 1) * syl,
          stressed: k === 0,
        };
      });
      timings.words.push({ text: w.text, start: t, end: t + dur, syllables });
    } else {
      if (!quiet) tone(t, dur, w.amp);
      timings.words.push({
        text: w.text,
        start: t,
        end: t + dur,
        syllables: [],
      });
    }
    t += dur + gap;
  });
  return { samples, timings, rate };
}

const native = sentence();
const score = (user: ReturnType<typeof sentence>) =>
  scoreSpeaking({
    native: native.samples,
    nativeRate: native.rate,
    timings: native.timings,
    user: user.samples,
    userRate: user.rate,
    targetIndex: TARGET,
  });

describe('envelope scorer: the four handover tests', () => {
  it('identical clip ≈ 100, every word fine, "flowed well"', () => {
    const r = score(sentence({ rate: 48000 })); // same speech, phone's 48 kHz
    expect(r.score).toBeGreaterThanOrEqual(98);
    expect(r.stage).toBe('fruit');
    expect(r.wordMarks.every((m) => m.ok && m.reason === null)).toBe(true);
    expect(r.tipKey).toBe(TIP_KEYS.flowed);
    expect(r.envelopes.native.length).toBeGreaterThan(0);
  });

  it('silence = seed with every word missing', () => {
    const r = score({
      samples: new Float32Array(48000 * 3),
      timings: native.timings,
      rate: 48000,
    });
    expect(r.stage).toBe('seed');
    expect(r.score).toBeLessThan(40);
    expect(r.wordMarks).toHaveLength(WORDS.length);
    expect(r.wordMarks.every((m) => !m.ok && m.reason === 'missing')).toBe(true);
    expect(r.userDurationMs).toBe(0);
  });

  it('flattened target syllable → stress_soft on the target, stress tip', () => {
    const r = score(sentence({ rate: 48000, targetAmps: [0.4, 0.4, 0.4] }));
    expect(r.wordMarks[TARGET]).toEqual({
      index: TARGET,
      ok: false,
      reason: 'stress_soft',
    });
    expect(r.wordMarks.filter((m) => m.index !== TARGET).every((m) => m.ok)).toBe(true);
    expect(r.tipKey).toBe(TIP_KEYS.stress);
    expect(r.tipParams).toEqual({ word: 'mitigate', syllable: '0' });
    expect(r.score).toBeLessThan(score(sentence({ rate: 48000 })).score);
  });

  it('time-stretched ×1.15 still scores ≥ 85', () => {
    const r = score(sentence({ rate: 48000, stretch: 1.15 }));
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.wordMarks.every((m) => m.reason !== 'missing')).toBe(true);
  });
});

describe('envelope scorer: other marks', () => {
  it('a word left out is missing and named in the tip', () => {
    const r = score(sentence({ rate: 48000, silent: [2] }));
    expect(r.wordMarks[2]).toEqual({ index: 2, ok: false, reason: 'missing' });
    expect(r.tipKey).toBe(TIP_KEYS.missing);
    expect(r.tipParams).toEqual({ words: 'trees' });
  });

  it('far too fast loses pace points', () => {
    const fast = score(sentence({ rate: 48000, stretch: 0.5 }));
    const normal = score(sentence({ rate: 48000 }));
    expect(fast.score).toBeLessThan(normal.score);
  });

  it('runs a 5 s clip in under 150 ms', async () => {
    const long = sentence({
      rate: 48000,
      tailSeconds: 5 - native.timings.duration + 0.3,
    });
    const t0 = performance.now();
    await envelopeScorer.score({
      native: native.samples,
      nativeRate: native.rate,
      timings: native.timings,
      user: long.samples,
      userRate: long.rate,
    });
    const ms = performance.now() - t0;
    console.info(
      `envelope scorer: ${ms.toFixed(1)} ms for a ${(long.samples.length / 48000).toFixed(1)} s clip`,
    );
    expect(ms).toBeLessThan(150);
  });
});

/**
 * The learner starts late (G3, 2026-10-04): `lateSeconds` of room noise
 * before the sentence, with the mic-tap click at the very start and a
 * short click (phone handling) in the middle of the wait.
 */
function lateStart(lateSeconds: number, noiseRms = 0.012) {
  const clean = sentence({ rate: 48000 });
  const rate = clean.rate;
  const lead = Math.round(lateSeconds * rate);
  const samples = new Float32Array(lead + clean.samples.length);
  samples.set(clean.samples, lead);
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const amp = noiseRms * Math.sqrt(3); // uniform noise with this RMS
  for (let i = 0; i < samples.length; i++) samples[i] += amp * rand();
  const click = (at: number) => {
    const a = Math.round(at * rate);
    for (let i = a; i < a + Math.round(0.012 * rate); i++) samples[i] += 0.6 * rand();
  };
  click(0.03);
  click(lateSeconds / 2);
  return { samples, timings: clean.timings, rate };
}

describe('envelope scorer: late start, tap click and room noise', () => {
  const clean = score(sentence({ rate: 48000 }));

  it.each([1, 2])('starting %i s late scores within 5 points of on time', (late) => {
    const r = score(lateStart(late));
    expect(r.score).toBeGreaterThanOrEqual(clean.score - 5);
    expect(r.wordMarks.every((m) => m.reason !== 'missing')).toBe(true);
  });

  it('measures only the voice, not the wait before it', () => {
    const r = score(lateStart(2));
    expect(Math.abs(r.userDurationMs - clean.userDurationMs)).toBeLessThanOrEqual(60);
  });

  it('room noise alone is still "nothing heard"', () => {
    const noise = lateStart(0);
    const r = score({
      ...noise,
      samples: lateStart(3).samples.slice(0, 48000 * 2),
    });
    expect(r.userDurationMs).toBe(0);
  });
});

describe('scorer parts', () => {
  it('stages: < 40 seed · 40–69 sprout · 70–89 bloom · ≥ 90 fruit', () => {
    expect([0, 39, 40, 69, 70, 89, 90, 100].map(stageForScore)).toEqual([
      'seed',
      'seed',
      'sprout',
      'sprout',
      'bloom',
      'bloom',
      'fruit',
      'fruit',
    ]);
  });

  it('loudRange trims silence with a 150 ms hang', () => {
    const env = [...Array(50).fill(0), ...Array(20).fill(0.5), ...Array(50).fill(0)];
    expect(loudRange(env)).toEqual({ start: 35, end: 85 });
    expect(loudRange(Array(10).fill(0))).toBeNull();
  });

  it('dtw maps a stretched copy frame to frame with no cost', () => {
    const a = [0, 1, 2, 3];
    const r = dtw(a, [0, 0, 1, 1, 2, 2, 3, 3]);
    expect(r.cost).toBe(0);
    expect(Array.from(r.first)).toEqual([0, 2, 4, 6]);
    expect(Array.from(r.last)).toEqual([1, 3, 5, 7]);
  });
});
