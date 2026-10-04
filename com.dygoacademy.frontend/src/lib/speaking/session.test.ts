import { describe, expect, it } from 'vitest';

import {
  followAlongIndex,
  formatClock,
  initialSpeakState,
  recordingTargetMs,
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

  it('formats the clock and the target time', () => {
    expect(formatClock(2400)).toBe('0:02');
    expect(formatClock(65_000)).toBe('1:05');
    expect(recordingTargetMs(3.3, 15000)).toBe(7000);
    expect(recordingTargetMs(9, 15000)).toBe(15000);
  });
});

describe('voiceEnded (auto-stop, G3-b)', () => {
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

  it('stops 1.5 s after the voice ends', () => {
    const spoken = [...bars(1, NOISE), ...bars(2, VOICE)];
    expect(voiceEnded([...spoken, ...bars(1.4, NOISE)], PER_S)).toBe(false);
    expect(voiceEnded([...spoken, ...bars(1.5, NOISE)], PER_S)).toBe(true);
  });

  it("a pause between words shorter than 1.5 s doesn't stop it", () => {
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
    const levels = [...bars(1, noisy), ...bars(2, VOICE), ...bars(1.5, noisy)];
    expect(voiceEnded(levels, PER_S)).toBe(true);
    expect(voiceEnded(bars(5, noisy), PER_S)).toBe(false);
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
