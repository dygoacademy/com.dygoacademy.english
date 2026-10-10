/**
 * Pure helpers for the live garden routes (UI-fidelity 6). No React, no
 * fetching: the live components pass in what the existing hooks returned.
 */
import type {
  SpeakingHarvestWord,
  SrsStageCounts,
  SrsStats,
  StudySchedule,
  TopicSummary,
  TopicWordSummary,
  UpcomingActivity,
} from '@/types';
import { GARDEN_ROUTES } from '@/constants/garden';
import type { MissionDay, TodayMissions } from '@/hooks/useMissions';
import type { MyKeepsakes } from '@/hooks/useProfile';
import { toLocalDateString } from '@/lib/timezone';

import { parseClock, type ClockTime } from '../format';
import type { CalendarLevel } from '../GardenCalendar';
import type { HeroPlant } from '../HeroGardenCard';
import { stageFromSrs, type GardenFsrsState } from '../plantStage';
import type { KeepsakeItem } from '../screens/MeScreen';
import type { BedStage, HarvestWord, TopicBedWord } from '../screens/TopicBedScreen';
import type { TopicsScreenTopic } from '../screens/TopicsScreen';
import type { Greeting, MissionItem } from '../screens/TodaysGardenScreen';
import type { WeeklyHarvestScreenProps } from '../screens/WeeklyHarvestScreen';
import type { WelcomeBackScreenProps } from '../screens/WelcomeBackScreen';

/** Morning until noon, afternoon until 18:00, then evening. */
export function greetingFor(hour: number): Greeting {
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

/** The browser's IANA time zone (falls back to UTC). */
export function localTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** YYYY-MM-DD of a date in local time. */
export function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dayNumber(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

/**
 * Whole days missed since the learner last reviewed, from
 * `GET /srs/activity` rows (days with no reviews may be missing or 0).
 *
 * - null: never reviewed in the window (a new learner isn't "back").
 * - 0: reviewed today or yesterday.
 * - n: the n days between the last review day and today had none.
 */
export function missedDays(
  activity: ReadonlyArray<{ review_date: string; review_count: number }>,
  today: string,
): number | null {
  const active = activity
    .filter((day) => day.review_count > 0)
    .map((day) => dayNumber(day.review_date));
  if (active.length === 0) return null;
  const last = Math.max(...active);
  return Math.max(0, dayNumber(today) - last - 1);
}

/**
 * Missions v0 (U4-4), mission 1 "Water today's thirsty words" from data
 * the app already has: progress = reviews today (`GET /srs/activity`
 * today's row, or the session just finished if that's higher), target =
 * that + what is still due (`GET /srs/stats` `due_now`). Done when nothing
 * is due. Missions 2-3 aren't shown until they have real data.
 */
export function thirstyMission(
  activity: ReadonlyArray<{ review_date: string; review_count: number }>,
  today: string,
  dueNow: number,
  wateredNow = 0,
): Extract<MissionItem, { kind: 'thirsty' }> {
  const row = activity.find((day) => day.review_date.slice(0, 10) === today);
  const done = Math.max(row?.review_count ?? 0, wateredNow, 0);
  return { kind: 'thirsty', done, total: done + Math.max(0, dueNow) };
}

/** The A3 Golden Bloom card for Missions v0: one mission, no next one. */
export function missionsSummary(mission: { done: number; total: number }): {
  done: number;
  total: number;
  next: null;
} {
  return { done: mission.done >= mission.total ? 1 : 0, total: 1, next: null };
}

/**
 * UI-6 (U6-5): A1's mission rows from `GET /missions/today`, in the API's
 * order (REVIEW_DUE, LEARN_NEW, then QUIZ or SPEAK). Progress is capped at
 * the target so extra reviews don't overflow the bar. Every open row links
 * to its activity: water → watering, plant → a new-words session for
 * what's left, QUIZ → `quizHref`, SPEAK (Phase 13 SE1) → The Pond.
 *
 * The water row follows the live due count (`GET /srs/stats` `due_now`,
 * the hero card's "thirsty" number) rather than the target frozen when
 * the day's rows were created: total = watered today + still due, and it
 * reads done once the mission is done or nothing is left to water.
 */
export function liveMissions(today: TodayMissions, quizHref: string, dueNow: number): MissionItem[] {
  return today.missions.map((m): MissionItem => {
    if (m.type === 'QUIZ') return { kind: 'challenge', minutes: null, done: m.done, href: quizHref };
    const total = Math.max(0, m.target);
    const done = m.done ? total : Math.min(Math.max(0, m.progress), total);
    if (m.type === 'REVIEW_DUE') {
      const left = m.done ? 0 : Math.max(0, dueNow);
      return { kind: 'water', done, total: done + left, href: GARDEN_ROUTES.review };
    }
    if (m.type === 'SPEAK') {
      return { kind: 'speak', done, total, minutes: null, href: GARDEN_ROUTES.sounds };
    }
    return { kind: 'plant', done, total, href: GARDEN_ROUTES.plant(total - done) };
  });
}

/**
 * UI-6 (U6-5): A3's Golden Bloom card; the next mission is the quiz, or
 * the SPEAK mission (SE1), while it's open.
 */
export function liveMissionsSummary(
  today: TodayMissions,
  quizHref: string,
): {
  done: number;
  total: number;
  next: {
    mission: 'challenge' | 'speak';
    minutes: null;
    href: string;
    count?: number;
  } | null;
} {
  const quiz = today.missions.find((m) => m.type === 'QUIZ' && !m.done);
  const speak = today.missions.find((m) => m.type === 'SPEAK' && !m.done);
  return {
    done: today.missions.filter((m) => m.done).length,
    total: today.missions.length,
    next: quiz
      ? { mission: 'challenge', minutes: null, href: quizHref }
      : speak
        ? { mission: 'speak', minutes: null, href: GARDEN_ROUTES.sounds, count: speak.target }
        : null,
  };
}

/**
 * The QUIZ mission's link: the garden quiz of the bed with the most due
 * words (`GET /topics` `due_count`; first bed on a tie), or the quiz over
 * all beds when no bed has anything due (or the topics call failed).
 */
export function missionQuizHref(
  topics: ReadonlyArray<Pick<GardenTopicSummary, 'id' | 'due_count'>> | undefined,
): string {
  let best: { id: string; due: number } | null = null;
  for (const topic of topics ?? []) {
    const due = num(topic.due_count);
    if (due > 0 && (!best || due > best.due)) best = { id: topic.id, due };
  }
  return GARDEN_ROUTES.quiz(best?.id);
}

/**
 * A decorative garden for the hero card from the learner's real counts:
 * `slots` plants whose mix follows mastered (trees), leeches (wilting)
 * and the rest (sprouts and flowers), with drops on a share of the
 * non-tree plants matching how much is due. No plant stands for a
 * particular word; the legend carries the numbers.
 */
export function sampleGarden(
  counts: { total: number; mastered: number; leeches: number; due: number },
  slots: number,
): HeroPlant[] {
  const total = Math.max(counts.total, 0);
  if (total === 0) return Array.from({ length: slots }, () => 'seed' as const);
  const share = (n: number) => (n > 0 ? Math.max(1, Math.round((n / total) * slots)) : 0);
  const trees = Math.min(share(counts.mastered), slots);
  const wilting = Math.min(share(counts.leeches), slots - trees);
  const rest = slots - trees - wilting;
  const growing: Array<'sprout' | 'flower'> = Array.from({ length: rest }, (_, i) =>
    i % 2 === 0 ? 'flower' : 'sprout',
  );
  const thirsty = Math.min(share(counts.due), rest);

  // Interleave so the kinds spread across the bed instead of clumping.
  const plants: HeroPlant[] = [];
  const pools: HeroPlant[][] = [
    Array.from({ length: trees }, () => 'tree' as const),
    growing.map((stage, i) => ({ stage, thirsty: i < thirsty })),
    Array.from({ length: wilting }, () => 'wilting' as const),
  ];
  while (plants.length < slots && pools.some((pool) => pool.length > 0)) {
    for (const pool of pools) {
      const next = pool.shift();
      if (next !== undefined) plants.push(next);
    }
  }
  return plants.slice(0, slots);
}

/**
 * Split `slots` across `values` in proportion (largest remainder), giving
 * every non-zero value at least one slot while there are slots to give.
 */
function allocate(values: readonly number[], slots: number): number[] {
  const total = values.reduce((sum, v) => sum + Math.max(v, 0), 0);
  if (total === 0 || slots <= 0) return values.map(() => 0);
  const exact = values.map((v) => (Math.max(v, 0) / total) * slots);
  const alloc = exact.map((x, i) => (values[i] > 0 ? Math.max(1, Math.floor(x)) : 0));
  let sum = alloc.reduce((a, b) => a + b, 0);
  while (sum > slots) {
    // Too many minimum-1 slots: take from the largest allocation.
    const i = alloc.indexOf(Math.max(...alloc));
    alloc[i] -= 1;
    sum -= 1;
  }
  while (sum < slots) {
    let best = -1;
    for (let i = 0; i < alloc.length; i++) {
      if (values[i] <= 0) continue;
      if (best === -1 || exact[i] - alloc[i] > exact[best] - alloc[best]) best = i;
    }
    alloc[best] += 1;
    sum += 1;
  }
  return alloc;
}

/**
 * U4-3: the hero garden from real `GET /srs/stats` `stage_counts`
 * (A7 stages: New → seed, Learning/Relearning → sprout, Review → flower,
 * mastered → tree). Leeches stay counted in their stage (A7), so they turn
 * growing plants wilting; `due` marks growing plants thirsty.
 */
export function stageGarden(
  stages: SrsStageCounts,
  extras: { leeches: number; due: number },
  slots: number,
): HeroPlant[] {
  const [trees, flowers, sprouts, seeds] = allocate(
    [stages.mastered, stages.review, stages.learning, stages.new],
    slots,
  );
  if (trees + flowers + sprouts + seeds === 0) {
    return Array.from({ length: slots }, () => 'seed' as const);
  }
  const total = stages.mastered + stages.review + stages.learning + stages.new;
  const share = (n: number) => (n > 0 ? Math.max(1, Math.round((n / total) * slots)) : 0);
  let growing: Array<'sprout' | 'flower'> = [
    ...Array.from({ length: sprouts }, () => 'sprout' as const),
    ...Array.from({ length: flowers }, () => 'flower' as const),
  ];
  const wilting = Math.min(share(extras.leeches), growing.length);
  growing = growing.slice(wilting);
  const thirsty = Math.min(share(extras.due), growing.length);

  const plants: HeroPlant[] = [];
  const pools: HeroPlant[][] = [
    Array.from({ length: trees }, () => 'tree' as const),
    growing.map((stage, i) => ({ stage, thirsty: i < thirsty })),
    Array.from({ length: seeds }, () => 'seed' as const),
    Array.from({ length: wilting }, () => 'wilting' as const),
  ];
  while (plants.length < slots && pools.some((pool) => pool.length > 0)) {
    for (const pool of pools) {
      const next = pool.shift();
      if (next !== undefined) plants.push(next);
    }
  }
  return plants.slice(0, slots);
}

/** Garden plants from `stage_counts`, else the `sampleGarden` estimate. */
export function gardenPlants(stats: SrsStats, slots: number): HeroPlant[] {
  const extras = { leeches: stats.leech_count, due: stats.due_now };
  if (stats.stage_counts) return stageGarden(stats.stage_counts, extras, slots);
  return sampleGarden(
    { total: stats.total_words, mastered: stats.mastered_words, ...extras },
    slots,
  );
}

/**
 * "Tomorrow {time} · N words ripen": N from GET /srs/activity/upcoming for
 * `tomorrow` (ISO day), the time from the learner's earliest enabled reminder.
 * Null (line hidden) without a reminder or when nothing ripens.
 */
export function ripensTomorrow(
  upcoming: readonly UpcomingActivity[] | undefined,
  tomorrow: string,
  schedules: readonly StudySchedule[] | undefined,
): { time: ClockTime; count: number } | null {
  const count = upcoming?.find((row) => row.due_date.slice(0, 10) === tomorrow)?.due_count ?? 0;
  const reminder = [...(schedules ?? [])]
    .filter((s) => s.is_enabled)
    .sort((a, b) => a.reminder_time.localeCompare(b.reminder_time))[0];
  if (count <= 0 || !reminder) return null;
  return { time: parseClock(reminder.reminder_time), count };
}

/** The reminder time a new schedule gets (same default as the classic settings page). */
export const DEFAULT_REMINDER_TIME = '20:00';

/** The learner's earliest schedule (enabled or not): the one A3 and A8 show. */
export function earliestSchedule(
  schedules: readonly StudySchedule[] | undefined,
): StudySchedule | undefined {
  return [...(schedules ?? [])].sort((a, b) => a.reminder_time.localeCompare(b.reminder_time))[0];
}

/**
 * A3's "N words ripen tomorrow — remind me at {time}" row: N from GET
 * /srs/activity/upcoming for `tomorrow` (ISO day), time and on/off from the
 * earliest schedule; no schedule yet → off at the default time (turning it
 * on creates one). Null (row hidden) until the schedules have loaded.
 */
export function doneReminder(
  upcoming: readonly UpcomingActivity[] | undefined,
  tomorrow: string,
  schedules: readonly StudySchedule[] | undefined,
): { ripening: number; time: ClockTime; on: boolean } | null {
  if (!schedules) return null;
  const ripening = upcoming?.find((row) => row.due_date.slice(0, 10) === tomorrow)?.due_count ?? 0;
  const schedule = earliestSchedule(schedules);
  return {
    ripening,
    time: parseClock(schedule?.reminder_time ?? DEFAULT_REMINDER_TIME),
    on: schedule?.is_enabled ?? false,
  };
}

/** "07:30:00" → a Date today at that time (for locale formatting). */
export function timeOfDay(hhmmss: string): Date {
  const [h, m] = hhmmss.split(':').map(Number);
  const date = new Date();
  date.setHours(h || 0, m || 0, 0, 0);
  return date;
}

/** Monday-first days of the week containing `today` (local dates). */
export function weekOf(today: Date): Date[] {
  const start = new Date(today);
  start.setHours(12, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return day;
  });
}

/**
 * A name to greet with, or null: `profiles.display_name` first (what
 * register saves and what seeded accounts like Sarah's carry; it reaches
 * the app as `SrsStats.display_name`), then Supabase user metadata.
 */
export function displayName(
  user: { user_metadata?: Record<string, unknown> | null } | null | undefined,
  profileName?: string | null,
): string | null {
  const meta = user?.user_metadata ?? {};
  for (const value of [profileName, meta.display_name, meta.full_name, meta.name]) {
    if (typeof value === 'string' && value.trim()) return value.trim().split(/\s+/)[0];
  }
  return null;
}

/**
 * Me's "in the garden" hours from `SrsStats.garden_minutes`: one decimal
 * under 10 h (so a first week doesn't read as "0h"), whole hours after;
 * null when the backend doesn't send it.
 */
export function gardenHours(minutes: number | null | undefined): number | null {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) return null;
  const hours = Math.max(0, minutes) / 60;
  return hours < 10 ? Math.round(hours * 10) / 10 : Math.round(hours);
}

/** The finished session, carried from /review to /review/done in the URL. */
export interface SessionResult {
  watered: number;
  recalled: number | null;
  minutes: number | null;
  word: string | null;
  more: number;
}

/** Reads the session result from /review/done's search params. */
export function parseSessionResult(
  params: Record<string, string | string[] | undefined>,
): SessionResult {
  const one = (key: string) => {
    const value = params[key];
    return typeof value === 'string' ? value : null;
  };
  const int = (key: string) => {
    const value = Number(one(key));
    return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
  };
  return {
    watered: int('watered') ?? 0,
    recalled: int('recalled') !== null ? Math.min(int('recalled')!, 100) : null,
    minutes: int('minutes'),
    word: one('word')?.slice(0, 80) ?? null,
    more: int('more') ?? 0,
  };
}

/** "B2" or "B2–C1" from a CEFR range; null when unknown. */
export function formatLevel(min: string | null, max: string | null): string | null {
  if (!min && !max) return null;
  if (!min || !max || min === max) return (min ?? max) as string;
  return `${min}–${max}`;
}

/**
 * The A6 filter chips after "All", from the beds actually present: each
 * library collection (e.g. "IELTS Academic"), then Mine, then Group, as in
 * the canvas. A kind with no beds gets no chip.
 */
export function topicFilters(
  beds: ReadonlyArray<{ group: string }>,
  labels: { mine: string },
): Array<{ id: string; label: string }> {
  const groups = new Set(beds.map((bed) => bed.group));
  const collections = [...groups]
    .filter((group) => group.startsWith('library:'))
    .map((group) => ({ id: group, label: group.slice('library:'.length) }));
  return [
    ...collections,
    ...(groups.has('mine') ? [{ id: 'mine', label: labels.mine }] : []),
  ];
}

/**
 * Fields `GET /topics` gained for the garden (Phase 12 UI-5). Optional, so
 * the page still works against an API that doesn't send them yet: the
 * badge, level, chips and stage bar then just don't show.
 */
export type GardenTopicSummary = TopicSummary &
  Partial<{
    seed_count: string;
    sprout_count: string;
    flower_count: string;
    due_count: string;
    min_level: string | null;
    max_level: string | null;
    kind: 'mine' | 'group' | 'library';
    collection_title: string | null;
  }>;

const num = (value: string | null | undefined) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** Maps one `GET /topics` row to the screen's topic. */
export function toScreenTopic(
  topic: GardenTopicSummary,
  libraryLabel: string,
  sharedLabel = 'Shared',
): TopicsScreenTopic {
  const words = num(topic.word_count);
  const hasStages = topic.sprout_count !== undefined && topic.flower_count !== undefined;
  return {
    id: topic.id,
    href: GARDEN_ROUTES.topic(topic.id),
    title: topic.title,
    group:
      topic.kind === 'library'
        ? `library:${topic.collection_title ?? libraryLabel}`
        : (topic.kind ?? 'all'),
    // A shared group bed says "Shared" where the level goes, as in the canvas.
    level:
      topic.kind === 'group'
        ? sharedLabel
        : formatLevel(topic.min_level ?? null, topic.max_level ?? null),
    words,
    stages: hasStages
      ? {
          tree: num(topic.mastered_count),
          flower: num(topic.flower_count),
          sprout: num(topic.sprout_count),
          seed: num(topic.seed_count),
        }
      : num(topic.mastered_count) > 0
        ? { tree: num(topic.mastered_count), flower: 0, sprout: 0 }
        : null,
    due: topic.due_count === undefined ? null : num(topic.due_count),
  };
}

/**
 * A6 order (U5-2): thirstiest beds first, by due words; beds with nothing
 * due or no due count (older API) keep the API's order after them. Stable,
 * returns a new array.
 */
export function sortBedsByDue<T extends { due: number | null }>(beds: readonly T[]): T[] {
  return beds
    .map((bed, index) => ({ bed, index }))
    .sort((a, b) => (b.bed.due ?? 0) - (a.bed.due ?? 0) || a.index - b.index)
    .map(({ bed }) => bed);
}

/**
 * Fields `GET /topics/:id` words gained for the garden (Phase 12 U5-1): the
 * caller's own SRS state, all null for a word they never studied. Optional,
 * so A7 still works against an API that doesn't send them yet.
 */
export type GardenTopicWord = TopicWordSummary &
  Partial<{
    fsrs_state: GardenFsrsState | null;
    mastered_at: string | null;
    is_leech: boolean | null;
    next_due_at: string | null;
  }>;

/**
 * A7 live (U5-3): the bed's words with real stages, due labels and stage
 * counts, sorted by next watering as in the canvas: due now (wilting
 * first, then longest overdue), then never-studied seeds, then the rest
 * soonest first. Stages come from `stageFromSrs`; a leech keeps its
 * underlying stage for the tiles and filter and is drawn wilting, so the
 * four tiles always add up to the word count. `stageCounts` is null when
 * the API doesn't send the U5-1 fields (tiles then show "—").
 *
 * `meanings` carries a `lang` alongside each word's text (2026-09-29) so
 * a translated meaning gets the review card's own treatment — `WordRow`
 * renders it with that `lang` (falls through to `TopicBedWord.meaningLang`)
 * instead of always being read as English.
 */
export function toBedWords(
  words: readonly GardenTopicWord[],
  meanings: ReadonlyMap<string, { text: string; lang?: string }>,
  now: Date,
): { words: TopicBedWord[]; stageCounts: Record<BedStage, number> | null } {
  const hasSrs = words.every((word) => word.fsrs_state !== undefined);
  const today = dayNumber(isoDate(now));
  const rows = words.map((word) => {
    const studied = Boolean(word.fsrs_state) && word.fsrs_state !== 'New';
    const dueAt = word.next_due_at ? new Date(word.next_due_at) : null;
    const stage: BedStage = word.fsrs_state
      ? (stageFromSrs(word.fsrs_state, word.mastered_at, false) as BedStage)
      : 'seed';
    const due: TopicBedWord['due'] =
      !studied || !dueAt
        ? { tone: 'new' }
        : dueAt.getTime() <= now.getTime()
          ? { tone: 'now' }
          : { tone: 'later', days: Math.max(1, dayNumber(isoDate(dueAt)) - today) };
    const meaningEntry = meanings.get(word.id);
    const bedWord: TopicBedWord = {
      id: word.id,
      word: word.source_word,
      meaning: meaningEntry?.text ?? word.custom_note ?? '',
      meaningLang: meaningEntry?.lang,
      stage,
      wilting: word.is_leech === true,
      due,
    };
    return { bedWord, dueAt: dueAt?.getTime() ?? null };
  });
  const rank = ({ bedWord }: (typeof rows)[number]) =>
    bedWord.due.tone === 'now' ? (bedWord.wilting ? 0 : 1) : bedWord.due.tone === 'new' ? 2 : 3;
  const sorted = rows
    .map((row, index) => ({ row, index }))
    .sort(
      (a, b) =>
        rank(a.row) - rank(b.row) ||
        (a.row.dueAt ?? 0) - (b.row.dueAt ?? 0) ||
        a.index - b.index,
    )
    .map(({ row }) => row.bedWord);
  if (!hasSrs) return { words: sorted, stageCounts: null };
  const stageCounts: Record<BedStage, number> = { seed: 0, sprout: 0, flower: 0, tree: 0 };
  for (const word of sorted) stageCounts[word.stage] += 1;
  return { words: sorted, stageCounts };
}

/**
 * UI-6 (U6-6): A4's harvest from `GET /missions/week` (the trailing 7 local
 * days). `days` are the calendar week's days (format.ts `weekDays`, UTC
 * midnights); a day the API didn't return (future days) has no missions.
 * Done/total count missions (3 a day). No seed pack yet.
 */
export function weekHarvest(
  week: readonly MissionDay[],
  days: readonly Date[],
  today: Date,
): NonNullable<WeeklyHarvestScreenProps['harvest']> {
  const byDate = new Map(week.map((d) => [d.date, d]));
  const todayIso = today.toISOString().slice(0, 10);
  const rows = days.map((day) => {
    const iso = day.toISOString().slice(0, 10);
    const done = Math.min(Math.max(0, byDate.get(iso)?.done ?? 0), 3) as 0 | 1 | 2 | 3;
    return { day, missions: done, ...(iso === todayIso ? { today: true } : {}) };
  });
  return {
    done: rows.reduce((sum, r) => sum + r.missions, 0),
    total: days.length * 3,
    days: rows,
    seedPack: null,
  };
}

/**
 * UI-6 (U6-6): A5's "streak is safe" card from `GET /srs/stats` `freezes`:
 * shown only when freezes covered missed days this week and the streak is
 * still alive (U6-3 counts frozen days as kept). Null otherwise, or against
 * an older backend without `freezes`.
 */
export function freezeStreak(stats: SrsStats): WelcomeBackScreenProps['streak'] {
  const f = stats.freezes;
  if (!f || f.used_this_week <= 0 || stats.current_streak_days <= 0) return null;
  return {
    days: stats.current_streak_days,
    covered: f.used_this_week,
    left: f.available,
    refills: new Date(`${f.refills_on}T00:00:00Z`),
  };
}

/**
 * UI-6 (U6-7): A8's garden calendar — 16 Monday-first week columns ending
 * with this week; a day's level is the missions done that day (0–3) from
 * `GET /missions/week`, days still to come are null. Missions only exist
 * since U6 (2026-10-01) and the endpoint covers the trailing 7 days, so
 * older days show 0.
 */
export function meCalendar(
  week: readonly MissionDay[],
  today: Date,
  weeks = 16,
): (CalendarLevel | null)[][] {
  const byDate = new Map(week.map((d) => [d.date, d.done]));
  const todayIso = isoDate(today);
  const thisMonday = weekOf(today)[0];
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const day = new Date(thisMonday);
      day.setDate(thisMonday.getDate() - (weeks - 1 - w) * 7 + d);
      const iso = isoDate(day);
      if (iso > todayIso) return null;
      return Math.min(Math.max(0, byDate.get(iso) ?? 0), 3) as CalendarLevel;
    }),
  );
}

/**
 * UI-6 (U6-7): A8's keepsakes from `GET /me/keepsakes` — the earned ones
 * (latest last) and the closest next streak / Golden Bloom keepsake, at
 * most `slots` (the 4-column row).
 */
export function meKeepsakes(keepsakes: MyKeepsakes, slots = 4): KeepsakeItem[] {
  const next = keepsakes.next
    .filter((n) => n.kind !== 'FIRST_HARVEST' && n.target > 0)
    .sort((a, b) => b.progress / b.target - a.progress / a.target)[0];
  const nextItem: KeepsakeItem[] = next
    ? [
        {
          type: next.kind === 'STREAK' ? 'nextStreak' : 'nextBlooms',
          current: Math.min(next.progress, next.target),
          target: next.target,
        },
      ]
    : [];
  const earned = keepsakes.earned.map((k): KeepsakeItem =>
    k.kind === 'FIRST_HARVEST'
      ? { type: 'firstHarvest' }
      : k.kind === 'STREAK'
        ? { type: 'streak', days: k.value }
        : { type: 'blooms', count: k.value },
  );
  return [...earned.slice(Math.max(0, earned.length - (slots - nextItem.length))), ...nextItem];
}

/** SE5 shows at most this many rows. */
export const HARVEST_ROWS = 3;

/**
 * SE5 "Ready to harvest" from the bed's words (their SRS stages) and
 * `GET /speaking/harvest`: the ripe words (Flower, not wilting) that have
 * a speaking item and aren't harvested yet, after the ones harvested today
 * (shown as "Picked"). Words harvested before today drop off. `count` =
 * all of them, the rows stop at HARVEST_ROWS. Null when there's nothing.
 */
export function harvestCard(
  words: readonly TopicBedWord[],
  harvests: readonly SpeakingHarvestWord[] | undefined,
  today: string,
  hrefFor: (topicWordId: string) => string,
): { count: number; words: HarvestWord[] } | null {
  if (!harvests) return null;
  const byWord = new Map(harvests.map((h) => [h.topic_word_id, h]));
  const picked: HarvestWord[] = [];
  const ripe: HarvestWord[] = [];
  for (const word of words) {
    const h = byWord.get(word.id);
    if (!h || word.stage !== 'flower' || word.wilting) continue;
    const row = {
      id: word.id,
      word: word.word,
      meaning: word.meaning,
      meaningLang: word.meaningLang,
      href: hrefFor(word.id),
    };
    if (h.harvested_score === null) ripe.push({ ...row, picked: null });
    else if (toLocalDateString(new Date(h.harvested_at ?? 0)) === today)
      picked.push({ ...row, picked: h.harvested_score });
  }
  const all = [...picked, ...ripe];
  return all.length > 0 ? { count: all.length, words: all.slice(0, HARVEST_ROWS) } : null;
}
