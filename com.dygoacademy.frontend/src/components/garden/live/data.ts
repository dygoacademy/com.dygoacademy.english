/**
 * Pure helpers for the live garden routes (UI-fidelity 6). No React, no
 * fetching: the live components pass in what the existing hooks returned.
 */
import type { TopicSummary } from '@/types';
import { GARDEN_ROUTES } from '@/constants/garden';

import type { HeroPlant } from '../HeroGardenCard';
import type { TopicsScreenTopic } from '../screens/TopicsScreen';
import type { Greeting } from '../screens/TodaysGardenScreen';

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

/** A name to greet with from Supabase user metadata, or null. */
export function displayName(
  user: { user_metadata?: Record<string, unknown> | null } | null | undefined,
): string | null {
  const meta = user?.user_metadata ?? {};
  for (const key of ['display_name', 'full_name', 'name']) {
    const value = meta[key];
    if (typeof value === 'string' && value.trim()) return value.trim().split(/\s+/)[0];
  }
  return null;
}

/** The finished session, carried from /garden/review to /garden/review/done in the URL. */
export interface SessionResult {
  watered: number;
  recalled: number | null;
  minutes: number | null;
  word: string | null;
  more: number;
}

/** Reads the session result from /garden/review/done's search params. */
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
