import { describe, expect, it } from 'vitest';

import {
  followAlongIndex,
  formatClock,
  initialSpeakState,
  notHeard,
  meterDead,
  speechDiagnostics,
  voiceEnded,
  sessionPattern,
  speakReducer,
  type SpeakAction,
  type SpeakState,
} from './session';

const run = (state: SpeakState, ...actions: SpeakAction[]) => actions.reduce(speakReducer, state);

describe('speakReducer', () => {
  it('goes listen → recording → compare → next sentence, then done after the last', () => {
    let s = initialSpeakState(2);
    expect(s).toMatchObject({ phase: 'listen', index: 0 });
    s = run(s, { type: 'record' }, { type: 'stopped' });
    expect(s.phase).toBe('compare');
    s = run(s, { type: 'next' });
    expect(s).toMatchObject({ phase: 'listen', index: 1 });
    s = run(s, { type: 'record' }, { type: 'stopped' }, { type: 'next' });
    expect(s.phase).toBe('done');
  });

  it('cancel returns to listen; try again records the same sentence', () => {
    const s = run(initialSpeakState(5), { type: 'record' }, { type: 'cancel' });
    expect(s).toMatchObject({ phase: 'listen', index: 0 });
    const t = run(s, { type: 'record' }, { type: 'stopped' }, { type: 'tryAgain' });
    expect(t).toMatchObject({ phase: 'recording', index: 0 });
    // a recording that can't be decoded sends compare back to listen
    expect(run(t, { type: 'stopped' }, { type: 'cancel' }).phase).toBe('listen');
  });

  it('keeps the best score per sentence', () => {
    const s = run(
      initialSpeakState(5),
      { type: 'record' },
      { type: 'stopped' },
      { type: 'scored', stage: 'bloom', score: 80 },
      { type: 'tryAgain' },
      { type: 'stopped' },
      { type: 'scored', stage: 'sprout', score: 55 },
    );
    expect(s.best[0]).toEqual({ stage: 'bloom', score: 80 });
  });

  it('ignores actions that make no sense in the phase', () => {
    const s = initialSpeakState(3);
    expect(speakReducer(s, { type: 'stopped' })).toBe(s);
    expect(speakReducer(s, { type: 'tryAgain' })).toBe(s);
    expect(initialSpeakState(0).phase).toBe('done');
  });
});

describe('SP2 helpers', () => {
  const timings = {
    duration: 2,
    words: [
      { text: 'a', start: 0.1, end: 0.4, syllables: [] },
      { text: 'b', start: 0.5, end: 1, syllables: [] },
      { text: 'c', start: 1.2, end: 1.8, syllables: [] },
    ],
  };

  it('follows along at native pace', () => {
    expect(followAlongIndex(timings, 0, 1)).toBe(-1);
    expect(followAlongIndex(timings, 0.6, 1)).toBe(1);
    expect(followAlongIndex(timings, 9, 1)).toBe(2);
    expect(followAlongIndex(null, 1)).toBe(-1);
  });

  it('follows along 1.5× slower by default (G3-b)', () => {
    expect(followAlongIndex(timings, 0.6)).toBe(0);
    expect(followAlongIndex(timings, 0.75)).toBe(1);
  });

  it('formats the clock', () => {
    expect(formatClock(2400)).toBe('0:02');
    expect(formatClock(65_000)).toBe('1:05');
  });
});

describe('voiceEnded (auto-stop, handover v2 §3.2)', () => {
  const PER_S = 20;
  const bars = (seconds: number, level: number) =>
    Array.from({ length: Math.round(seconds * PER_S) }, () => level);
  const NOISE = 0.004;
  const VOICE = 0.2;

  it('waits while nothing has been said, however long', () => {
    expect(voiceEnded(bars(10, NOISE), PER_S)).toBe(false);
  });

  it('a late start is fine: waits through the silence, then the voice', () => {
    expect(voiceEnded([...bars(2, NOISE), ...bars(2, VOICE)], PER_S)).toBe(false);
  });

  it('stops 2 s after the voice ends', () => {
    const spoken = [...bars(1, NOISE), ...bars(2, VOICE)];
    expect(voiceEnded([...spoken, ...bars(1.9, NOISE)], PER_S)).toBe(false);
    expect(voiceEnded([...spoken, ...bars(2, NOISE)], PER_S)).toBe(true);
  });

  it("a pause between words shorter than 2 s doesn't stop it", () => {
    const levels = [
      ...bars(0.5, NOISE),
      ...bars(1, VOICE),
      ...bars(0.8, NOISE),
      ...bars(0.3, VOICE),
    ];
    expect(voiceEnded(levels, PER_S)).toBe(false);
  });

  it("a tap click (one loud bar) isn't voice", () => {
    expect(voiceEnded([0.5, ...bars(0.3, NOISE), 0.5, ...bars(3, NOISE)], PER_S)).toBe(false);
  });

  it('works in a noisy room: noise sets the gate', () => {
    const noisy = 0.02; // above the −45 dBFS gate
    const levels = [...bars(1, noisy), ...bars(2, VOICE), ...bars(2, noisy)];
    expect(voiceEnded(levels, PER_S)).toBe(true);
    expect(voiceEnded(bars(5, noisy), PER_S)).toBe(false);
  });
});

describe('notHeard (no voice 8 s after the beep)', () => {
  const PER_S = 20;
  const bars = (seconds: number, level: number) =>
    Array.from({ length: Math.round(seconds * PER_S) }, () => level);

  it('only after 8 s, and only with no voice at all', () => {
    expect(notHeard(bars(7.9, 0.004), PER_S, 7900)).toBe(false);
    expect(notHeard(bars(8, 0.004), PER_S, 8000)).toBe(true);
    expect(notHeard([...bars(6, 0.004), ...bars(2, 0.2)], PER_S, 8000)).toBe(false);
  });

  it('two tap clicks are still nothing heard', () => {
    expect(notHeard([0.5, ...bars(4, 0.004), 0.5, ...bars(4, 0.004)], PER_S, 8100)).toBe(true);
  });
});

describe('sessionPattern', () => {
  it('picks the most common tip, ties by priority, none when all flowed', () => {
    const flowed = { tipKey: 'speak.tip.flowed' };
    expect(sessionPattern({ 0: flowed, 1: flowed })).toBeNull();
    expect(
      sessionPattern({
        0: { tipKey: 'speak.tip.rushed', tipParams: { word: 'help' } },
        1: { tipKey: 'speak.tip.rushed', tipParams: { word: 'trees' } },
        2: {
          tipKey: 'speak.tip.stress',
          tipParams: { word: 'mitigate', syllable: '0' },
        },
      }),
    ).toEqual({
      index: 0,
      tipKey: 'speak.tip.rushed',
      tipParams: { word: 'help' },
    });
    expect(
      sessionPattern({
        3: { tipKey: 'speak.tip.slow' },
        4: { tipKey: 'speak.tip.stress' },
      })?.tipKey,
    ).toBe('speak.tip.stress');
  });
});

describe('speechDiagnostics (dev page, S19)', () => {
  const PER_S = 20;
  const bars = (seconds: number, level: number) =>
    Array.from({ length: Math.round(seconds * PER_S) }, () => level);

  it('reports voice, quiet time against the 2 s target, gate and floor', () => {
    const d = speechDiagnostics([...bars(1, 0.004), ...bars(2, 0.2), ...bars(1.5, 0.004)], PER_S);
    expect(d.heard).toBe(true);
    expect(d.quietMs).toBe(1500);
    expect(d.targetMs).toBe(2000);
    expect(d.longestQuietMs).toBe(1500);
    expect(d.floorDb).toBeCloseTo(20 * Math.log10(0.004), 0);
    expect(d.gateDb).toBeGreaterThan(d.floorDb);
  });

  it('nothing heard yet: no quiet time counted', () => {
    const d = speechDiagnostics(bars(3, 0.004), PER_S);
    expect(d.heard).toBe(false);
    expect(d.quietMs).toBe(0);
  });

  it('a loud blip in the quiet resets the quiet time (what noise does)', () => {
    const d = speechDiagnostics(
      [...bars(1, 0.004), ...bars(2, 0.2), ...bars(1, 0.004), 0.2, ...bars(0.5, 0.004)],
      PER_S,
    );
    expect(d.quietMs).toBe(500);
    expect(d.longestQuietMs).toBe(1000);
  });
});

describe('meterDead (iOS silent switch, 2026-10-05)', () => {
  const PER_S = 20;
  const zeros = (seconds: number) => Array.from({ length: seconds * PER_S }, () => 0);

  it('exact zeros for over a second = the meter gets no audio', () => {
    expect(meterDead(zeros(2), PER_S)).toBe(true);
    expect(meterDead(zeros(0.5), PER_S)).toBe(false);
    expect(meterDead([...zeros(2), 0.0001], PER_S)).toBe(false); // a real mic has room noise
  });

  it('a dead meter never says "We couldn\'t hear you"', () => {
    expect(notHeard(zeros(9), PER_S, 9000)).toBe(false);
    expect(
      notHeard(
        Array.from({ length: 180 }, () => 0.002),
        PER_S,
        9000,
      ),
    ).toBe(true);
    expect(speechDiagnostics(zeros(9), PER_S).meterDead).toBe(true);
  });
});
