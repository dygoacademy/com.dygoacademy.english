/**
 * A4 This week (docs/plans/A4 weekly missions implementation plan.md):
 * the pure half of the weekly missions. Week boundaries, the sound of the
 * week rotation, matching a word's IPA to a sound and the goals after the
 * fallbacks. weekly.store.ts does the SQL.
 */

export type WeeklyMissionKey = 'rescue' | 'water' | 'sentence' | 'sound';

/** The goals fixed on the week's first read. `rescue` or `water` (no wilting words), never both. */
export interface WeeklyGoals {
  rescue?: number;
  water?: number;
  sentence: number;
  sound: number;
}

export const WEEKLY_GOALS = { rescue: 3, water: 20, sentence: 3, sound: 5 } as const;

/** Fewest words with the week's sound for that sound to be used. */
export const SOUND_MIN_WORDS = 3;

/** Most rain barrels a learner holds; the weekly reward never goes above it. */
export const STREAK_FREEZES_MAX = 3;

export interface WeeklySound {
  key: string;
  /** What the chip shows: the spelling, not the IPA. */
  label: string;
  /** Whether a word's IPA (already cleaned by `cleanIpa`) has the sound. */
  test: (ipa: string) => boolean;
}

const last = (ipa: string): string => ipa.slice(-1);

/**
 * Sounds Vietnamese learners find hard, one per week in this order (v1:
 * the same for everyone). "Final" sounds match the last phoneme only.
 */
export const WEEKLY_SOUNDS: readonly WeeklySound[] = [
  { key: 'th_think', label: 'th', test: (ipa) => ipa.includes('θ') },
  { key: 'th_this', label: 'th', test: (ipa) => ipa.includes('ð') },
  { key: 'final_t_d', label: '-t/-d', test: (ipa) => last(ipa) === 't' || last(ipa) === 'd' },
  { key: 'final_s_z', label: '-s', test: (ipa) => last(ipa) === 's' || last(ipa) === 'z' },
  // ʃ after t is "ch" (church), not "sh".
  { key: 'sh', label: 'sh', test: (ipa) => /(^|[^t])ʃ/.test(ipa) },
  { key: 'v', label: 'v', test: (ipa) => ipa.includes('v') },
  { key: 'r', label: 'r', test: (ipa) => /[rɹ]/.test(ipa) },
  { key: 'final_l', label: '-l', test: (ipa) => last(ipa) === 'l' || last(ipa) === 'ɫ' },
];

/**
 * One transcription, bare: the first of several ("/ˈθɪŋk/, /θɪŋk/"),
 * without slashes, brackets, stress, length, syllable dots, optional
 * sounds in parentheses or combining marks (syllabic l̩).
 */
export function cleanIpa(ipa: string | null | undefined): string {
  if (!ipa) return '';
  const first = ipa.split(/[,;]/)[0] ?? '';
  return first
    .normalize('NFD')
    .replace(/\([^)]*\)/g, '')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[/[\]ˈˌ'ːˑ.\s‿-]/g, '')
    .trim();
}

/** Whether a word (UK or US IPA) has `sound`. */
export function hasSound(
  sound: WeeklySound,
  ipas: ReadonlyArray<string | null | undefined>,
): boolean {
  return ipas.some((ipa) => {
    const clean = cleanIpa(ipa);
    return clean.length > 0 && sound.test(clean);
  });
}

const DAY_MS = 86_400_000;
const dayNum = (date: string): number => Math.round(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
const fromDayNum = (n: number): string => new Date(n * DAY_MS).toISOString().slice(0, 10);

/** The Monday (YYYY-MM-DD) of the week `localDate` is in. */
export function weekStartOf(localDate: string): string {
  const n = dayNum(localDate);
  const dow = new Date(n * DAY_MS).getUTCDay(); // 0 = Sunday
  return fromDayNum(n - ((dow + 6) % 7));
}

/** Days after `localDate` until Sunday: 6 on a Monday, 0 on Sunday. */
export function daysLeftInWeek(localDate: string): number {
  return 6 - (dayNum(localDate) - dayNum(weekStartOf(localDate)));
}

/** The Monday the rotation starts on: the week A4 shipped is "th" (think). */
const ROTATION_START = '2026-10-12';

/** Where the rotation starts for the week of `weekStart` (a Monday): one step a week. */
export function soundIndexFor(weekStart: string): number {
  const week = Math.floor((dayNum(weekStart) - dayNum(ROTATION_START)) / 7);
  return ((week % WEEKLY_SOUNDS.length) + WEEKLY_SOUNDS.length) % WEEKLY_SOUNDS.length;
}

export function soundByKey(key: string | null | undefined): WeeklySound {
  return WEEKLY_SOUNDS.find((s) => s.key === key) ?? WEEKLY_SOUNDS[0];
}

/**
 * The week's sound and its goal: the rotation's sound when at least
 * SOUND_MIN_WORDS of the learner's words have it, else the next one in the
 * list. Goal = the words that have it, at most 5 (so at least 3). When no
 * sound has 3 words, the rotation's sound with a goal of 3.
 */
export function pickSound(
  weekStart: string,
  words: ReadonlyArray<{ ipa_uk: string | null; ipa_us: string | null }>,
): { sound: WeeklySound; goal: number } {
  const start = soundIndexFor(weekStart);
  for (let step = 0; step < WEEKLY_SOUNDS.length; step++) {
    const sound = WEEKLY_SOUNDS[(start + step) % WEEKLY_SOUNDS.length];
    const count = words.filter((w) => hasSound(sound, [w.ipa_uk, w.ipa_us])).length;
    if (count >= SOUND_MIN_WORDS) return { sound, goal: Math.min(WEEKLY_GOALS.sound, count) };
  }
  return { sound: WEEKLY_SOUNDS[start], goal: SOUND_MIN_WORDS };
}

/** The week's goals: Rescue when there are wilting words, else Water 20. */
export function weeklyGoals(leeches: number, soundGoal: number): WeeklyGoals {
  return {
    ...(leeches > 0 ? { rescue: WEEKLY_GOALS.rescue } : { water: WEEKLY_GOALS.water }),
    sentence: WEEKLY_GOALS.sentence,
    sound: soundGoal,
  };
}
