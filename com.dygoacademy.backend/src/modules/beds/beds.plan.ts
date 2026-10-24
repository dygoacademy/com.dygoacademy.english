/**
 * Seeds & Harvest Phase 1 (docs/plans/Seeds and Harvest implementation
 * plan.md): the 3 seed packets of S3 and a bed's level line. Pure, so it is
 * unit tested without a database; beds.service.ts reads the candidates.
 */

import { SEEDS_HARVEST } from './seeds-harvest.config';

export type PacketKind = (typeof SEEDS_HARVEST.packetKinds)[number];

/** A public bed the learner has never planted from (beds.service CANDIDATES). */
export interface PacketCandidate {
  topic_id: string;
  title: string;
  /** The library collection (the public group's name), e.g. "IELTS Academic". */
  collection: string;
  /** groups.library_shelf: academic | general | work | travel | null. */
  shelf: string | null;
  word_count: number;
  /** Words of the bed already in the learner's garden (same lexicon entry). */
  known_count: number;
  /** The middle half of its words' CEFR levels, e.g. B1 and B2; null when no word has one. */
  level_low: string | null;
  level_high: string | null;
  /** The title fits the learner's goal (the onboarding first-bed pattern). */
  fits_goal: boolean;
}

export interface PacketContext {
  /** The learner's level (profiles.cefr_level); B1 when unknown, as onboarding's Skip. */
  level: string | null;
  /** Shelves of the beds the learner has planted from (active, resting, harvested). */
  planted_shelves: ReadonlyArray<string | null>;
  /** Shelf of the bed the learner is leaving. */
  current_shelf: string | null;
}

export interface SeedPacket extends PacketCandidate {
  kind: PacketKind;
}

const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/**
 * The middle half of a bed's word levels, `levels` sorted easiest first:
 * the 25th and 75th percentile levels, so a few outliers don't widen it.
 */
export function middleHalf(levels: ReadonlyArray<string>): {
  level_low: string | null;
  level_high: string | null;
} {
  if (levels.length === 0) return { level_low: null, level_high: null };
  const n = levels.length;
  return {
    level_low: levels[Math.floor(n * 0.25)],
    level_high: levels[Math.max(0, Math.ceil(n * 0.75) - 1)],
  };
}

/** "B2", "B1–B2", or null. */
export function levelLabel(low: string | null, high: string | null): string | null {
  if (!low && !high) return null;
  if (!low || !high || low === high) return low ?? high;
  return `${low}–${high}`;
}

/** The candidate's level range includes `level` (a bed with no levels counts as any level). */
function atLevel(c: PacketCandidate, level: string): boolean {
  if (!c.level_low || !c.level_high) return true;
  const i = CEFR.indexOf(level);
  return CEFR.indexOf(c.level_low) <= i && i <= CEFR.indexOf(c.level_high);
}

/** Bigger beds first, then by title for a stable order. */
const bySize = (a: PacketCandidate, b: PacketCandidate) =>
  b.word_count - a.word_count || a.title.localeCompare(b.title);

/**
 * S3's packets, in its order: Follow the bee (most words already growing,
 * at least 1), Same goal (a bed whose title fits the goal, else one on the
 * shelf of the bed being left), Something new (a shelf with no planted bed,
 * at the learner's level; else any shelf with no planted bed; else any bed).
 * One bed per packet, always 3 while the library has beds: an empty slot
 * is filled from the other rules.
 */
export function pickPackets(
  candidates: ReadonlyArray<PacketCandidate>,
  ctx: PacketContext,
): SeedPacket[] {
  const pool = candidates.filter((c) => c.word_count > 0);
  const taken = new Set<string>();
  const out: SeedPacket[] = [];
  const take = (kind: PacketKind, list: PacketCandidate[]) => {
    const pick = list.find((c) => !taken.has(c.topic_id));
    if (!pick) return false;
    taken.add(pick.topic_id);
    out.push({ ...pick, kind });
    return true;
  };

  const bee = pool
    .filter((c) => c.known_count > 0)
    .sort((a, b) => b.known_count - a.known_count || bySize(a, b));

  const goal = pool.filter((c) => c.fits_goal).sort(bySize);
  const sameShelf = ctx.current_shelf
    ? pool.filter((c) => c.shelf === ctx.current_shelf).sort(bySize)
    : [];
  const goalList = [...goal, ...sameShelf];

  const level = ctx.level ?? 'B1';
  const planted = new Set(ctx.planted_shelves.filter((s): s is string => !!s));
  const freshShelf = pool.filter((c) => c.shelf && !planted.has(c.shelf)).sort(bySize);
  const newList = [
    ...freshShelf.filter((c) => atLevel(c, level)),
    ...freshShelf,
    ...[...pool].sort(bySize),
  ];

  const lists: Array<[PacketKind, PacketCandidate[]]> = [
    ['bee', bee],
    ['goal', goalList],
    ['new', newList],
  ];
  for (const [kind, list] of lists) take(kind, list);
  // Always 3 (plan): a slot its own rule couldn't fill takes the next best
  // bed of the other rules, labelled by the rule that picked it.
  for (const [kind, list] of lists) {
    while (out.length < SEEDS_HARVEST.packetKinds.length && take(kind, list));
  }

  const order: readonly PacketKind[] = SEEDS_HARVEST.packetKinds;
  return out
    .map((p, i) => ({ p, i }))
    .sort((a, b) => order.indexOf(a.p.kind) - order.indexOf(b.p.kind) || a.i - b.i)
    .map(({ p }) => p);
}
