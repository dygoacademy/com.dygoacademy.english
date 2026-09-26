/**
 * Canvas sample data for the reference pages (/garden/_reference/<name>),
 * copied from docs/design/garden/source/*.dc.html so each fixture page
 * renders exactly what the canvas renders. Content here is sample data
 * (names, words, meanings, dates), not UI copy: UI copy comes from
 * messages/en.json through t().
 */
import type { CalendarLevel } from '../GardenCalendar';
import type { HeroPlant } from '../HeroGardenCard';
import type { WeekDay } from '../WeekDots';
import type { KeepsakeItem } from './MeScreen';
import type { BedStage, TopicBedWord } from './TopicBedScreen';
import type { TopicsScreenTopic } from './TopicsScreen';
import type { MissionItem } from './TodaysGardenScreen';
import type { AvatarTone } from './WeeklyHarvestScreen';

export const REFERENCE_NAMES = [
  'A1-todays-garden',
  'A2-review-question',
  'A2-review-answer',
  'A2-review-finished',
  'A3-mission-complete',
  'A4-weekly-harvest',
  'A5-welcome-back',
  'A6-topics',
  'A7-topic-bed',
  'A7-topic-bed-filter-sprouts',
  'A8-me',
] as const;
export type ReferenceName = (typeof REFERENCE_NAMES)[number];

export function isReferenceName(value: string): value is ReferenceName {
  return (REFERENCE_NAMES as readonly string[]).includes(value);
}

/** AdultHome.dc.html */
export const HOME = {
  dateLabel: 'Friday, 25 September',
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
    { kind: 'water', done: 15, total: 18 },
    { kind: 'plant', done: 5, total: 5 },
    { kind: 'challenge', minutes: 3, done: false },
  ] satisfies MissionItem[],
  action: { kind: 'continue' as const, wordsLeft: 3, minutes: 1 },
  ripens: { time: '7:30 AM', count: 14 },
};

/** AdultReview.dc.html */
export const REVIEW = {
  total: 18,
  done: 15,
  card: {
    word: 'mitigate',
    ipa: '/ˈmɪt.ɪ.ɡeɪt/',
    // A clip URL so the audio button shows its ready state; the reference
    // page never plays it.
    audioSrc: '/garden-reference/mitigate.mp3',
    level: 'B2',
    topic: 'Environment',
    partOfSpeech: 'verb',
    meaning: 'to make something bad less harmful or serious',
    meaningTranslation: { text: 'giảm nhẹ, làm dịu bớt', lang: 'vi' },
    example: 'Planting more trees can help mitigate the effects of climate change.',
    collocations: ['mitigate the impact', 'mitigate risk', 'help to mitigate'],
  },
  intervals: { again: '< 1 min', hard: '2 days', good: '5 days', easy: '12 days' },
};

/** AdultBloom.dc.html */
export const COMPLETE = {
  words: 18,
  bloomed: { word: 'mitigate', more: 4 },
  stats: { recalledPercent: 92, minutesToday: 6, streak: 24 },
  week: [
    { initial: 'M', label: 'Monday, done', state: 'done' },
    { initial: 'T', label: 'Tuesday, done', state: 'done' },
    { initial: 'W', label: 'Wednesday, done', state: 'done' },
    { initial: 'T', label: 'Thursday, done', state: 'done' },
    { initial: 'F', label: 'Friday, today, done', state: 'today' },
    { initial: 'S', label: 'Saturday', state: 'empty' },
    { initial: 'S', label: 'Sunday', state: 'empty' },
  ] satisfies WeekDay[],
  missions: { done: 2, total: 3, next: { title: 'Collocation challenge', minutes: 3 } },
  reminder: { ripening: 14, time: '7:30 AM', on: true },
};

/** AdultMissions.dc.html */
export const HARVEST = {
  weekLabel: 'Week of 21 September',
  harvest: {
    done: 11,
    total: 21,
    days: [
      { name: 'Mon', missions: 3 },
      { name: 'Tue', missions: 2 },
      { name: 'Wed', missions: 3 },
      { name: 'Thu', missions: 1 },
      { name: 'Fri', missions: 2, today: true },
      { name: 'Sat', missions: 0 },
      { name: 'Sun', missions: 0 },
    ] as Array<{ name: string; missions: 0 | 1 | 2 | 3; today?: boolean }>,
    seedPack: { name: 'Academic Word List', need: 3, have: 2 },
  },
  goal: { title: 'Road to Band 7', mastered: 412, target: 1200, growing: 104, eta: '[ETA]' },
  freezes: 2,
  group: {
    name: 'IELTS Sprint group',
    watered: 4,
    members: 5,
    plotWords: 1930,
    avatars: [
      { text: 'L', tone: 'flower' },
      { text: 'M', tone: 'sprout' },
      { text: 'T', tone: 'due' },
      { text: '+2', tone: 'more' },
    ] as Array<{ text: string; tone: AvatarTone }>,
  },
};

/** AdultComeback.dc.html */
export const COMEBACK = {
  dateLabel: 'Monday, 28 September',
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
  streak: { days: 23, covered: 2, left: 0, refills: 'Sunday' },
  revive: { count: 12, minutes: 5 },
  waterAll: { count: 42 },
};

/** AdultTopics.dc.html */
export const TOPICS: TopicsScreenTopic[] = [
  {
    title: 'Environment',
    group: 'academic',
    level: 'B2–C1',
    words: 48,
    stages: { tree: 18, flower: 7, sprout: 11 },
    due: 6,
  },
  {
    title: 'Education',
    group: 'academic',
    level: 'B2',
    words: 40,
    stages: { tree: 22, flower: 9, sprout: 5 },
    due: 4,
  },
  {
    title: 'Technology',
    group: 'academic',
    level: 'B2–C1',
    words: 36,
    stages: { tree: 8, flower: 6, sprout: 12 },
    due: 8,
  },
  {
    title: 'Work & careers',
    group: 'mine',
    level: 'B1–B2',
    words: 30,
    stages: { tree: 20, flower: 6, sprout: 2 },
    due: 0,
  },
  {
    title: 'IELTS Sprint · Week 3',
    group: 'group',
    level: 'Shared',
    words: 42,
    stages: { tree: 12, flower: 10, sprout: 12 },
    due: 5,
  },
].map((topic, index) => ({ ...topic, id: `topic-${index + 1}`, href: '#' }));

export const TOPICS_ACADEMIC_FILTER = { id: 'academic', label: 'IELTS Academic' };
export const TOPICS_LOCKED_PACK = {
  name: 'Academic Word List',
  hint: 'Seed pack · 1 more Golden Bloom this week',
  groups: ['academic'],
};

/** AdultTopicDetail.dc.html */
export const BED = {
  title: 'Environment',
  meta: 'IELTS Academic · B2–C1 · 48 words',
  stageCounts: { seed: 12, sprout: 11, flower: 7, tree: 18 } satisfies Record<BedStage, number>,
  water: { count: 6 },
  words: (
    [
      ['drought', 'hạn hán · tricky, 5 lapses', 'sprout', true, 'now', 'Due now'],
      ['deteriorate', 'xấu đi, suy giảm', 'sprout', false, 'now', 'Due now'],
      ['mitigate', 'giảm nhẹ, làm dịu bớt', 'flower', false, 'now', 'Due now'],
      ['conservation', 'sự bảo tồn', 'sprout', false, 'now', 'Due now'],
      ['biodiversity', 'đa dạng sinh học', 'seed', false, 'new', 'New'],
      ['carbon footprint', 'lượng khí thải carbon', 'seed', false, 'new', 'New'],
      ['deforestation', 'nạn phá rừng', 'flower', false, 'later', 'in 3 days'],
      ['ecosystem', 'hệ sinh thái', 'flower', false, 'later', 'in 5 days'],
      ['renewable', 'có thể tái tạo', 'tree', false, 'later', 'in 9 days'],
      ['sustainable', 'bền vững', 'tree', false, 'later', 'in 12 days'],
      ['emissions', 'khí thải', 'tree', false, 'later', 'in 20 days'],
    ] as const
  ).map(([word, meaning, stage, wilting, tone, text]): TopicBedWord => ({
    id: word,
    word,
    meaning,
    meaningLang: 'vi',
    stage,
    wilting,
    due: { tone, text },
  })),
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

export const ME = {
  name: 'Minh',
  subtitle: 'IELTS Academic · target band 7.0',
  testDay: '[add date]',
  stats: { fruiting: 412, bestStreak: 41, hours: 38, goldenBlooms: 26 },
  calendar: canvasCalendar(),
  keepsakes: [
    { type: 'firstHarvest' },
    { type: 'streak', days: 30 },
    { type: 'blooms', count: 25 },
    { type: 'nextWords', current: 412, target: 500 },
  ] satisfies KeepsakeItem[],
  dailyGoal: { missions: 3, minutes: 15 },
  reminder: { time: '7:30 AM', on: true },
  meanings: 'Tiếng Việt + English',
  family: { name: 'Na' },
};
