import { describe, expect, it } from 'vitest';

import {
  followAlongIndex,
  formatClock,
  initialSpeakState,
  recordingTargetMs,
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
    expect(followAlongIndex(timings, 0)).toBe(-1);
    expect(followAlongIndex(timings, 0.6)).toBe(1);
    expect(followAlongIndex(timings, 9)).toBe(2);
    expect(followAlongIndex(null, 1)).toBe(-1);
  });

  it('formats the clock and the target time', () => {
    expect(formatClock(2400)).toBe('0:02');
    expect(formatClock(65_000)).toBe('1:05');
    expect(recordingTargetMs(3.3, 8000)).toBe(5000);
    expect(recordingTargetMs(6, 8000)).toBe(8000);
  });
});
