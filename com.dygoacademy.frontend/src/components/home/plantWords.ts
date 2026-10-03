import type { MEANING_LOCALES } from '@/i18n/config';

/**
 * Home page HP-6 · the 8 pre-made words of the hero "Plant a word" demo
 * (Phase 12 plan, *Home page v2*, decision 14: pre-made only, no API
 * call). English definitions as approved at G-home (2026-10-03); the
 * Vietnamese meanings were checked by Dylan at G-home, the Chinese ones
 * are drafts (decision 8). The chips show `PLANT_CHIP_WORDS`; the input
 * matches all 8 (`findPlantWord`).
 */
export type PlantWordPos = 'adjective' | 'noun' | 'verb';

export interface PlantWord {
  word: string;
  /** UK IPA, with slashes. */
  ipa: string;
  pos: PlantWordPos;
  /** English definition (the only meaning line in en-US). */
  definition: string;
  /** The meaning in the page language for vi-VN and zh-CN. */
  meaning: Record<(typeof MEANING_LOCALES)[number], string>;
  example: string;
  synonyms: readonly [string, string];
}

export const PLANT_WORDS: readonly PlantWord[] = [
  {
    word: 'confident',
    ipa: '/ˈkɒnfɪdənt/',
    pos: 'adjective',
    definition: 'sure of yourself and your abilities',
    meaning: { 'vi-VN': 'tự tin', 'zh-CN': '自信的' },
    example: 'She felt confident before the interview.',
    synonyms: ['sure', 'self-assured'],
  },
  {
    word: 'deadline',
    ipa: '/ˈdedlaɪn/',
    pos: 'noun',
    definition: 'the time or date by which something must be done',
    meaning: { 'vi-VN': 'hạn chót', 'zh-CN': '截止日期' },
    example: 'We need to finish the report before the Friday deadline.',
    synonyms: ['due date', 'time limit'],
  },
  {
    word: 'mitigate',
    ipa: '/ˈmɪtɪɡeɪt/',
    pos: 'verb',
    definition: 'to make something bad less serious',
    meaning: { 'vi-VN': 'giảm nhẹ', 'zh-CN': '减轻' },
    example: 'Trees help mitigate the heat in big cities.',
    synonyms: ['reduce', 'ease'],
  },
  {
    word: 'souvenir',
    ipa: '/ˌsuːvəˈnɪə/',
    pos: 'noun',
    definition: 'something you buy or keep to remember a place or trip',
    meaning: { 'vi-VN': 'quà lưu niệm', 'zh-CN': '纪念品' },
    example: 'I bought a small souvenir at the night market.',
    synonyms: ['keepsake', 'memento'],
  },
  {
    word: 'negotiate',
    ipa: '/nɪˈɡəʊʃieɪt/',
    pos: 'verb',
    definition: 'to discuss something to reach an agreement',
    meaning: { 'vi-VN': 'đàm phán, thương lượng', 'zh-CN': '谈判' },
    example: 'They negotiated a better price with the supplier.',
    synonyms: ['bargain', 'discuss'],
  },
  {
    word: 'sustainable',
    ipa: '/səˈsteɪnəbl/',
    pos: 'adjective',
    definition: 'able to continue without harming the environment',
    meaning: { 'vi-VN': 'bền vững', 'zh-CN': '可持续的' },
    example: 'The city is investing in sustainable transport.',
    synonyms: ['green', 'renewable'],
  },
  {
    word: 'appointment',
    ipa: '/əˈpɔɪntmənt/',
    pos: 'noun',
    definition: 'an arranged time to meet someone',
    meaning: { 'vi-VN': 'cuộc hẹn', 'zh-CN': '预约' },
    example: 'I have a dentist appointment at 3 p.m.',
    synonyms: ['booking', 'meeting'],
  },
  {
    word: 'curious',
    ipa: '/ˈkjʊəriəs/',
    pos: 'adjective',
    definition: 'wanting to know or learn about something',
    meaning: { 'vi-VN': 'tò mò', 'zh-CN': '好奇的' },
    example: 'Children are curious about everything around them.',
    synonyms: ['inquisitive', 'interested'],
  },
];

/** The 4 words on the hero chips, in order. */
export const PLANT_CHIP_WORDS = ['confident', 'deadline', 'mitigate', 'souvenir'] as const;

/** One of the 8 words, case-insensitive and trimmed; `undefined` for any other word. */
export function findPlantWord(input: string): PlantWord | undefined {
  const key = input.trim().toLowerCase();
  return PLANT_WORDS.find((entry) => entry.word === key);
}

/**
 * Splits the example around the planted word (or a longer form of it,
 * "negotiated") so the card can show it in bold.
 */
export function splitExample(entry: PlantWord): [before: string, word: string, after: string] {
  const match = new RegExp(`\\b${entry.word}\\w*`, 'i').exec(entry.example);
  if (!match) return [entry.example, '', ''];
  return [
    entry.example.slice(0, match.index),
    match[0],
    entry.example.slice(match.index + match[0].length),
  ];
}
