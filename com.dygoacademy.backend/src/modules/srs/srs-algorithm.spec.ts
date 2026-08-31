import {
  LEECH_THRESHOLD,
  MIN_EASE_FACTOR,
  STANDARD_INTERVALS_DAYS,
  applyRating,
  computeEaseFactor,
} from './srs-algorithm';

const NOW = new Date('2026-09-01T12:00:00.000Z');

describe('computeEaseFactor', () => {
  it('GOOD (q=4) leaves EF unchanged with no recent mistakes', () => {
    expect(computeEaseFactor(2.5, 'GOOD', 0)).toBe(2.5);
  });

  it('EASY (q=5) is a +0.1 bonus with no recent mistakes', () => {
    expect(computeEaseFactor(2.5, 'EASY', 0)).toBe(2.6);
  });

  it('AGAIN (q=0) is a large penalty (-0.8 before the M_recent term)', () => {
    expect(computeEaseFactor(2.5, 'AGAIN', 0)).toBe(1.7);
  });

  it('HARD (q=3) is a -0.14 penalty with no recent mistakes', () => {
    expect(computeEaseFactor(2.5, 'HARD', 0)).toBeCloseTo(2.36, 5);
  });

  it('recent mistakes subtract lambda per mistake', () => {
    // GOOD is EF-neutral on its own; 2 recent mistakes should cost 2*0.05.
    expect(computeEaseFactor(2.5, 'GOOD', 2)).toBeCloseTo(2.4, 5);
  });

  it('floors at MIN_EASE_FACTOR regardless of how bad the input', () => {
    expect(computeEaseFactor(1.3, 'AGAIN', 10)).toBe(MIN_EASE_FACTOR);
    expect(computeEaseFactor(1.35, 'AGAIN', 0)).toBe(MIN_EASE_FACTOR);
  });
});

describe('applyRating — AGAIN', () => {
  it('resets interval/repetitions and schedules a ~10 minute relearn step', () => {
    const outcome = applyRating(
      { easeFactor: 2.5, intervalDays: 7, repetitions: 3 },
      'AGAIN',
      0,
      NOW,
    );

    expect(outcome.intervalDays).toBe(0);
    expect(outcome.repetitions).toBe(0);
    expect(outcome.mistakeIncrement).toBe(1);
    expect(outcome.wasCorrect).toBe(false);
    expect(outcome.nextDueAt.getTime() - NOW.getTime()).toBe(10 * 60_000);
  });
});

describe('applyRating — GOOD ladder', () => {
  it('walks a new card through the documented 1d -> 3d -> 7d -> 16d ladder', () => {
    let state = { easeFactor: 2.5, intervalDays: 0, repetitions: 0 };
    const seenIntervals: number[] = [];

    for (let i = 0; i < STANDARD_INTERVALS_DAYS.length; i++) {
      const outcome = applyRating(state, 'GOOD', 0, NOW);
      seenIntervals.push(outcome.intervalDays);
      state = outcome;
    }

    expect(seenIntervals).toEqual(STANDARD_INTERVALS_DAYS);
  });

  it('grows by ease factor once past the fixed ladder points', () => {
    // Fifth GOOD review: repetitions goes to 5, past STANDARD_INTERVALS_DAYS's 4 entries.
    const state = { easeFactor: 2.0, intervalDays: 16, repetitions: 4 };
    const outcome = applyRating(state, 'GOOD', 0, NOW);

    expect(outcome.repetitions).toBe(5);
    expect(outcome.intervalDays).toBe(Math.round(16 * outcome.easeFactor));
  });

  it('mistakeIncrement is 0 and wasCorrect is true', () => {
    const outcome = applyRating(
      { easeFactor: 2.5, intervalDays: 0, repetitions: 0 },
      'GOOD',
      0,
      NOW,
    );
    expect(outcome.mistakeIncrement).toBe(0);
    expect(outcome.wasCorrect).toBe(true);
  });
});

describe('applyRating — HARD', () => {
  it('multiplies the previous interval by 1.2 rather than following the ladder', () => {
    const outcome = applyRating(
      { easeFactor: 2.5, intervalDays: 10, repetitions: 3 },
      'HARD',
      0,
      NOW,
    );
    expect(outcome.intervalDays).toBe(Math.round(10 * 1.2));
  });

  it('floors the base interval at 1 day for a brand new card', () => {
    const outcome = applyRating(
      { easeFactor: 2.5, intervalDays: 0, repetitions: 0 },
      'HARD',
      0,
      NOW,
    );
    expect(outcome.intervalDays).toBe(1);
  });
});

describe('applyRating — EASY', () => {
  it('applies a 1.3x bonus on top of the ladder interval', () => {
    const outcome = applyRating(
      { easeFactor: 2.5, intervalDays: 0, repetitions: 0 },
      'EASY',
      0,
      NOW,
    );
    // repetitions -> 1, ladder = STANDARD_INTERVALS_DAYS[0] = 1
    expect(outcome.intervalDays).toBe(Math.round(1 * 1.3));
  });
});

describe('LEECH_THRESHOLD', () => {
  it('matches FR-3.3 (>= 4 failures in 7 days)', () => {
    expect(LEECH_THRESHOLD).toBe(4);
  });
});
