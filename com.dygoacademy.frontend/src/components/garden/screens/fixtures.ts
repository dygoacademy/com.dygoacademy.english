/**
 * Canvas sample data for the reference pages (/garden/_reference/<name>),
 * copied from docs/design/garden/source/*.dc.html so each fixture page
 * renders exactly what the canvas renders. Content here is sample data
 * (names, words, meanings, dates), not UI copy: UI copy comes from
 * messages/en-SG.json through t().
 */
import type { AppLocale } from '@/i18n/config';

import { calendarDay, weekDays } from '../format';
import type { CalendarLevel } from '../GardenCalendar';
import type { HeroPlant } from '../HeroGardenCard';
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
  // UI-G: sample data in groupFixtures.ts
  'GR1-shared-gardens',
  'GR2-group-garden',
  'GR3-tricky-patches',
  'GR4-gardeners',
  'GR5-invite',
  'GR6-join',
  'GR7-create',
] as const;
export type ReferenceName = (typeof REFERENCE_NAMES)[number];

export function isReferenceName(value: string): value is ReferenceName {
  return (REFERENCE_NAMES as readonly string[]).includes(value);
}

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
    { kind: 'water', done: 15, total: 18 },
    { kind: 'plant', done: 5, total: 5 },
    { kind: 'challenge', minutes: 3, done: false },
  ] satisfies MissionItem[],
  action: { kind: 'continue' as const, wordsLeft: 3, minutes: 1 },
  ripens: { time: { hour: 7, minute: 30 }, count: 14 },
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
  intervals: {
    again: { unit: 'lessThanMinute' },
    hard: { unit: 'days', count: 2 },
    good: { unit: 'days', count: 5 },
    easy: { unit: 'days', count: 12 },
  } as const,
};

/** AdultBloom.dc.html */
export const COMPLETE = {
  words: 18,
  bloomed: { word: 'mitigate', more: 4 },
  stats: { recalledPercent: 92, minutesToday: 6, streak: 24 },
  // The canvas week, Monday 21 – Sunday 27 September; today is Friday.
  week: weekDays(calendarDay(2026, 9, 25), 1).map((day, index) => ({
    day,
    state: index < 4 ? ('done' as const) : index === 4 ? ('today' as const) : ('empty' as const),
  })),
  missions: { done: 2, total: 3, next: { mission: 'challenge' as const, minutes: 3 } },
  reminder: { ripening: 14, time: { hour: 7, minute: 30 }, on: true },
};

/** AdultMissions.dc.html */
export const HARVEST = {
  weekStart: calendarDay(2026, 9, 21),
  harvest: {
    done: 11,
    total: 21,
    days: weekDays(calendarDay(2026, 9, 25), 1).map((day, index) => ({
      day,
      missions: ([3, 2, 3, 1, 2, 0, 0] as const)[index],
      today: index === 4,
    })),
    seedPack: { name: 'Academic Word List', need: 3, have: 2 },
  },
  goal: { band: 7, mastered: 412, target: 1200, growing: 104, eta: 'pending' as const },
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

/**
 * UI-L: the canvas sample data per language, for `?locale=`. English is
 * the Adult page, Vietnamese the "Adult · Tiếng Việt" page (source/*Vi.dc.html);
 * Chinese has no canvas page, so its sample data is a draft with the same
 * shape (same numbers, Chinese topic names and meanings).
 *
 * Only sample data differs here (names of topics and groups, meanings,
 * the meaning language). UI copy always comes from messages/<locale>.json.
 *
 * `meaningFirst`: the Vietnamese canvas puts the meaning-language line
 * first (A2-review-answer-vi, the UI-L decision); the English canvas,
 * drawn before that decision, shows the English definition first, and the
 * English reference page reproduces it.
 */
const SAMPLE_EN = {
  topics: ['Environment', 'Education', 'Technology', 'Work & careers', 'IELTS Sprint · Week 3'],
  shared: 'Shared',
  academic: 'IELTS Academic',
  collection: 'IELTS Academic',
  group: 'IELTS Sprint group',
  meaning: { text: 'giảm nhẹ, làm dịu bớt', lang: 'vi' },
  meaningFirst: false,
  meanings: 'vi-VN',
} as const;

const SAMPLE = {
  'en-SG': SAMPLE_EN,
  'en-US': SAMPLE_EN,
  'vi-VN': {
    topics: ['Môi trường', 'Giáo dục', 'Công nghệ', 'Công việc', 'IELTS Sprint · Tuần 3'],
    shared: 'Chung',
    academic: 'IELTS',
    collection: 'IELTS Academic',
    group: 'Nhóm IELTS Sprint',
    meaning: { text: 'giảm nhẹ, làm dịu bớt', lang: 'vi' },
    meaningFirst: true,
    meanings: 'vi-VN',
  },
  'zh-CN': {
    topics: ['环境', '教育', '科技', '工作与职业', 'IELTS 冲刺 · 第 3 周'],
    shared: '共享',
    academic: 'IELTS 学术',
    collection: 'IELTS 学术',
    group: 'IELTS 冲刺小组',
    meaning: { text: '减轻，缓和', lang: 'zh-CN' },
    meaningFirst: true,
    meanings: 'zh-CN',
  },
} as const;

/** A7's meanings in Chinese, in the order of `BED.words`. */
const BED_MEANINGS_ZH = [
  '干旱',
  '恶化，变坏',
  '减轻，缓和',
  '保护，保存',
  '生物多样性',
  '碳足迹',
  '森林砍伐',
  '生态系统',
  '可再生的',
  '可持续的',
  '排放物',
];

export function referenceFixtures(locale: AppLocale) {
  const sample = SAMPLE[locale];
  return {
    HOME,
    REVIEW: {
      ...REVIEW,
      card: {
        ...REVIEW.card,
        topic: sample.topics[0],
        meaningTranslation: sample.meaning,
        meaningFirst: sample.meaningFirst,
      },
    },
    COMPLETE,
    HARVEST: { ...HARVEST, group: { ...HARVEST.group, name: sample.group } },
    COMEBACK,
    TOPICS: TOPICS.map((topic, index) => ({
      ...topic,
      title: sample.topics[index],
      level: topic.group === 'group' ? sample.shared : topic.level,
    })),
    TOPICS_ACADEMIC_FILTER: { ...TOPICS_ACADEMIC_FILTER, label: sample.academic },
    TOPICS_LOCKED_PACK,
    BED: {
      ...BED,
      title: sample.topics[0],
      meta: { ...BED.meta, collection: sample.collection },
      words:
        locale === 'zh-CN'
          ? BED.words.map((word, index) => ({
              ...word,
              meaning: BED_MEANINGS_ZH[index],
              meaningLang: 'zh-CN',
            }))
          : BED.words,
    },
    ME: { ...ME, meanings: sample.meanings },
  };
}
