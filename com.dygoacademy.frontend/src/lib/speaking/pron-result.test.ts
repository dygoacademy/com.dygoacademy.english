import { describe, expect, it } from 'vitest';

import { PRON } from './pron-config';
import { autoStop, tooQuiet } from './pron-result';

describe('pron-config (plan of 2026-10-25, section 2)', () => {
  it('has the plan’s numbers', () => {
    expect(PRON).toMatchObject({
      silenceMs: 1000,
      maxMs: 4000,
      minVoiceMs: 300,
      passAtLeast: 80,
      closeBand: 5,
      otherWordTrust: 90,
      slowRate: 0.75,
    });
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
