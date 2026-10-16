import { PLANT_FLOOR, planDay, tierFor } from './missions.plan';

const day = (goal: number, due: number, opts: { speakable?: number; speakDay?: boolean } = {}) =>
  planDay({
    goalMinutes: goal,
    dueCount: due,
    speakable: opts.speakable ?? 50,
    speakDay: opts.speakDay ?? false,
  });
const types = (goal: number, due: number, opts?: { speakable?: number; speakDay?: boolean }) =>
  day(goal, due, opts).missions.map((m) => `${m.type}:${m.target}`);

describe('daily goal missions plan', () => {
  it('picks the tier at or below the goal', () => {
    expect(tierFor(1).minutes).toBe(5);
    expect(tierFor(10).minutes).toBe(10);
    expect(tierFor(25).minutes).toBe(20);
    expect(tierFor(120).minutes).toBe(30);
    expect(tierFor(null).minutes).toBe(10);
  });

  it('sizes each goal with nothing due', () => {
    expect(types(5, 0)).toEqual(['REVIEW_DUE:0', 'LEARN_NEW:3', 'QUIZ:1']);
    expect(types(10, 0)).toEqual(['REVIEW_DUE:0', 'LEARN_NEW:5', 'QUIZ:1']);
    expect(types(10, 0, { speakDay: true })).toEqual(['REVIEW_DUE:0', 'LEARN_NEW:5', 'SPEAK:3']);
    expect(types(15, 0, { speakDay: true })).toEqual(['REVIEW_DUE:0', 'LEARN_NEW:8', 'SPEAK:5']);
    expect(types(20, 0)).toEqual(['REVIEW_DUE:0', 'LEARN_NEW:10', 'QUIZ:1', 'SPEAK:5']);
    expect(types(30, 0)).toEqual(['REVIEW_DUE:0', 'LEARN_NEW:15', 'QUIZ:1', 'SPEAK:5']);
    expect(day(5, 0).quizQuestions).toBe(5);
    expect(day(30, 0).quizQuestions).toBe(15);
  });

  it('a 5 min goal never speaks', () => {
    expect(types(5, 0, { speakDay: true })).toEqual(['REVIEW_DUE:0', 'LEARN_NEW:3', 'QUIZ:1']);
  });

  it('watering takes time first: plant shrinks, never below the floor', () => {
    // 10 min, 30 due: 600 − 300 − 120 = 180 s → 4 new words
    expect(day(10, 30).missions[1]).toEqual({ type: 'LEARN_NEW', target: 4 });
    // 10 min, 45 due: 600 − 450 − 120 < 0 → the floor
    expect(day(10, 45).missions[1]).toEqual({ type: 'LEARN_NEW', target: PLANT_FLOOR });
  });

  it('no Plant mission when watering alone fills the goal', () => {
    expect(types(10, 60)).toEqual(['REVIEW_DUE:60', 'QUIZ:1']);
    expect(types(5, 30)).toEqual(['REVIEW_DUE:30', 'QUIZ:1']);
  });

  it('speak takes as many words as can be spoken, and needs at least 3', () => {
    expect(types(20, 0, { speakable: 4 })).toEqual([
      'REVIEW_DUE:0',
      'LEARN_NEW:10',
      'QUIZ:1',
      'SPEAK:4',
    ]);
    expect(types(20, 0, { speakable: 2 })).toEqual(['REVIEW_DUE:0', 'LEARN_NEW:10', 'QUIZ:1']);
  });

  it('estimates the day in minutes', () => {
    // 10 min, 0 due: 5×40 + 10×12 = 320 s → 6 min
    expect(day(10, 0).estimateMinutes).toBe(6);
    // 30 min, 6 due: 60 + 15×40 + 15×12 + 5×30 = 990 s → 17 min
    expect(day(30, 6).estimateMinutes).toBe(17);
  });
});
