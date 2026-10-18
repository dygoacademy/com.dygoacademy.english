/**
 * Canvas sample data for the screen tests, copied from
 * docs/design/garden/source/*.dc.html. Content here is sample data
 * (names, words, meanings, dates), not UI copy: UI copy comes from
 * messages/en-US.json through t().
 */
import { calendarDay } from '../format';
import type { CalendarLevel } from '../GardenCalendar';
import type { HeroPlant } from '../HeroGardenCard';
import type { KeepsakeItem } from './MeScreen';
import type { BedStage, TopicBedWord } from './TopicBedScreen';
import type { TopicsScreenTopic } from './TopicsScreen';
import type { MissionItem } from './TodaysGardenScreen';
import type { WeeklyHarvestScreenProps } from './WeeklyHarvestScreen';

/** AdultHome.dc.html */
export const HOME = {
  date: calendarDay(2026, 9, 25),
  greeting: 'evening' as const,
  name: 'Minh',
  streakDays: 23,
  garden: {
    growing: 412,
    thirsty: 18,
    ripe: 31,
    wilting: 3,
    plants: [
      'tree',
      { stage: 'flower', thirsty: true },
      'sprout',
      'tree',
      'flower',
      { stage: 'sprout', thirsty: true },
      'wilting',
      { stage: 'flower', thirsty: true },
      'seed',
    ] satisfies HeroPlant[],
  },
  missions: [
    { kind: 'water', done: 15, total: 18, href: '/review' },
    { kind: 'plant', done: 5, total: 5, href: '/review?new=1' },
    { kind: 'challenge', minutes: 3, done: false, href: '/quiz' },
  ] satisfies MissionItem[],
  ripens: { time: { hour: 7, minute: 30 }, count: 14 },
};

/** AdultReview.dc.html */
export const REVIEW = {
  total: 18,
  done: 15,
  card: {
    word: 'mitigate',
    ipa: '/ˈmɪt.ɪ.ɡeɪt/',
    // A clip URL so the audio button shows its ready state; never played.
    audioSrc: '/audio/mitigate.mp3',
    level: 'B2',
    topic: 'Environment',
    partOfSpeech: 'verb',
    meaning: 'to make something bad less harmful or serious',
    meaningTranslation: { text: 'giảm nhẹ, làm dịu bớt', lang: 'vi' },
    example: 'Planting more trees can help mitigate the effects of climate change.',
    synonyms: ['reduce', 'lessen', 'ease'],
  },
  intervals: {
    again: { unit: 'lessThanMinute' },
    hard: { unit: 'days', count: 2 },
    good: { unit: 'days', count: 5 },
    easy: { unit: 'days', count: 12 },
  } as const,
};

/** AdultMissions.dc.html */
export const HARVEST = {
  weekStart: calendarDay(2026, 10, 12),
  daysLeft: 2,
  weekly: {
    missions: [
      { key: 'rescue', goal: 3, count: 1, done: false, href: '#' },
      { key: 'sentence', goal: 3, count: 2, done: false, href: '#' },
      { key: 'sound', goal: 5, count: 2, done: false, href: '#' },
    ],
    wilting: 3,
    sound: { label: 'th', examples: ['think', 'three', 'growth'] },
    rewardEarned: false,
  },
  seedPack: { name: 'Academic Word List', need: 3, have: 2 },
  goal: { band: 7, mastered: 412, target: 1200, growing: 104 },
} satisfies WeeklyHarvestScreenProps;

/** AdultMissions.dc.html, all 3 done (`A4-weekly-harvest-done`). */
export const HARVEST_DONE = {
  ...HARVEST,
  weekly: {
    ...HARVEST.weekly,
    missions: HARVEST.weekly.missions.map((m) => ({ ...m, count: m.goal, done: true })),
    rewardEarned: true,
  },
} satisfies WeeklyHarvestScreenProps;

/** AdultComeback.dc.html */
export const COMEBACK = {
  date: calendarDay(2026, 9, 28),
  name: 'Minh',
  garden: {
    thirsty: 42,
    wilting: 12,
    ripe: 31,
    plants: [
      'tree',
      'wilting',
      'wilting',
      'flower',
      'wilting',
      'tree',
      'wilting',
      'sprout',
    ] satisfies HeroPlant[],
  },
  streak: { days: 23, covered: 2, left: 0, refills: calendarDay(2026, 10, 4) },
  start: { kind: 'revive' as const, count: 12, minutes: 5, waterAll: { count: 42 } },
};

/** AdultComebackStart.dc.html (A5b): nothing wilting, 45 thirsty. */
export const COMEBACK_START = {
  ...COMEBACK,
  garden: {
    thirsty: 45,
    wilting: 0,
    ripe: 31,
    plants: [
      'tree',
      { stage: 'flower', thirsty: true },
      { stage: 'sprout', thirsty: true },
      'flower',
      { stage: 'flower', thirsty: true },
      'tree',
      { stage: 'sprout', thirsty: true },
      'sprout',
    ] satisfies HeroPlant[],
  },
  start: { kind: 'batch' as const, count: 10, minutes: 4, waterAll: { count: 45 } },
};

/**
 * AdultAllWatered.dc.html (A1b): nothing due, 3 of 3 missions, trees and
 * swaying flowers.
 */
export const ALL_WATERED = {
  date: calendarDay(2026, 9, 25),
  greeting: 'evening' as const,
  name: 'Minh',
  streakDays: 23,
  plants: [
    'tree',
    'flower',
    'tree',
    'flower',
    'tree',
    'flower',
    'tree',
    'flower',
    'tree',
  ] satisfies HeroPlant[],
  bloom: { done: 3, total: 3 },
  ripens: { time: { hour: 7, minute: 30 }, count: 14 },
};

/**
 * AdultTopics.dc.html (redrawn 2026-10-17: 6 long-named beds, one per
 * filter group).
 */
export const TOPICS: TopicsScreenTopic[] = [
  {
    title: 'Environment & climate change',
    group: 'academic',
    level: 'B2–C1',
    words: 48,
    stages: { tree: 18, flower: 7, sprout: 11 },
    due: 6,
  },
  {
    title: 'Science and technology in everyday life',
    group: 'general',
    level: 'B2',
    words: 40,
    stages: { tree: 8, flower: 6, sprout: 12 },
    due: 8,
  },
  {
    title: 'Work & careers: job interviews and team meetings',
    group: 'work',
    level: 'B1–B2',
    words: 30,
    stages: { tree: 20, flower: 6, sprout: 2 },
    due: 0,
  },
  {
    title: 'Travel',
    group: 'travel',
    level: 'B1',
    words: 36,
    stages: { tree: 22, flower: 9, sprout: 5 },
    due: 4,
  },
  {
    title: 'IELTS Sprint · Week 3 · Speaking Part 2 practice with the group',
    group: 'shared',
    level: 'Shared',
    words: 42,
    stages: { tree: 12, flower: 10, sprout: 12 },
    due: 5,
  },
  {
    title: 'Health',
    group: 'mine',
    level: 'B1–B2',
    words: 42,
    stages: { tree: 10, flower: 8, sprout: 14 },
    due: 3,
  },
].map((topic, index) => ({ ...topic, id: `topic-${index + 1}`, href: '#' }));

export const TOPICS_LOCKED_PACK = {
  name: 'Academic Word List',
  bloomsNeeded: 1,
  groups: ['academic'],
};

/** AdultTopicDetail.dc.html */
export const BED = {
  title: 'Environment',
  meta: { collection: 'IELTS Academic', level: 'B2–C1', words: 48 },
  stageCounts: { seed: 12, sprout: 11, flower: 7, tree: 18 } satisfies Record<BedStage, number>,
  water: { count: 6 },
  words: (
    [
      ['drought', 'hạn hán', 'sprout', 5, 0],
      ['deteriorate', 'xấu đi, suy giảm', 'sprout', 0, 0],
      ['mitigate', 'giảm nhẹ, làm dịu bớt', 'flower', 0, 0],
      ['conservation', 'sự bảo tồn', 'sprout', 0, 0],
      ['biodiversity', 'đa dạng sinh học', 'seed', 0, 'new'],
      ['carbon footprint', 'lượng khí thải carbon', 'seed', 0, 'new'],
      ['deforestation', 'nạn phá rừng', 'flower', 0, 3],
      ['ecosystem', 'hệ sinh thái', 'flower', 0, 5],
      ['renewable', 'có thể tái tạo', 'tree', 0, 9],
      ['sustainable', 'bền vững', 'tree', 0, 12],
      ['emissions', 'khí thải', 'tree', 0, 20],
    ] as const
  ).map(([word, meaning, stage, lapses, due]): TopicBedWord => ({
    id: word,
    word,
    meaning,
    meaningLang: 'vi',
    stage,
    wilting: lapses > 0,
    lapses: lapses || undefined,
    due: due === 'new' ? { tone: 'new' } : due === 0 ? { tone: 'now' } : { tone: 'later', days: due },
  })),
};

/**
 * EntryHome / EntryBed / EntryHarvest / EntryEcho (Phase 13 SE1 / SE2 / SE5
 * / SE6): A1, A7 and GR3 plus the speaking entry point.
 */
export const ENTRY = {
  homeSpeak: { kind: 'speak', done: 0, total: 3, minutes: 2 } satisfies MissionItem,
  bedSpeak: { count: 5 },
  /** "Bees are waiting" (A7, 2026-10-11): [word, pollinated, syllables]. */
  bees: [
    ['mitigate', true, 'MI · ti · gate'],
    ['deforestation', false, 'de · for · e · STA · tion'],
    ['ecosystem', false, 'E · co · sys · tem'],
  ] as const,
  echo: { word: 'deteriorate', ipa: '/dɪˈtɪəriəreɪt/', done: 3, members: 5 },
};

/** AdultMe.dc.html: the calendar uses the canvas's own formula. */
function canvasCalendar(): Array<Array<CalendarLevel | null>> {
  const weeks: Array<Array<CalendarLevel | null>> = [];
  for (let w = 0; w < 16; w++) {
    const days: Array<CalendarLevel | null> = [];
    for (let d = 0; d < 7; d++) {
      const future = w === 15 && d > 4;
      const v = ((w * 7 + d) * 37 + w * 13) % 10;
      let level: CalendarLevel = v < 2 ? 0 : v < 4 ? 1 : v < 7 ? 2 : 3;
      if (w >= 12 && level === 0) level = 2;
      if (w >= 12 && w <= 14) level = Math.max(level, 2) as CalendarLevel;
      days.push(future ? null : level);
    }
    weeks.push(days);
  }
  return weeks;
}

/** SO-1: the Account sheet's "Signed in as" (A8-me-account). */
export const ACCOUNT = { email: 'minh@example.com' };

export const ME = {
  name: 'Minh',
  goal: { exam: 'IELTS Academic', band: 7 },
  testDay: 'unset' as const,
  stats: { fruiting: 412, bestStreak: 41, hours: 38, goldenBlooms: 26 },
  calendar: canvasCalendar(),
  keepsakes: [
    { type: 'firstHarvest' },
    { type: 'streak', days: 30 },
    { type: 'blooms', count: 25 },
    { type: 'nextWords', current: 412, target: 500 },
  ] satisfies KeepsakeItem[],
  dailyGoal: { missions: 3, minutes: 15 },
  reminder: { time: { hour: 7, minute: 30 }, on: true },
  meanings: 'vi-VN' as const,
  family: { name: 'Na' },
};
