/**
 * Canvas sample data for the reference pages (/garden/_reference/<name>),
 * copied from docs/design/garden/source/*.dc.html so each fixture page
 * renders exactly what the canvas renders. Content here is sample data
 * (names, words, meanings, dates), not UI copy: UI copy comes from
 * messages/en-US.json through t().
 */
import type { AppLocale } from '@/i18n/config';
import type { PainKey } from '@/components/home/PainCards';
import type { UseCaseBedKey } from '@/components/home/useCaseWords';

import { calendarDay, weekDays } from '../format';
import type { CalendarLevel } from '../GardenCalendar';
import type { HeroPlant } from '../HeroGardenCard';
import type { KeepsakeItem } from './MeScreen';
import type { BedStage, BeeWord, TopicBedWord } from './TopicBedScreen';
import type { TopicsScreenTopic } from './TopicsScreen';
import type { QuizResultScreenProps } from './QuizResultScreen';
import type { QuizScreenProps } from './QuizScreen';
import type { MissionItem } from './TodaysGardenScreen';
import type { AvatarTone } from './WeeklyHarvestScreen';

export const REFERENCE_NAMES = [
  'A1-todays-garden',
  'A1b-all-watered',
  'A2-review-question',
  'A2-review-answer',
  'A2-review-finished',
  'A3-mission-complete',
  'A4-weekly-harvest',
  'A5-welcome-back',
  'A5b-welcome-back-start',
  'A6-topics',
  'A7-topic-bed',
  'A7-topic-bed-filter-sprouts',
  // 2026-10-11 Topics search: sample data in WORD_SEARCH below
  'A7c-word-search',
  'A8-me',
  'A8-me-account',
  // UI-G: sample data in groupFixtures.ts
  'GR1-shared-gardens',
  'GR2-group-garden',
  'GR3-tricky-patches',
  'GR4-gardeners',
  'GR5-invite',
  'GR6-join',
  'GR7-create',
  // UI-A: sample data in SIGN_IN, REGISTER and FORGOT_PASSWORD below
  'AU1-sign-in',
  'AU1-sign-in-error',
  'AU2-create-account',
  'AU3-create-account-invite',
  'AU4-reset-password',
  'AU4-reset-password-sent',
  // UI-5 QZ-1: sample data in QUIZ below
  'Q1-quiz-choose',
  'Q2-quiz-right',
  'Q3-quiz-not-quite',
  'Q4-quiz-cloze-hint',
  'Q5-quiz-listen',
  // UI-5 QZ-2: sample data in QUIZ_RESULT below
  'Q6-quiz-result',
  'Q7-quiz-result-perfect',
  'Q8-quiz-drill-done',
  // Home page HP-2: the public home page, layout in HOME_REFERENCE below
  'H1-home-phone',
  'H2-home-desktop',
  // Home page HP-11: the v2 boards and their three state boards (HOME_REFERENCE below)
  'H3-home-v2-phone',
  'H4-home-v2-desktop',
  'H3s-plant-bloomed',
  'H3s-pain-flipped',
  'H3s-uses-travel',
  // Phase 13 speaking (handover v2): sample data in speakReference.ts
  'SP2-speak-countdown',
  'SP2-speak-recording',
  'SP3-speak-checking',
  'SP3-speak-done',
  'SP3-speak-failed',
  // Phase 13 speaking entry points (SE1/SE2/SE5/SE6): sample data in ENTRY below
  'SE1-entry-home',
  'SE2-entry-bed',
  'SE5-entry-harvest',
  'SE6-entry-echo',
] as const;
export type ReferenceName = (typeof REFERENCE_NAMES)[number];

/**
 * Home page HP-2: the two home boards (canvas page "Home page"). The copy is
 * `screens.home.public.*` (from the reference `.html` / `-vi.html`); the
 * fixture forces the layout and the board width, not the window width.
 */
export const HOME_REFERENCE = {
  'H1-home-phone': { layout: 'phone', width: 390 },
  'H2-home-desktop': { layout: 'desktop', width: 1280 },
  // HP-11: v2 boards (canvas page "Landing v2"); the H3s boards are H3 in one state.
  'H3-home-v2-phone': { layout: 'phone', width: 390 },
  'H4-home-v2-desktop': { layout: 'desktop', width: 1280 },
  'H3s-plant-bloomed': { layout: 'phone', width: 390, plantedWord: 'deadline' },
  'H3s-pain-flipped': { layout: 'phone', width: 390, flippedPains: ['forget'] },
  'H3s-uses-travel': { layout: 'phone', width: 390, useCaseBed: 'travel' },
} as const satisfies Record<
  string,
  {
    layout: 'phone' | 'desktop';
    width: number;
    plantedWord?: string;
    flippedPains?: readonly PainKey[];
    useCaseBed?: UseCaseBedKey;
  }
>;
export type HomeReferenceName = keyof typeof HOME_REFERENCE;

export function isReferenceName(value: string): value is ReferenceName {
  return (REFERENCE_NAMES as readonly string[]).includes(value);
}

/** AdultLogin.dc.html / AdultLoginVi.dc.html (same sample in both). */
export const SIGN_IN = {
  email: 'minh@example.com',
  // Ten characters: the canvas draws ten password dots.
  password: 'gardenpass',
};

/**
 * AdultRegister.dc.html / AdultRegisterInvite.dc.html (and the Vi pages):
 * the name is filled in, email and password show their placeholders.
 */
export const REGISTER = {
  name: 'Minh',
  invite: {
    'en-US': { inviterName: 'Minh', groupName: 'IELTS Sprint · Week 3' },
    'vi-VN': { inviterName: 'Minh', groupName: 'IELTS Sprint · Tuần 3' },
    'zh-CN': { inviterName: 'Minh', groupName: 'IELTS Sprint · 第 3 周' },
  },
} as const;

/** AdultForgot.dc.html / AdultForgotVi.dc.html (same address in both). */
export const FORGOT_PASSWORD = {
  email: 'minh@example.com',
};

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
    // A clip URL so the audio button shows its ready state; the reference
    // page never plays it.
    audioSrc: '/garden-reference/mitigate.mp3',
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
    sharedWords: 126,
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
 * swaying flowers. The bed ("Environment") comes from `SAMPLE`.
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

/**
 * A7c Search words in a topic (2026-10-11): BED's words searched for
 * `query`; the word to plant and the recent searches are sample data.
 */
export const WORD_SEARCH = {
  'en-US': {
    query: 'de',
    suggestion: { word: 'desertification', line: 'noun · C1 · land slowly turning into desert' },
  },
  'vi-VN': {
    query: 'giảm',
    suggestion: { word: 'reduce', line: 'động từ · B1 · giảm bớt' },
  },
  'zh-CN': {
    query: 'de',
    suggestion: { word: 'desertification', line: '名词 · C1 · 土地慢慢变成沙漠' },
  },
  recent: ['drought', 'mitigate'],
} as const;

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

/** ENTRY.bees as the A7 card; every link goes to `href`. */
export function entryBees(href: string): {
  waiting: number;
  sayAllHref: string;
  words: BeeWord[];
} {
  return {
    waiting: ENTRY.bees.filter(([, pollinated]) => !pollinated).length,
    sayAllHref: href,
    words: ENTRY.bees.map(([word, pollinated, sound]) => ({
      id: word,
      word,
      sound,
      pollinated,
      href,
    })),
  };
}

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

type QuizReference =
  | 'Q1-quiz-choose'
  | 'Q2-quiz-right'
  | 'Q3-quiz-not-quite'
  | 'Q4-quiz-cloze-hint'
  | 'Q5-quiz-listen';
type QuizFixture = Pick<
  QuizScreenProps,
  'index' | 'total' | 'question' | 'feedback' | 'hint' | 'initialAnswer' | 'initialPick'
>;

/**
 * Canvas "Adult · Quiz" Q1–Q5 (AdultQuiz*.dc.html): the question as the
 * API sends it (prompt with the task prefix, gap of five underscores), so
 * the fixture pages go through the same prompt parsing as a live quiz.
 * The topic name comes from `SAMPLE` (Environment).
 */
const DROUGHT_CHOICE: QuizScreenProps['question'] = {
  id: 'drought:CONTEXTUAL_CHOICE',
  type: 'CONTEXTUAL_CHOICE',
  prompt:
    'Choose the word that completes the sentence: "Years of _____ have left the river almost dry."',
  answerMode: 'CHOICE',
  options: ['pollution', 'drought', 'habitat', 'emissions'],
};

export const QUIZ: Record<QuizReference, QuizFixture> = {
  'Q1-quiz-choose': {
    index: 2,
    total: 10,
    question: DROUGHT_CHOICE,
    feedback: null,
    hint: { status: 'idle' },
  },
  'Q2-quiz-right': {
    index: 3,
    total: 10,
    question: {
      id: 'mitigate:MATCHING',
      type: 'MATCHING',
      prompt: 'Which word is a synonym of "mitigate"?',
      answerMode: 'CHOICE',
      options: ['worsen', 'reduce', 'sustain', 'ignore'],
    },
    initialPick: 'reduce',
    feedback: {
      correct: true,
      correctAnswer: 'reduce',
      word: 'mitigate',
      ipa: '/ˈmɪt.ɪ.ɡeɪt/',
      example: 'Planting more trees can help mitigate the effects of climate change.',
      note: 'mastered',
    },
    hint: { status: 'idle' },
  },
  'Q3-quiz-not-quite': {
    index: 2,
    total: 10,
    question: DROUGHT_CHOICE,
    initialPick: 'pollution',
    feedback: {
      correct: false,
      correctAnswer: 'drought',
      word: 'drought',
      explanation: 'a long period with little or no rain',
      note: 'comesBack',
    },
    hint: { status: 'idle' },
  },
  'Q4-quiz-cloze-hint': {
    index: 4,
    total: 10,
    question: {
      id: 'sustainable:CLOZE',
      type: 'CLOZE',
      prompt: 'Fill in the blank: "Cities need more _____ forms of public transport."',
      answerMode: 'TEXT',
    },
    initialAnswer: 'sustainab',
    feedback: null,
    hint: {
      status: 'shown',
      ipa: '/səˈsteɪ.nə.bəl/',
      definition: 'able to continue for a long time without harming the environment',
    },
  },
  'Q5-quiz-listen': {
    index: 9,
    total: 10,
    question: {
      id: 'biodiversity:DICTATION',
      type: 'DICTATION',
      prompt: 'Listen to the audio, then type the word you hear.',
      // Never loaded unless the button is pressed; it only has to be set.
      audioUrl: '/audio/reference-sample.mp3',
      answerMode: 'TEXT',
    },
    feedback: null,
    hint: { status: 'idle' },
  },
};

type QuizResultReference = 'Q6-quiz-result' | 'Q7-quiz-result-perfect' | 'Q8-quiz-drill-done';
type QuizResultFixture = Pick<QuizResultScreenProps, 'correct' | 'total' | 'missed' | 'drill'>;

/**
 * Canvas "Adult · Quiz" Q6–Q8 (AdultQuizResult / Perfect / Drill.dc.html): 7 of 10 with
 * three missed (Drill shown), 10 of 10 (bloom), drill 4 of 5 (no Drill).
 */
export const QUIZ_RESULT: Record<QuizResultReference, QuizResultFixture> = {
  'Q6-quiz-result': {
    correct: 7,
    total: 10,
    missed: [
      { id: 'drought', word: 'drought' },
      { id: 'deteriorate', word: 'deteriorate' },
      { id: 'biodiversity', word: 'biodiversity' },
    ],
  },
  'Q7-quiz-result-perfect': { correct: 10, total: 10, missed: [] },
  'Q8-quiz-drill-done': {
    correct: 4,
    total: 5,
    missed: [{ id: 'drought', word: 'drought' }],
    drill: true,
  },
};

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
    ALL_WATERED: { ...ALL_WATERED, bed: sample.topics[0] },
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
    COMEBACK_START,
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
    QUIZ_TOPIC: sample.topics[0],
  };
}
