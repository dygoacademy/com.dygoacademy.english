import { describe, expect, it } from 'vitest';

import type { SrsStats } from '@/types';

import {
  displayName,
  freezeStreak,
  gardenPlants,
  greetingFor,
  liveMissions,
  liveMissionsSummary,
  meCalendar,
  meKeepsakes,
  missedDays,
  missionQuizHref,
  missionsSummary,
  ripensTomorrow,
  sampleGarden,
  stageGarden,
  thirstyMission,
  weekHarvest,
  weekOf,
} from './data';

const stagesOf = (plants: ReturnType<typeof stageGarden>) =>
  plants.map((p) => (typeof p === 'string' ? p : p.stage));
const count = (xs: string[], x: string) => xs.filter((y) => y === x).length;

describe('live garden helpers', () => {
  it('greets by time of day', () => {
    expect(greetingFor(8)).toBe('morning');
    expect(greetingFor(13)).toBe('afternoon');
    expect(greetingFor(21)).toBe('evening');
  });

  it('counts missed days from real activity', () => {
    const rows = (dates: string[]) =>
      dates.map((review_date) => ({ review_date, review_count: 3 }));
    expect(missedDays([], '2026-09-28')).toBeNull();
    expect(missedDays([{ review_date: '2026-09-20', review_count: 0 }], '2026-09-28')).toBeNull();
    expect(missedDays(rows(['2026-09-28']), '2026-09-28')).toBe(0);
    expect(missedDays(rows(['2026-09-27']), '2026-09-28')).toBe(0);
    expect(missedDays(rows(['2026-09-26']), '2026-09-28')).toBe(1);
    expect(missedDays(rows(['2026-09-20', '2026-09-25']), '2026-09-28')).toBe(2);
  });

  it('draws a garden that follows the counts', () => {
    const plants = sampleGarden({ total: 100, mastered: 50, leeches: 10, due: 20 }, 9);
    expect(plants).toHaveLength(9);
    const stages = plants.map((p) => (typeof p === 'string' ? p : p.stage));
    expect(stages.filter((s) => s === 'tree')).toHaveLength(5);
    expect(stages.filter((s) => s === 'wilting')).toHaveLength(1);
    expect(sampleGarden({ total: 0, mastered: 0, leeches: 0, due: 0 }, 3)).toEqual([
      'seed',
      'seed',
      'seed',
    ]);
  });

  it('builds a Monday-first week', () => {
    const days = weekOf(new Date(2026, 8, 25)); // Friday 25 Sep 2026
    expect(days).toHaveLength(7);
    expect(days[0].getDay()).toBe(1);
    expect(days[0].getDate()).toBe(21);
    expect(days[6].getDate()).toBe(27);
  });

  it('finds a first name to greet with', () => {
    expect(displayName({ user_metadata: { full_name: 'Minh Tran' } })).toBe('Minh');
    expect(displayName({ user_metadata: {} })).toBeNull();
    expect(displayName(null)).toBeNull();
  });
});

describe('topics helpers', () => {
  it('formats the CEFR range', async () => {
    const { formatLevel } = await import('./data');
    expect(formatLevel('B2', 'C1')).toBe('B2–C1');
    expect(formatLevel('B2', 'B2')).toBe('B2');
    expect(formatLevel(null, null)).toBeNull();
  });

  it('builds chips from the kinds present, collections first, no Group chip', async () => {
    const { topicFilters } = await import('./data');
    const labels = { mine: 'Mine' };
    expect(
      topicFilters(
        [{ group: 'group' }, { group: 'library:IELTS Academic' }, { group: 'mine' }],
        labels,
      ),
    ).toEqual([
      { id: 'library:IELTS Academic', label: 'IELTS Academic' },
      { id: 'mine', label: 'Mine' },
    ]);
    expect(topicFilters([{ group: 'mine' }], labels)).toEqual([{ id: 'mine', label: 'Mine' }]);
  });

  it('builds the garden from stage_counts (U4-3)', () => {
    const stages = { new: 10, learning: 20, review: 30, mastered: 40 };
    const plain = stagesOf(stageGarden(stages, { leeches: 0, due: 0 }, 10));
    expect(plain).toHaveLength(10);
    expect(count(plain, 'tree')).toBe(4);
    expect(count(plain, 'flower')).toBe(3);
    expect(count(plain, 'sprout')).toBe(2);
    expect(count(plain, 'seed')).toBe(1);

    // Every non-empty stage shows up, even when small.
    const small = stagesOf(
      stageGarden({ new: 1, learning: 1, review: 0, mastered: 98 }, { leeches: 0, due: 0 }, 9),
    );
    expect(count(small, 'seed')).toBe(1);
    expect(count(small, 'sprout')).toBe(1);
    expect(count(small, 'tree')).toBe(7);

    const withExtras = stageGarden(stages, { leeches: 10, due: 30 }, 10);
    expect(count(stagesOf(withExtras), 'wilting')).toBe(1);
    expect(count(stagesOf(withExtras), 'tree')).toBe(4);
    expect(withExtras.filter((p) => typeof p !== 'string' && p.thirsty)).toHaveLength(3);

    expect(
      stageGarden({ new: 0, learning: 0, review: 0, mastered: 0 }, { leeches: 0, due: 0 }, 3),
    ).toEqual(['seed', 'seed', 'seed']);
  });

  it('falls back to sampleGarden without stage_counts', () => {
    const stats = {
      total_words: 100,
      mastered_words: 50,
      leech_count: 10,
      due_now: 20,
      current_streak_days: 3,
    } as SrsStats;
    expect(gardenPlants(stats, 9)).toEqual(
      sampleGarden({ total: 100, mastered: 50, leeches: 10, due: 20 }, 9),
    );
    const live = gardenPlants(
      {
        ...stats,
        stage_counts: { new: 0, learning: 0, review: 50, mastered: 50 },
      },
      4,
    );
    expect(count(stagesOf(live), 'seed')).toBe(0);
    expect(count(stagesOf(live), 'tree')).toBe(2);
  });

  it('shows what ripens tomorrow at the reminder time', () => {
    const upcoming = [
      { due_date: '2026-09-30', due_count: 4 },
      { due_date: '2026-10-01', due_count: 7 },
    ];
    const schedule = (reminder_time: string, is_enabled = true) => ({
      id: reminder_time,
      reminder_time,
      timezone: 'UTC',
      is_enabled,
    });
    expect(
      ripensTomorrow(upcoming, '2026-10-01', [schedule('19:00:00'), schedule('07:30:00')]),
    ).toEqual({ time: { hour: 7, minute: 30 }, count: 7 });
    expect(ripensTomorrow(upcoming, '2026-10-01', [schedule('07:30:00', false)])).toBeNull();
    expect(ripensTomorrow(upcoming, '2026-10-01', undefined)).toBeNull();
    expect(ripensTomorrow(upcoming, '2026-10-02', [schedule('07:30:00')])).toBeNull();
    expect(ripensTomorrow(undefined, '2026-10-01', [schedule('07:30:00')])).toBeNull();
  });
});

describe('thirstyMission (U4-4)', () => {
  const activity = [
    { review_date: '2026-09-29', review_count: 9 },
    { review_date: '2026-09-30T00:00:00.000Z', review_count: 6 },
  ];

  it('progress = reviewed today, target = reviewed today + still due', () => {
    expect(thirstyMission(activity, '2026-09-30', 4)).toEqual({ kind: 'thirsty', done: 6, total: 10 });
  });

  it('is done when nothing is due, even with no reviews today', () => {
    expect(thirstyMission(activity, '2026-10-01', 0)).toEqual({ kind: 'thirsty', done: 0, total: 0 });
    expect(thirstyMission([], '2026-09-30', 3)).toEqual({ kind: 'thirsty', done: 0, total: 3 });
  });

  it('uses the session just finished when activity is behind', () => {
    expect(thirstyMission(activity, '2026-09-30', 0, 12)).toEqual({ kind: 'thirsty', done: 12, total: 12 });
  });
});

describe('missionsSummary (U4-4)', () => {
  it('counts the one mission as done only when nothing is due', () => {
    expect(missionsSummary({ done: 5, total: 5 })).toEqual({ done: 1, total: 1, next: null });
    expect(missionsSummary({ done: 0, total: 0 })).toEqual({ done: 1, total: 1, next: null });
    expect(missionsSummary({ done: 5, total: 8 })).toEqual({ done: 0, total: 1, next: null });
  });
});

describe('live missions (U6-5)', () => {
  const today = {
    date: '2026-10-01',
    goldenBloom: false,
    missions: [
      { type: 'REVIEW_DUE' as const, target: 8, progress: 11, done: true },
      { type: 'LEARN_NEW' as const, target: 5, progress: 2, done: false },
      { type: 'QUIZ' as const, target: 1, progress: 0, done: false },
    ],
  };
  const href = '/garden/quiz?topic=t2';

  it('maps the 3 missions to A1 rows, capping progress at the target', () => {
    expect(liveMissions(today, href)).toEqual([
      { kind: 'water', done: 8, total: 8 },
      { kind: 'plant', done: 2, total: 5 },
      { kind: 'challenge', minutes: null, done: false, href },
    ]);
  });

  it('summarises A3: done count, and the quiz as next while it is open', () => {
    expect(liveMissionsSummary(today, href)).toEqual({
      done: 1,
      total: 3,
      next: { mission: 'challenge', minutes: null, href },
    });
    const all = { ...today, goldenBloom: true, missions: today.missions.map((m) => ({ ...m, done: true })) };
    expect(liveMissionsSummary(all, href)).toEqual({ done: 3, total: 3, next: null });
  });

  it('links the quiz to the most-due bed, or all beds when nothing is due', () => {
    const topics = [
      { id: 't1', due_count: '3' },
      { id: 't2', due_count: '7' },
      { id: 't3', due_count: '7' },
    ];
    expect(missionQuizHref(topics)).toBe('/garden/quiz?topic=t2');
    expect(missionQuizHref([{ id: 't1', due_count: '0' }, { id: 't2' }])).toBe('/garden/quiz');
    expect(missionQuizHref(undefined)).toBe('/garden/quiz');
  });
});

describe('weekly harvest and freezes (U6-6)', () => {
  const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

  it('maps /missions/week onto the calendar week, future days empty', () => {
    const days = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'].map(day);
    const week = [
      { date: '2026-09-25', done: 3, goldenBloom: true },
      { date: '2026-09-28', done: 3, goldenBloom: true },
      { date: '2026-09-29', done: 1, goldenBloom: false },
      { date: '2026-09-30', done: 0, goldenBloom: false },
      { date: '2026-10-01', done: 2, goldenBloom: false },
    ];
    const h = weekHarvest(week, days, day('2026-10-01'));
    expect(h.done).toBe(6);
    expect(h.total).toBe(21);
    expect(h.seedPack).toBeNull();
    expect(h.days.map((d) => d.missions)).toEqual([3, 1, 0, 2, 0, 0, 0]);
    expect(h.days.filter((d) => 'today' in d && d.today).map((d) => d.day)).toEqual([day('2026-10-01')]);
  });

  const stats = (over: Partial<SrsStats>): SrsStats => ({
    total_words: 10,
    mastered_words: 1,
    due_now: 2,
    leech_count: 0,
    current_streak_days: 5,
    display_name: null,
    ...over,
  });

  it('shows the freeze card only when freezes covered days and the streak lives', () => {
    const freezes = { available: 0, used_this_week: 2, refills_on: '2026-10-05' };
    expect(freezeStreak(stats({ freezes }))).toEqual({
      days: 5,
      covered: 2,
      left: 0,
      refills: day('2026-10-05'),
    });
    expect(freezeStreak(stats({}))).toBeNull();
    expect(freezeStreak(stats({ freezes: { ...freezes, used_this_week: 0 } }))).toBeNull();
    expect(freezeStreak(stats({ freezes, current_streak_days: 0 }))).toBeNull();
  });
});

describe('A8 Me (U6-7)', () => {
  it('builds 16 Monday-first weeks ending this week, missions per day, future days null', () => {
    const today = new Date(2026, 9, 1, 15); // Thursday 2026-10-01, local
    const cal = meCalendar(
      [
        { date: '2026-09-25', done: 3, goldenBloom: true },
        { date: '2026-09-29', done: 1, goldenBloom: false },
        { date: '2026-10-01', done: 5, goldenBloom: false },
      ],
      today,
    );
    expect(cal).toHaveLength(16);
    expect(cal.every((w) => w.length === 7)).toBe(true);
    expect(cal[15]).toEqual([0, 1, 0, 3, null, null, null]);
    expect(cal[14]).toEqual([0, 0, 0, 0, 3, 0, 0]);
    expect(cal[0].every((d) => d === 0)).toBe(true);
  });

  it('shows earned keepsakes then the closest next streak / Golden Bloom one, 4 at most', () => {
    const at = '2026-10-01T00:00:00Z';
    expect(
      meKeepsakes({
        earned: [
          { kind: 'FIRST_HARVEST', value: 0, earned_at: at },
          { kind: 'STREAK', value: 7, earned_at: at },
        ],
        next: [
          { kind: 'STREAK', value: 30, progress: 9, target: 30 },
          { kind: 'GOLDEN_BLOOMS', value: 10, progress: 6, target: 10 },
        ],
        golden_blooms: 6,
      }),
    ).toEqual([
      { type: 'firstHarvest' },
      { type: 'streak', days: 7 },
      { type: 'nextBlooms', current: 6, target: 10 },
    ]);
    const many = meKeepsakes({
      earned: [
        { kind: 'FIRST_HARVEST', value: 0, earned_at: at },
        { kind: 'STREAK', value: 7, earned_at: at },
        { kind: 'STREAK', value: 30, earned_at: at },
        { kind: 'GOLDEN_BLOOMS', value: 10, earned_at: at },
      ],
      next: [{ kind: 'STREAK', value: 100, progress: 31, target: 100 }],
      golden_blooms: 12,
    });
    expect(many).toEqual([
      { type: 'streak', days: 7 },
      { type: 'streak', days: 30 },
      { type: 'blooms', count: 10 },
      { type: 'nextStreak', current: 31, target: 100 },
    ]);
    expect(meKeepsakes({ earned: [], next: [], golden_blooms: 0 })).toEqual([]);
  });
});
