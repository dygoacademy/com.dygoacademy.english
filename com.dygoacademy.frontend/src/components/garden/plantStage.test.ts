import { describe, expect, it } from 'vitest';

import { stageFromSrs, type GardenFsrsState, type SrsPlantStage } from './plantStage';

const STATES: GardenFsrsState[] = ['New', 'Learning', 'Review', 'Relearning'];
const BY_STATE: Record<GardenFsrsState, SrsPlantStage> = {
  New: 'seed',
  Learning: 'sprout',
  Relearning: 'sprout',
  Review: 'flower',
};
const MASTERED_VALUES = [null, undefined, '', '2026-09-01T08:00:00Z', new Date('2026-09-01')];
const LEECH_VALUES = [false, true, null, undefined];

describe('stageFromSrs', () => {
  it.each(STATES)('%s, not mastered, not a leech → its own stage', (state) => {
    expect(stageFromSrs(state, null, false)).toBe(BY_STATE[state]);
  });

  it('maps New → seed, Learning/Relearning → sprout, Review → flower', () => {
    expect(stageFromSrs('New', null, false)).toBe('seed');
    expect(stageFromSrs('Learning', null, false)).toBe('sprout');
    expect(stageFromSrs('Relearning', null, false)).toBe('sprout');
    expect(stageFromSrs('Review', null, false)).toBe('flower');
  });

  it('a mastered word is a tree in every state (mastery is sticky)', () => {
    for (const state of STATES) {
      expect(stageFromSrs(state, '2026-09-01T08:00:00Z', false)).toBe('tree');
      expect(stageFromSrs(state, new Date('2026-09-01'), false)).toBe('tree');
    }
  });

  it('a leech is wilting in every state, mastered or not', () => {
    for (const state of STATES) {
      expect(stageFromSrs(state, null, true)).toBe('wilting');
      expect(stageFromSrs(state, '2026-09-01T08:00:00Z', true)).toBe('wilting');
    }
  });

  it('treats null, undefined and empty mastered_at as not mastered', () => {
    expect(stageFromSrs('Review', undefined, false)).toBe('flower');
    expect(stageFromSrs('Review', '', false)).toBe('flower');
    expect(stageFromSrs('Review', null, null)).toBe('flower');
    expect(stageFromSrs('Review', null, undefined)).toBe('flower');
  });

  // Every combination of state × mastered_at × is_leech (4 × 5 × 4 = 80).
  const combos = STATES.flatMap((state) =>
    MASTERED_VALUES.flatMap((mastered) => LEECH_VALUES.map((leech) => ({ state, mastered, leech }))),
  );
  it.each(combos)('combination %o', ({ state, mastered, leech }) => {
    const isMastered = mastered !== null && mastered !== undefined && mastered !== '';
    const expected: SrsPlantStage = leech ? 'wilting' : isMastered ? 'tree' : BY_STATE[state];
    expect(stageFromSrs(state, mastered, leech)).toBe(expected);
  });

  it('never returns thirsty (due-now is an overlay, not a state)', () => {
    for (const { state, mastered, leech } of combos) {
      expect(stageFromSrs(state, mastered, leech)).not.toBe('thirsty');
    }
  });

  it('throws on an unknown state instead of guessing', () => {
    expect(() => stageFromSrs('Suspended' as GardenFsrsState, null, false)).toThrow(/unknown/);
  });
});
