import { ForbiddenException, GoneException, Injectable, NotFoundException } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import type { GroupRole } from './groups.service';

/**
 * UI-G (phase 12 implementation plan.md) — the reads behind the garden's
 * group screens. Aggregates only (plan decision 10, FR-1.2): nothing here
 * returns another learner's word-level progress, or who did what.
 *
 * - Counts across the whole group (gardeners, words, how many watered
 *   today, ripe plants, tricky words) come from the SECURITY DEFINER
 *   functions in `migrations/20260926_group_garden.sql`, which re-check
 *   membership themselves and return numbers only.
 * - Everything about *you* (your due words, your stage counts per shared
 *   bed) is a plain query under your own RLS: `user_word_srs` is
 *   owner-only, so it can't count anyone else's rows.
 *
 * All of these run through `queryAs` (the caller's JWT, RLS on).
 */

/** GR1: one row per garden the caller is in. */
export interface GroupGardenCounts {
  group_id: string;
  member_count: number;
  bed_count: number;
  word_count: number;
  /** The caller's own due words in this group's beds. */
  my_due_count: number;
}

/** GR2: one shared bed, with the caller's own numbers. */
export interface GardenBed {
  topic_id: string;
  title: string;
  word_count: number;
  /** The caller's due words in this bed. */
  due_count: number;
  /** The caller's words per garden stage (a word they haven't started is a seed). */
  seed_count: number;
  sprout_count: number;
  flower_count: number;
  tree_count: number;
}

/** GR2: the group garden. */
export interface GroupGarden {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  role: GroupRole;
  member_count: number;
  bed_count: number;
  word_count: number;
  /** Gardeners who reviewed a group word since the start of the caller's day. */
  watered_today: number;
  /** (gardener, word) plants that are mastered, across the group. */
  ripe_plants: number;
  /** member_count × word_count: every plant the group could grow. */
  total_plants: number;
  my_due_count: number;
  /** Sorted by the caller's due words, then title. */
  beds: GardenBed[];
}

/** GR3: a word the group missed, as totals. */
export interface TrickyPatch {
  topic_word_id: string;
  source_word: string;
  misses: number;
  gardeners: number;
}

/** GR6: what an invite leads to, before joining. No member data. */
export interface InvitePreview {
  group_id: string;
  group_name: string;
  group_description: string | null;
  inviter_name: string | null;
  grant_role: GroupRole;
  member_count: number;
  bed_count: number;
  word_count: number;
  already_member: boolean;
}

const PG_INVITE_NOT_FOUND = 'P0002';
const PG_INVITE_NO_LONGER_VALID = '22023';

export const TRICKY_DEFAULT_DAYS = 7;
export const TRICKY_DEFAULT_LIMIT = 5;

/** An IANA zone the runtime knows (e.g. "Asia/Ho_Chi_Minh"); anything else is UTC. */
export function safeTimeZone(tz: string | null | undefined): string {
  if (!tz || tz.length > 64) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}

function clampInt(value: string | number | undefined, fallback: number, min: number, max: number) {
  const n = typeof value === 'number' ? value : Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

const num = (value: string | number | null | undefined) => Number(value ?? 0);

@Injectable()
export class GroupGardenService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * GR1: size of every garden the caller is in, and their own due words in
   * each. `group_garden_counts` is SECURITY DEFINER (a READ member can't
   * count the roster under RLS); the due count is the caller's own rows.
   */
  async countsForMine(userId: string): Promise<GroupGardenCounts[]> {
    const rows = await this.db.queryAs<Record<string, string | number>>(
      userId,
      `select g.id as group_id,
              c.member_count,
              c.bed_count,
              c.word_count,
              (select count(*)
                 from public.user_word_srs s
                 join public.topic_words tw on tw.id = s.topic_word_id
                 join public.topics t on t.id = tw.topic_id
                where s.user_id = $1
                  and t.group_id = g.id
                  and s.next_due_at <= now()) as my_due_count
         from public.groups g
         join public.group_members gm on gm.group_id = g.id and gm.user_id = $1
        cross join lateral public.group_garden_counts(g.id) c
        order by g.created_at desc`,
      [userId],
    );
    return rows.map((row) => ({
      group_id: String(row.group_id),
      member_count: num(row.member_count),
      bed_count: num(row.bed_count),
      word_count: num(row.word_count),
      my_due_count: num(row.my_due_count),
    }));
  }

  /**
   * GR2: one group garden. 404 when the caller isn't a member (same answer
   * for "doesn't exist", so a private group's existence isn't confirmed).
   * "Today" starts at midnight in `tz` (the learner's zone; UTC if unknown).
   */
  async garden(userId: string, groupId: string, tz?: string): Promise<GroupGarden> {
    const zone = safeTimeZone(tz);
    return this.db.withUser(userId, async (client) => {
      const head = await client.query<Record<string, string | boolean | null>>(
        `select g.id, g.name, g.description, g.is_public, gm.role,
                c.member_count, c.bed_count, c.word_count
           from public.groups g
           join public.group_members gm on gm.group_id = g.id and gm.user_id = $2
          cross join lateral public.group_garden_counts(g.id) c
          where g.id = $1`,
        [groupId, userId],
      );
      if (head.rows.length === 0) {
        throw new NotFoundException('Group not found.');
      }
      const group = head.rows[0];

      const activity = await client.query<{ watered_count: string; ripe_count: string }>(
        `select watered_count, ripe_count
           from public.group_garden_activity($1, (date_trunc('day', now() at time zone $2) at time zone $2))`,
        [groupId, zone],
      );

      const beds = await client.query<Record<string, string>>(
        `select t.id as topic_id,
                t.title,
                count(tw.id) as word_count,
                count(tw.id) filter (where s.id is not null and s.next_due_at <= now()) as due_count,
                count(tw.id) filter (where s.id is null or (s.fsrs_state = 'New' and s.mastered_at is null)) as seed_count,
                count(tw.id) filter (where s.fsrs_state in ('Learning', 'Relearning') and s.mastered_at is null) as sprout_count,
                count(tw.id) filter (where s.fsrs_state = 'Review' and s.mastered_at is null) as flower_count,
                count(tw.id) filter (where s.mastered_at is not null) as tree_count
           from public.topics t
           left join public.topic_words tw on tw.topic_id = t.id
           left join public.user_word_srs s on s.topic_word_id = tw.id and s.user_id = $2
          where t.group_id = $1
          group by t.id, t.title
          order by due_count desc, t.title`,
        [groupId, userId],
      );

      const memberCount = num(group.member_count as string);
      const wordCount = num(group.word_count as string);
      const bedRows: GardenBed[] = beds.rows.map((row) => ({
        topic_id: row.topic_id,
        title: row.title,
        word_count: num(row.word_count),
        due_count: num(row.due_count),
        seed_count: num(row.seed_count),
        sprout_count: num(row.sprout_count),
        flower_count: num(row.flower_count),
        tree_count: num(row.tree_count),
      }));

      return {
        id: String(group.id),
        name: String(group.name),
        description: (group.description as string | null) ?? null,
        is_public: Boolean(group.is_public),
        role: group.role as GroupRole,
        member_count: memberCount,
        bed_count: num(group.bed_count as string),
        word_count: wordCount,
        watered_today: num(activity.rows[0]?.watered_count),
        ripe_plants: num(activity.rows[0]?.ripe_count),
        total_plants: memberCount * wordCount,
        my_due_count: bedRows.reduce((sum, bed) => sum + bed.due_count, 0),
        beds: bedRows,
      };
    });
  }

  /**
   * GR3: the words the group missed most in the last `days` days, with how
   * many gardeners missed each. ADMIN only: checked here for a clean 403,
   * and again inside `group_tricky_patches`.
   */
  async trickyPatches(
    userId: string,
    groupId: string,
    days?: string | number,
    limit?: string | number,
  ): Promise<TrickyPatch[]> {
    const [{ allowed }] = await this.db.queryAs<{ allowed: boolean }>(
      userId,
      `select public.has_group_role($1, 'ADMIN') as allowed`,
      [groupId],
    );
    if (!allowed) {
      throw new ForbiddenException('Only a group ADMIN can see tricky patches.');
    }
    const windowDays = clampInt(days, TRICKY_DEFAULT_DAYS, 1, 90);
    const rows = await this.db.queryAs<Record<string, string>>(
      userId,
      `select topic_word_id, source_word, misses, gardeners
         from public.group_tricky_patches($1, now() - make_interval(days => $2), $3)`,
      [groupId, windowDays, clampInt(limit, TRICKY_DEFAULT_LIMIT, 1, 50)],
    );
    return rows.map((row) => ({
      topic_word_id: row.topic_word_id,
      source_word: row.source_word,
      misses: num(row.misses),
      gardeners: num(row.gardeners),
    }));
  }

  /** GR6: invite preview. 404 unknown token, 410 revoked / expired / used up. */
  async invitePreview(userId: string, token: string): Promise<InvitePreview> {
    try {
      const rows = await this.db.queryAs<Record<string, string | boolean | null>>(
        userId,
        `select group_id, group_name, group_description, inviter_name, grant_role,
                member_count, bed_count, word_count, already_member
           from public.group_invite_preview($1)`,
        [token],
      );
      const row = rows[0];
      if (!row) throw new NotFoundException('Invite not found.');
      return {
        group_id: String(row.group_id),
        group_name: String(row.group_name),
        group_description: (row.group_description as string | null) ?? null,
        inviter_name: (row.inviter_name as string | null) ?? null,
        grant_role: row.grant_role as GroupRole,
        member_count: num(row.member_count as string),
        bed_count: num(row.bed_count as string),
        word_count: num(row.word_count as string),
        already_member: Boolean(row.already_member),
      };
    } catch (err) {
      const pgErr = err as { code?: string; message?: string };
      if (pgErr?.code === PG_INVITE_NOT_FOUND) throw new NotFoundException('Invite not found.');
      if (pgErr?.code === PG_INVITE_NO_LONGER_VALID) {
        throw new GoneException(pgErr.message ?? 'This invite is no longer valid.');
      }
      throw err;
    }
  }
}
