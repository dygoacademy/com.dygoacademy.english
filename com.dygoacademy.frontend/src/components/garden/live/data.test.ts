import { describe, expect, it } from 'vitest';

import { GARDEN_ROUTES } from '@/constants/garden';
import type { TodayMissions } from '@/hooks/useMissions';
import { toLocalDateString } from '@/lib/timezone';
import type { SrsStats, StudySchedule, UpcomingActivity } from '@/types';

import {
  COMEBACK_BATCH,
  comebackStart,
  displayName,
  doneReminder,
  extraPlantBed,
  earliestSchedule,
  freezeStreak,
  gardenHours,
  gardenPlants,
  greetingFor,
  BEE_LIMIT,
  beesCard,
  findWordInBeds,
  searchBedWords,
  searchTopics,
  toSearchTopics,
  liveMissions,
  liveMissionsSummary,
  meCalendar,
  meKeepsakes,
  minutesFor,
  missedDays,
  missionQuizHref,
  missionsSummary,
  nextRipening,
  ripensTomorrow,
  sampleGarden,
  showAllWatered,
  showWelcomeBack,
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
    expect(displayName({ user_metadata: {} }, 'Sarah')).toBe('Sarah');
    expect(displayName({ user_metadata: { full_name: 'Minh Tran' } }, 'Sarah Lee')).toBe('Sarah');
    expect(displayName({ user_metadata: { name: 'Minh' } }, '  ')).toBe('Minh');
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
  const href = '/quiz?topic=t2';

  it('maps the 3 missions to A1 rows linking to their activity, capping progress at the target', () => {
    expect(liveMissions(today, href, 0)).toEqual([
      { kind: 'water', done: 8, total: 8, href: '/review' },
      { kind: 'plant', done: 2, total: 5, href: '/review?new=3' },
      { kind: 'challenge', minutes: null, done: false, href },
    ]);
  });

  it('counts the water row down from the live due count, not the morning target', () => {
    const open = {
      ...today,
      missions: [{ type: 'REVIEW_DUE' as const, target: 25, progress: 4, done: false }],
    };
    // 4 watered, 22 still thirsty: the row shows 22 left, like the hero card.
    expect(liveMissions(open, href, 22)[0]).toEqual({
      kind: 'water',
      done: 4,
      total: 26,
      href: '/review',
    });
    // Nothing left to water reads as done even before the mission row closes.
    expect(liveMissions(open, href, 0)[0]).toMatchObject({ done: 4, total: 4 });
    // A done mission stays done when new words turn thirsty later in the day.
    expect(liveMissions(today, href, 5)[0]).toMatchObject({ done: 8, total: 8 });
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

  it('SE1: a SPEAK mission is a speak row to The Pond, and the next mission on A3', () => {
    const speakDay = {
      ...today,
      missions: [today.missions[0], today.missions[1], { type: 'SPEAK' as const, target: 3, progress: 1, done: false }],
    };
    expect(liveMissions(speakDay, href, 0)[2]).toEqual({
      kind: 'speak',
      done: 1,
      total: 3,
      minutes: null,
      href: '/sounds',
    });
    expect(liveMissionsSummary(speakDay, href).next).toEqual({
      mission: 'speak',
      minutes: null,
      href: '/sounds',
      count: 3,
    });
  });

  it('links the quiz to the most-due bed, or all beds when nothing is due', () => {
    const topics = [
      { id: 't1', due_count: '3' },
      { id: 't2', due_count: '7' },
      { id: 't3', due_count: '7' },
    ];
    expect(missionQuizHref(topics)).toBe('/quiz?topic=t2');
    expect(missionQuizHref([{ id: 't1', due_count: '0' }, { id: 't2' }])).toBe('/quiz');
    expect(missionQuizHref(undefined)).toBe('/quiz');
  });
});

describe('A1b All watered', () => {
  const stats = (due_now: number) =>
    ({ total_words: 40, mastered_words: 10, due_now, leech_count: 0, current_streak_days: 4 }) as SrsStats;
  const mission = (type: 'REVIEW_DUE' | 'NEW_WORDS' | 'QUIZ', done: boolean) =>
    ({ type, target: 5, progress: done ? 5 : 1, done }) as TodayMissions['missions'][number];
  const today = (done: boolean[]): TodayMissions => ({
    date: '2026-09-25',
    missions: [mission('REVIEW_DUE', done[0]!), mission('NEW_WORDS', done[1]!), mission('QUIZ', done[2]!)],
    goldenBloom: done.every(Boolean),
  });

  it('shows when nothing is due and every mission is done', () => {
    expect(showAllWatered(stats(0), today([true, true, true]))).toBe(true);
    expect(showAllWatered(stats(0), today([true, false, true]))).toBe(false);
    expect(showAllWatered(stats(3), today([true, true, true]))).toBe(false);
    expect(showAllWatered(stats(0), undefined)).toBe(true);
    expect(showAllWatered(stats(2), undefined)).toBe(false);
  });

  it('plants from the bed with the most seeds, the first on a tie', () => {
    expect(
      extraPlantBed([
        { id: 't1', title: 'Education', seed_count: '4' },
        { id: 't2', title: 'Environment', seed_count: '9' },
        { id: 't3', title: 'Work', seed_count: '9' },
      ]),
    ).toEqual({ id: 't2', title: 'Environment' });
    expect(extraPlantBed([{ id: 't1', title: 'Education', seed_count: '0' }, { id: 't2', title: 'Work' }])).toBeNull();
    expect(extraPlantBed(undefined)).toBeNull();
  });

  it('plant route takes the bed', () => {
    expect(GARDEN_ROUTES.plant(5, 't 2')).toBe('/review?new=5&topic=t%202');
    expect(GARDEN_ROUTES.plant(5)).toBe('/review?new=5');
  });

  it('next ripening keeps the count without a reminder', () => {
    const upcoming = [{ due_date: '2026-09-26', due_count: 14 }] as UpcomingActivity[];
    const reminder = [{ is_enabled: true, reminder_time: '07:30:00' }] as StudySchedule[];
    expect(nextRipening(upcoming, '2026-09-26', reminder)).toEqual({
      time: { hour: 7, minute: 30 },
      count: 14,
    });
    expect(nextRipening(upcoming, '2026-09-26', [])).toEqual({ time: null, count: 14 });
    expect(nextRipening(upcoming, '2026-09-27', reminder)).toBeNull();
    expect(ripensTomorrow(upcoming, '2026-09-26', [])).toBeNull();
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

describe('doneReminder (U6-7b)', () => {
  const upcoming = [
    { due_date: '2026-10-02', due_count: 4 },
    { due_date: '2026-10-03T00:00:00.000Z', due_count: 9 },
  ];
  const schedule = (reminder_time: string, is_enabled = true) => ({
    id: reminder_time,
    reminder_time,
    timezone: 'UTC',
    is_enabled,
  });

  it('picks the earliest schedule, enabled or not', () => {
    expect(earliestSchedule([schedule('19:00:00'), schedule('07:30:00', false)])?.id).toBe('07:30:00');
    expect(earliestSchedule(undefined)).toBeUndefined();
  });

  it("shows tomorrow's count with the earliest schedule's time and state", () => {
    expect(doneReminder(upcoming, '2026-10-03', [schedule('19:00:00'), schedule('07:30:00', false)])).toEqual({
      ripening: 9,
      time: { hour: 7, minute: 30 },
      on: false,
    });
    expect(doneReminder(upcoming, '2026-10-03', [schedule('06:15:00')])).toEqual({
      ripening: 9,
      time: { hour: 6, minute: 15 },
      on: true,
    });
  });

  it('is off at the default time with no schedule, and hidden while loading', () => {
    expect(doneReminder(undefined, '2026-10-03', [])).toEqual({
      ripening: 0,
      time: { hour: 20, minute: 0 },
      on: false,
    });
    expect(doneReminder(upcoming, '2026-10-03', undefined)).toBeNull();
  });
});

describe('beesCard (A7 Bees are waiting)', () => {
  const word = (id: string, stage: 'flower' | 'sprout', wilting = false) => ({
    id,
    word: id,
    meaning: '',
    stage,
    wilting,
    due: { tone: 'new' as const },
  });
  const now = new Date();
  const today = toLocalDateString(now);
  const waiting = (id: string) => ({
    topic_word_id: id,
    item_id: `i-${id}`,
    harvested_score: null,
    harvested_at: null,
    ipa_uk: `/${id}/`,
  });
  const href = (id: string) => `/sounds?word=${id}`;
  const sayAll = (ids: string[]) => `/sounds?words=${ids.join(',')}`;

  it("keeps the API's order: today's pollinated in place, ripe waiting words, skips the rest", () => {
    const words = ['a', 'b', 'e', 'f'].map((id) => word(id, 'flower'));
    words.push(word('c', 'sprout'), word('d', 'flower', true));
    const card = beesCard(
      words,
      [
        waiting('a'),
        { ...waiting('b'), harvested_score: 95, harvested_at: now.toISOString() },
        waiting('c'),
        waiting('d'),
        { ...waiting('e'), harvested_score: 91, harvested_at: '2020-01-01T00:00:00Z' },
        waiting('f'),
      ],
      today,
      href,
      sayAll,
    )!;
    expect(card.words.map((w) => [w.id, w.pollinated])).toEqual([
      ['a', false],
      ['b', true],
      ['f', false],
    ]);
    expect(card.waiting).toBe(2);
    expect(card.words[0]).toMatchObject({ sound: '/a/', href: '/sounds?word=a' });
    expect(card.sayAllHref).toBe('/sounds?words=a,f');
  });

  it('shows at most 3 waiting words, oldest first', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const card = beesCard(
      ids.map((id) => word(id, 'flower')),
      ids.map(waiting),
      today,
      href,
      sayAll,
    )!;
    expect(card.words.map((w) => w.id)).toEqual(['a', 'b', 'c']);
    expect(card.waiting).toBe(BEE_LIMIT);
  });

  it('has no Say all when everything is pollinated today', () => {
    const card = beesCard(
      [word('a', 'flower')],
      [{ ...waiting('a'), harvested_score: 92, harvested_at: now.toISOString() }],
      today,
      href,
      sayAll,
    )!;
    expect(card).toMatchObject({ waiting: 0, sayAllHref: null });
  });

  it('shows the syllables with the stressed one in capitals, else the IPA (Stepping stones Part 3)', () => {
    const card = beesCard(
      [word('mitigate', 'flower'), word('b', 'flower')],
      [
        {
          ...waiting('mitigate'),
          syllables: [
            { text: 'mi', stressed: true },
            { text: 'ti', stressed: false },
            { text: 'gate', stressed: false },
          ],
        },
        { ...waiting('b'), syllables: [] },
      ],
      today,
      (id) => GARDEN_ROUTES.pronounce({ words: [id], topic: 't1', back: '/topics/t1' }),
      (ids) => GARDEN_ROUTES.pronounce({ words: ids, topic: 't1', back: '/topics/t1' }),
    )!;
    expect(card.words.map((w) => w.sound)).toEqual(['MI · ti · gate', '/b/']);
    expect(card.words[0].href).toBe('/sounds/word?words=mitigate&topic=t1&back=%2Ftopics%2Ft1');
    expect(card.sayAllHref).toBe('/sounds/word?words=mitigate%2Cb&topic=t1&back=%2Ftopics%2Ft1');
  });

  it('is null with no data or nothing to show', () => {
    expect(beesCard([word('a', 'flower')], undefined, today, href, sayAll)).toBeNull();
    expect(beesCard([word('c', 'sprout')], [waiting('c')], today, href, sayAll)).toBeNull();
  });
});

describe('gardenHours', () => {
  it('shows one decimal under 10 hours and whole hours after', () => {
    expect(gardenHours(0)).toBe(0);
    expect(gardenHours(26)).toBe(0.4);
    expect(gardenHours(150)).toBe(2.5);
    expect(gardenHours(754)).toBe(13);
  });

  it('is null when the backend sends nothing', () => {
    expect(gardenHours(undefined)).toBeNull();
    expect(gardenHours(null)).toBeNull();
  });
});

describe('welcome back (A5 / A5b)', () => {
  const stats = (over: Partial<SrsStats>): SrsStats => ({
    total_words: 120,
    mastered_words: 31,
    due_now: 45,
    leech_count: 0,
    current_streak_days: 23,
    display_name: null,
    ...over,
  });

  it('estimates about 25 s a word, at least a minute', () => {
    expect(minutesFor(1)).toBe(1);
    expect(minutesFor(6)).toBe(3);
    expect(minutesFor(10)).toBe(4);
    expect(minutesFor(12)).toBe(5);
    expect(minutesFor(0)).toBe(1);
  });

  it('shows only after 2+ missed days with something due or wilting', () => {
    expect(showWelcomeBack(3, stats({}))).toBe(true);
    expect(showWelcomeBack(3, stats({ due_now: 0, leech_count: 2 }))).toBe(true);
    expect(showWelcomeBack(3, stats({ due_now: 0, leech_count: 0 }))).toBe(false);
    expect(showWelcomeBack(1, stats({}))).toBe(false);
    expect(showWelcomeBack(null, stats({}))).toBe(false);
  });

  it('A5: wilting words → Quick revive, water all when something is due', () => {
    expect(comebackStart(stats({ leech_count: 12, due_now: 42 }))).toEqual({
      kind: 'revive',
      count: 12,
      minutes: 5,
      href: '/quiz?mode=leech',
      waterAll: { count: 42, href: '/review' },
    });
    expect(comebackStart(stats({ leech_count: 3, due_now: 0 }))?.waterAll).toBeNull();
  });

  it('A5b: nothing wilting, more than the batch due → Quick start with the first 10', () => {
    expect(comebackStart(stats({ due_now: 45 }))).toEqual({
      kind: 'batch',
      count: COMEBACK_BATCH,
      minutes: 4,
      href: '/review?limit=10',
      waterAll: { count: 45, href: '/review' },
    });
    expect(comebackStart(stats({ due_now: 11 }))?.kind).toBe('batch');
  });

  it('A5b short: 1–10 due → water them all, no second link', () => {
    expect(comebackStart(stats({ due_now: 10 }))).toEqual({
      kind: 'all',
      count: 10,
      minutes: 4,
      href: '/review',
      waterAll: null,
    });
    expect(comebackStart(stats({ due_now: 6 }))).toMatchObject({ kind: 'all', count: 6, minutes: 3 });
    expect(comebackStart(stats({ due_now: 1 }))).toMatchObject({ kind: 'all', count: 1, minutes: 1 });
  });

  it('nothing due or wilting → no card', () => {
    expect(comebackStart(stats({ due_now: 0 }))).toBeNull();
  });
});

describe('searchBedWords (A7c)', () => {
  const w = (word: string, meaning: string) => ({
    id: word,
    word,
    meaning,
    stage: 'sprout' as const,
    due: { tone: 'new' as const },
  });
  const words = [w('deteriorate', 'xấu đi, suy giảm'), w('mitigate', 'giảm nhẹ'), w('reduce', 'làm giảm')];

  it('matches word or meaning, words first, earlier matches first', () => {
    expect(searchBedWords(words, 'giam').map((x) => x.id)).toEqual(['mitigate', 'reduce', 'deteriorate']);
    expect(searchBedWords(words, 'RED').map((x) => x.id)).toEqual(['reduce']);
    expect(searchBedWords(words, '  ')).toEqual([]);
  });
});

describe('A6b topic search', () => {
  const row = (id: string, title: string, extra: Record<string, unknown> = {}) =>
    ({
      id,
      group_id: 'g',
      title,
      description: null,
      is_public: false,
      word_count: '40',
      mastered_count: '0',
      focus_word_count: '0',
      created_at: '2026-01-01',
      sprout_count: '0',
      flower_count: '0',
      seed_count: '40',
      due_count: '0',
      min_level: 'B2',
      max_level: 'B2',
      ...extra,
    }) as never;
  const all = toSearchTopics(
    [
      row('mine', 'Work & careers', { kind: 'mine' }),
      row('env', 'Environment', { kind: 'library', collection_title: 'IELTS Academic', sprout_count: '4' }),
      row('energy', 'Energy & resources', { kind: 'library', collection_title: 'IELTS Academic' }),
      row('daily', 'Entertainment & media', { kind: 'library', collection_title: null, min_level: 'B1' }),
    ],
    'Library',
    'Shared',
  );

  it('counts a library topic as planted once something has grown', () => {
    expect(all.map((t) => [t.id, t.planted, t.collection])).toEqual([
      ['mine', true, null],
      ['env', true, 'IELTS Academic'],
      ['energy', false, 'IELTS Academic'],
      ['daily', false, 'Library'],
    ]);
  });

  it('matches title, collection or level, title matches first, split into yours and more', () => {
    const en = searchTopics(all, 'EN');
    expect(en.yours.map((t) => t.id)).toEqual(['env']);
    expect(en.more.map((t) => t.id)).toEqual(['energy', 'daily']);
    const ielts = searchTopics(all, 'ielts');
    expect([...ielts.yours, ...ielts.more].map((t) => t.id)).toEqual(['env', 'energy']);
    expect(searchTopics(all, 'b1').more.map((t) => t.id)).toEqual(['daily']);
    expect(searchTopics(all, ' ')).toEqual({ yours: [], more: [] });
  });

  it('finds a word in the loaded beds, earliest match first', () => {
    const beds = [
      { id: 't1', title: 'Work', words: [{ source_word: 'agenda' }] },
      { id: 't2', title: 'Environment', words: [{ source_word: 'environmental' }] },
    ];
    expect(findWordInBeds(beds, 'en')).toEqual({ word: 'environmental', topicId: 't2', topic: 'Environment' });
    expect(findWordInBeds(beds, 'e')).toBeNull();
    expect(findWordInBeds(beds, 'zz')).toBeNull();
  });
});
