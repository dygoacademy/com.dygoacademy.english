import { describe, expect, it } from 'vitest';

import { PRON } from './pron-config';
import { autoStop, p4Buttons, stoneView, tooQuiet } from './pron-result';

describe('pron-config (plan of 2026-10-25, section 2)', () => {
  it('has the plan’s numbers', () => {
    expect(PRON).toMatchObject({
      silenceMs: 1000,
      maxMs: 4000,
      minVoiceMs: 300,
      wobblyBelow: 60,
      passAtLeast: 80,
      cleanAtLeast: 85,
      otherWordTrust: 90,
    });
  });
});

describe('stoneView: stone states from the scores', () => {
  it('pass: overall 80+ and every syllable 85+, all clean, nothing selected', () => {
    expect(stoneView(80, [85, 90, 99])).toEqual({
      states: ['clean', 'clean', 'clean'],
      outcome: 'pass',
      selected: -1,
      clean: 3,
    });
  });

  it('almost perfect: a pass with a syllable under 85, that stone close and selected', () => {
    expect(stoneView(86, [95, 84, 92])).toEqual({
      states: ['clean', 'close', 'clean'],
      outcome: 'almost',
      selected: 1,
      clean: 2,
    });
  });

  it('default: a pass with a syllable under 60 shows it as close, never wobbly', () => {
    expect(stoneView(82, [99, 55, 99]).states).toEqual(['clean', 'close', 'clean']);
  });

  it('retry: under 80 overall; syllables under 60 wobble, the rest are clean', () => {
    expect(stoneView(62, [90, 30, 70])).toEqual({
      states: ['clean', 'wobbly', 'clean'],
      outcome: 'retry',
      selected: 1,
      clean: 2,
    });
    expect(stoneView(79, [60, 61, 99]).outcome).toBe('retry');
  });

  it('default: a retry with no syllable under 60 marks the lowest as wobbly', () => {
    expect(stoneView(70, [72, 65, 75]).states).toEqual(['clean', 'wobbly', 'clean']);
  });

  it('default: 2+ wobbly stones, the badge counts the real clean ones and the lowest is selected', () => {
    const v = stoneView(50, [40, 90, 20, 95]);
    expect(v.states).toEqual(['wobbly', 'clean', 'wobbly', 'clean']);
    expect(v.clean).toBe(2);
    expect(v.selected).toBe(2);
  });

  it('a one-stone word works the same way', () => {
    expect(stoneView(90, [90]).states).toEqual(['clean']);
    expect(stoneView(50, [50]).states).toEqual(['wobbly']);
  });
});

describe('p4Buttons: the P4 button table', () => {
  it('pass: Next bee + Say it again; last bee: Back to the bed + Say it again', () => {
    expect(p4Buttons('pass', false)).toEqual({ main: 'nextBee', link: 'sayAgain' });
    expect(p4Buttons('pass', true)).toEqual({ main: 'backToBed', link: 'sayAgain' });
  });
  it('almost: Next bee + Polish {syl}; last bee: Back to the bed + Polish {syl}', () => {
    expect(p4Buttons('almost', false)).toEqual({ main: 'nextBee', link: 'polish' });
    expect(p4Buttons('almost', true)).toEqual({ main: 'backToBed', link: 'polish' });
  });
  it('retry: Try again + Skip to next bee; last bee: Try again + Back to the bed', () => {
    expect(p4Buttons('retry', false)).toEqual({ main: 'tryAgain', link: 'skip' });
    expect(p4Buttons('retry', true)).toEqual({ main: 'tryAgain', link: 'backToBed' });
  });
});

describe('recording rules', () => {
  it('auto-stop: 1 s of silence after speech, 4 s max, else keep going', () => {
    expect(autoStop(1200, true, 999)).toBeNull();
    expect(autoStop(1200, true, 1000)).toBe('silence');
    expect(autoStop(2000, false, 2000)).toBeNull(); // silence before any voice doesn't stop it
    expect(autoStop(4000, false, 0)).toBe('max');
  });
  it('under 0.3 s of voice is too quiet (P2b)', () => {
    expect(tooQuiet(299)).toBe(true);
    expect(tooQuiet(300)).toBe(false);
  });
});
