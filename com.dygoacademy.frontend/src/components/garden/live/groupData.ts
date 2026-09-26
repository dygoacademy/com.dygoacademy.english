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

/** The link to share for a token: the classic /join path, which works for everyone. */
export function inviteUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, '')}/join/${token}`;
}

/** The link as the sheet shows it (no scheme), like the canvas. */
export function displayLink(url: string): string {
  return url.replace(/^https?:\/\//, '');
}
