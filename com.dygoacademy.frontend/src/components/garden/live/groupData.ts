/**
 * UI-G live helpers: turning API rows into the group screens' props.
 * Pure functions (unit-tested in groupData.test.ts).
 */
import type { GroupRosterMember } from '@/types';

import { avatarTone, initialOf, type GardenerTone } from '../GardenerAvatar';
import type { GroupTilePlant } from '../groupArt';

/** The name a gardener goes by: display name, else the part of the email before "@". */
export function gardenerName(member: Pick<GroupRosterMember, 'display_name' | 'email' | 'user_id'>): string {
  const display = member.display_name?.trim();
  if (display) return display;
  const local = member.email?.split('@')[0]?.trim();
  if (local) return local;
  return member.user_id.slice(0, 8);
}

export function gardenerAvatar(member: GroupRosterMember): { text: string; tone: GardenerTone } {
  return { text: initialOf(gardenerName(member)), tone: avatarTone(member.user_id) };
}

/**
 * Up to `max` avatars of the gardeners the caller can see (a Viewer sees
 * only themself), then "+N" for the rest when `withMore` (GR2).
 */
export function avatarRow(
  members: readonly GroupRosterMember[],
  total: number,
  { max = 4, withMore = false }: { max?: number; withMore?: boolean } = {},
): Array<{ text: string; tone: GardenerTone }> {
  const shown = members.slice(0, max).map(gardenerAvatar);
  const rest = Math.max(0, total - shown.length);
  return withMore && rest > 0 ? [...shown, { text: `+${rest}`, tone: 'more' }] : shown;
}

/** A garden's tile plant, from how much it grows (GR1): tree ≥ 100 words, flower ≥ 30. */
export function gardenPlant(words: number): GroupTilePlant {
  if (words >= 100) return 'tree';
  if (words >= 30) return 'flower';
  return 'sprout';
}

/** A bed's tile plant: the stage most of your words are in (seeds count as sprouts). */
export function bedPlant(bed: { tree_count: number; flower_count: number; sprout_count: number; seed_count: number }): GroupTilePlant {
  const sprout = bed.sprout_count + bed.seed_count;
  if (bed.tree_count >= bed.flower_count && bed.tree_count >= sprout && bed.tree_count > 0) return 'tree';
  if (bed.flower_count >= sprout && bed.flower_count > 0) return 'flower';
  return 'sprout';
}

const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

export function bedShares(bed: { word_count: number; tree_count: number; flower_count: number; sprout_count: number }) {
  return {
    tree: pct(bed.tree_count, bed.word_count),
    flower: pct(bed.flower_count, bed.word_count),
    sprout: pct(bed.sprout_count, bed.word_count),
  };
}

/** The invite token from a pasted link (".../join/<token>", with or without the scheme) or a bare token. */
export function tokenFromLink(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  const match = text.match(/\/join\/([A-Za-z0-9_-]+)/);
  if (match) return match[1];
  return /^[A-Za-z0-9_-]{16,}$/.test(text) ? text : null;
}

/** The link to share for a token: /join/<token> (the garden join page since UI-8 U8-5). */
export function inviteUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, '')}/join/${token}`;
}

/** The link as the sheet shows it (no scheme), like the canvas. */
export function displayLink(url: string): string {
  return url.replace(/^https?:\/\//, '');
}

/**
 * The shared bed a rain day's "Water" opens: the one with the most of the
 * caller's due words (ties: the first, which is the garden's own order).
 * Null when no bed has anything due.
 */
export function wettestBed<T extends { topic_id: string; due_count: number }>(beds: readonly T[]): string | null {
  let best: T | null = null;
  for (const bed of beds) {
    if (bed.due_count > 0 && (!best || bed.due_count > best.due_count)) best = bed;
  }
  return best?.topic_id ?? null;
}

/** GR1 shows one rain day: the first garden (in the list's order) with one running. */
export function firstRainDay<R extends { group_id: string; rainDay?: unknown }>(
  groupIds: readonly string[],
  counts: readonly R[],
): { groupId: string; rainDay: NonNullable<R['rainDay']> } | null {
  const byId = new Map(counts.map((row) => [row.group_id, row]));
  for (const id of groupIds) {
    const rainDay = byId.get(id)?.rainDay;
    if (rainDay) return { groupId: id, rainDay: rainDay as NonNullable<R['rainDay']> };
  }
  return null;
}

/**
 * When a rain day ends, as a wall-clock time in `timeZone`. `endsAt` is
 * the next midnight in the admin's zone, so one minute earlier gives the
 * canvas's "ends 11:59 PM" (in the viewer's own zone).
 */
export function rainDayEnds(endsAt: string, timeZone: string | undefined): { hour: number; minute: number } {
  const last = new Date(new Date(endsAt).getTime() - 60_000);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(last);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { hour: get('hour') % 24, minute: get('minute') };
}
