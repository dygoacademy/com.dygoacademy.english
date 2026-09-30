import {
  FsrsCardState,
  MASTERY_STABILITY_DAYS,
  SrsRating,
  computeRatingIntervals,
  createScheduler,
  formatInterval,
  newCard,
  nextMasteredAt,
  retrievability,
  schedule,
} from './fsrs-scheduler';
import { gradeFlashcard } from './grading';

/** Production parameters with fuzz off, so intervals are exact. */
const scheduler = createScheduler({ enable_fuzz: false });
const START = new Date('2026-10-01T09:00:00.000Z');
const DAY = 86_400_000;

/** Reviews a new card with `ratings`, each exactly when it comes due; returns the intervals in days. */
function run(ratings: SrsRating[]): { intervals: number[]; card: FsrsCardState } {
  let card = newCard(START);
  let now = START;
  const intervals: number[] = [];
  for (const r of ratings) {
    card = schedule(card, r, now, scheduler).card;
    intervals.push(Math.round((card.dueAt.getTime() - now.getTime()) / DAY));
    now = card.dueAt;
  }
  return { intervals, card };
}

describe('fsrs-scheduler — spacing at 0.95 target retention', () => {
  it('GOOD every time reproduces the familiar 1 → 3 → 8 → 19 → 43 → 89 day ladder', () => {
    expect(run(['GOOD', 'GOOD', 'GOOD', 'GOOD', 'GOOD', 'GOOD']).intervals).toEqual([
      1, 3, 8, 19, 43, 89,
    ]);
  });

  it('HARD keeps growing instead of being stuck at 1 day (old SM-2 bug #1)', () => {
    const { intervals } = run(['HARD', 'HARD', 'HARD', 'HARD', 'HARD', 'HARD', 'HARD', 'HARD']);
    expect(intervals).toEqual([1, 1, 2, 3, 3, 4, 5, 6]);
    for (let i = 1; i < intervals.length; i++) {
      expect(intervals[i]).toBeGreaterThanOrEqual(intervals[i - 1]);
    }
  });

  it('EASY on a new card is longer than GOOD (old SM-2 bug #3)', () => {
    expect(run(['EASY']).intervals[0]).toBeGreaterThan(run(['GOOD']).intervals[0]);
  });

  it('stays at about the 180-day cap (EASY may exceed it by up to 2 days: ts-fsrs keeps HARD < GOOD < EASY by at least a day each)', () => {
    const { intervals } = run(Array<SrsRating>(10).fill('EASY'));
    expect(Math.max(...intervals)).toBeLessThanOrEqual(182);
    expect(run(Array<SrsRating>(10).fill('GOOD')).intervals.every((d) => d <= 181)).toBe(true);
  });
});

describe('fsrs-scheduler — review behavior', () => {
  it('AGAIN on a Review card: 10-minute relearning step, lapse counted, stability reduced but kept', () => {
    const { card } = run(['GOOD', 'GOOD', 'GOOD']);
    const now = card.dueAt;
    const out = schedule(card, 'AGAIN', now, scheduler);

    expect(out.card.state).toBe('Relearning');
    expect(out.card.lapses).toBe(1);
    expect(out.card.dueAt.getTime() - now.getTime()).toBe(10 * 60_000);
    expect(out.card.stability!).toBeLessThan(card.stability!);
    expect(out.card.stability!).toBeGreaterThan(0);
    expect(out.wasCorrect).toBe(false);
  });

  it('a correct answer given late earns a longer next interval than on time (old SM-2 bug #5)', () => {
    const { card } = run(['GOOD']);
    const onTime = schedule(card, 'GOOD', card.dueAt, scheduler);
    const lateAt = new Date(card.dueAt.getTime() + 20 * DAY);
    const late = schedule(card, 'GOOD', lateAt, scheduler);

    const onTimeDays = (onTime.card.dueAt.getTime() - card.dueAt.getTime()) / DAY;
    const lateDays = (late.card.dueAt.getTime() - lateAt.getTime()) / DAY;
    expect(lateDays).toBeGreaterThan(onTimeDays);
  });

  it('reports elapsed days and pre-review recall probability for a reviewed card', () => {
    const { card } = run(['GOOD', 'GOOD']);
    const out = schedule(card, 'GOOD', card.dueAt, scheduler);

    expect(out.stateBefore).toBe('Review');
    expect(out.elapsedDays).toBeCloseTo(3, 5);
    // Due exactly at the target retention, so recall probability is ~0.95.
    expect(out.retrievabilityBefore!).toBeGreaterThan(0.9);
    expect(out.retrievabilityBefore!).toBeLessThanOrEqual(1);
  });

  it('a new card has no elapsed days and no recall probability', () => {
    const out = schedule(newCard(START), 'GOOD', START, scheduler);
    expect(out.stateBefore).toBe('New');
    expect(out.elapsedDays).toBeNull();
    expect(out.retrievabilityBefore).toBeNull();
    expect(retrievability(newCard(START), START, scheduler)).toBeNull();
  });

  it('treats a converted row with no recorded last review as reviewed one planned interval ago', () => {
    const converted: FsrsCardState = {
      state: 'Review',
      stability: 7,
      difficulty: 5,
      reps: 3,
      lapses: 0,
      learningSteps: 0,
      scheduledDays: 7,
      lastReviewAt: null,
      dueAt: START,
    };
    const out = schedule(converted, 'GOOD', START, scheduler);
    expect(out.card.state).toBe('Review');
    expect(out.card.stability!).toBeGreaterThan(7);
  });
});

describe('fsrs-scheduler — mastery', () => {
  const reviewsToMastery = (ratings: SrsRating[]) => {
    let card = newCard(START);
    let now = START;
    for (let i = 0; i < ratings.length; i++) {
      card = schedule(card, ratings[i], now, scheduler).card;
      if ((card.stability ?? 0) >= MASTERY_STABILITY_DAYS) return i + 1;
      now = card.dueAt;
    }
    return null;
  };

  it('GOOD every time reaches mastery on the 4th review (same pace as the old repetitions >= 4)', () => {
    expect(reviewsToMastery(Array<SrsRating>(8).fill('GOOD'))).toBe(4);
  });

  it('alternating HARD/GOOD reaches mastery on the 6th review', () => {
    expect(reviewsToMastery(['HARD', 'GOOD', 'HARD', 'GOOD', 'HARD', 'GOOD', 'HARD'])).toBe(6);
  });

  it('HARD-only is not mastered after 8 reviews (old SM-2 bug #2: four HARDs = mastered)', () => {
    expect(reviewsToMastery(Array<SrsRating>(8).fill('HARD'))).toBeNull();
  });

  it('nextMasteredAt: set on first crossing, sticky afterwards, cleared by AGAIN', () => {
    const t0 = new Date('2026-09-01T00:00:00.000Z');
    const now = new Date('2026-10-01T00:00:00.000Z');
    expect(nextMasteredAt(null, { stability: 25 }, 'GOOD', now)).toEqual(now);
    expect(nextMasteredAt(null, { stability: 10 }, 'GOOD', now)).toBeNull();
    expect(nextMasteredAt(t0, { stability: 10 }, 'HARD', now)).toEqual(t0);
    expect(nextMasteredAt(t0, { stability: 40 }, 'AGAIN', now)).toBeNull();
  });
});

describe('fsrs-scheduler — interval previews match rate() (U4-1)', () => {
  const RATINGS: SrsRating[] = ['AGAIN', 'HARD', 'GOOD', 'EASY'];
  // Production config has no learning steps (fsrs-config.ts), so a Learning
  // row only exists from older data; build one from a relearning card.
  const review = run(['GOOD', 'GOOD', 'GOOD']).card;
  const relearning = schedule(review, 'AGAIN', review.dueAt, scheduler).card;
  const learning: FsrsCardState = { ...relearning, state: 'Learning' };
  const cases: [string, FsrsCardState, Date, boolean][] = [
    ['New', newCard(START), START, true],
    ['Learning', learning, learning.dueAt, false],
    ['Review', review, review.dueAt, false],
    ['Relearning', relearning, relearning.dueAt, false],
  ];

  it.each(cases)(
    '%s card: every rating previews the interval rate() schedules',
    (_name, card, now, isNew) => {
      expect(card.state).toBe(_name);
      const previews = computeRatingIntervals(card, now, isNew, scheduler);
      for (const r of RATINGS) {
        const expected = formatInterval(
          schedule(card, gradeFlashcard(r, isNew), now, scheduler).card.dueAt,
          now,
        );
        expect(previews[r]).toEqual(expected);
      }
    },
  );

  it('EASY on a new card previews the GOOD interval', () => {
    const previews = computeRatingIntervals(newCard(START), START, true, scheduler);
    expect(previews.EASY).toEqual(previews.GOOD);
  });

  it("uses the card's real learning step", () => {
    const atZero = computeRatingIntervals(relearning, relearning.dueAt, false, scheduler).AGAIN;
    const pastStep = computeRatingIntervals(
      { ...relearning, learningSteps: 1 },
      relearning.dueAt,
      false,
      scheduler,
    ).AGAIN;
    expect(atZero).toEqual({ unit: 'minutes', count: 10 });
    expect(pastStep).not.toEqual(atZero);
  });
});
