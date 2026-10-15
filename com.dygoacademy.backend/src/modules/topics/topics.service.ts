import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';

export interface TopicSummary {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  word_count: string;
  /**
   * Count of this topic's words with `user_word_srs.mastered_at is not null` (Phase 10 sticky FSRS mastery, previously `repetitions >= 4`) for
   * the caller -- same threshold `computeSrsSummary` (srs.service.ts)
   * already uses for `mastered_words`, reused rather than a second
   * definition of "mastered" (Phase 3 Module 19, FR-19.1).
   */
  mastered_count: string;
  /**
   * Count of this topic's words currently flagged `user_word_srs.is_leech`
   * for the caller -- Phase 9's "Topics as Collections" mockup subtext
   * ("21 words · 3 focus words"), added 2026-09-21. Same `is_leech` flag
   * `SrsService.findLeeches` already reads for the global Focus/Leech
   * list, just aggregated per topic here instead of returned as rows --
   * one more `filter` on the exact same `uws` join `mastered_count`
   * above already uses, not a new join.
   */
  focus_word_count: string;
  /**
   * Word Garden A6 (Phase 12 UI-5, 2026-09-26): the caller's words in this
   * topic by plant stage, on the same `uws` join. A word is a tree once
   * mastered (`mastered_count`, sticky), otherwise its FSRS state picks the
   * stage: never reviewed / New = seed, Learning / Relearning = sprout,
   * Review = flower. Seeds count READY words only (an ENRICHING word isn't
   * studyable yet). Leeches are still counted in their stage; the garden
   * shows them separately through `focus_word_count`.
   */
  seed_count: string;
  sprout_count: string;
  flower_count: string;
  /**
   * Reviewed words due now (`next_due_at <= now()`), the "6 due" badge.
   * Never-reviewed words are not counted here (they're seeds, "New").
   */
  due_count: string;
  /** Lowest and highest CEFR level among the topic's words; null if none is known. */
  min_level: string | null;
  max_level: string | null;
  /**
   * Whose bed this is, for the garden's filter chips: `mine` (a group the
   * caller owns), `group` (a group the caller belongs to but doesn't own),
   * `library` (a public topic from a group the caller isn't in).
   */
  kind: 'mine' | 'group' | 'library';
  /** The caller's My words bed (20261015_my_words.sql), where words from beds they can't edit are saved. */
  is_my_words: boolean;
  /** For `library` topics, the owning group's name (e.g. "IELTS Academic") when visible. */
  collection_title: string | null;
  created_at: Date;
}

export interface TopicRow {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  created_at: Date;
}

export interface TopicWordRow {
  id: string;
  source_word: string;
  language_code: string;
  status: 'ENRICHING' | 'READY' | 'FAILED';
  custom_note: string | null;
  failure_reason: string | null;
  created_at: Date;
  /**
   * Word Garden A7 (Phase 12 UI-5 U5-1, 2026-09-27): the caller's own
   * scheduling state for this word, from `user_word_srs`. All four are null
   * when the caller has never studied the word (no SRS row), so the garden
   * shows it as a seed. Never another learner's state: the join is on the
   * caller's id and `user_word_srs_all_own` is owner-only anyway.
   */
  fsrs_state: 'New' | 'Learning' | 'Review' | 'Relearning' | null;
  mastered_at: Date | null;
  is_leech: boolean | null;
  next_due_at: Date | null;
}

export interface TopicDetail extends TopicRow {
  words: TopicWordRow[];
}

/** Postgres error codes this service translates into HTTP responses. */
const PG_ROW_LEVEL_SECURITY_VIOLATION = '42501';

/** Module 1 — Collaborative groups, topics & RBAC (Phase 1). */
@Injectable()
export class TopicsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Topics visible to this user.
   *
   * Note the absence of any tenant or membership filter in the SQL: none is
   * needed. `queryAs` runs the statement as `authenticated` with the caller's
   * JWT claims set, so the policies in 002_rls_policies.sql do the filtering
   * inside PostgreSQL. Adding a WHERE clause here would duplicate that logic
   * and create a second place for it to be wrong.
   *
   * `mastered_count` added 2026-09-20 (Phase 3 Module 19, FR-19.1) via a
   * second left join to `user_word_srs` -- no explicit `user_id` predicate
   * needed on it, same reasoning as everywhere else in this file: `queryAs`
   * runs this RLS-scoped, and `user_word_srs_all_own` already narrows that
   * join to the caller's own rows. `distinct` on both counts: the two-way
   * join (topic_words x user_word_srs) can multiply a topic's row count if
   * a word has an SRS row, which in practice it's always at most one of,
   * but `count(tw.id)` un-distinct would silently overcount `word_count`
   * once a second join is in the query, so both counts are guarded rather
   * than relying on that 1:1 assumption holding forever. `focus_word_count`
   * (2026-09-21) is a third `count(distinct ...) filter` on that same
   * `uws` join, guarded the same way.
   */
  async findAllVisible(userId: string): Promise<TopicSummary[]> {
    // Phase 12 UI-5 (Word Garden A6): stage / due counts, CEFR range and
    // the bed's kind. Still no tenant filter: `groups` and `group_members`
    // are RLS-scoped like everything else, and the caller-specific joins
    // are join conditions on $1 (the caller), not a WHERE clause.
    return this.db.queryAs<TopicSummary>(
      userId,
      `select t.id,
              t.group_id,
              t.title,
              t.description,
              t.is_public,
              t.is_my_words and g.owner_id = $1 as is_my_words,
              count(distinct tw.id) as word_count,
              count(distinct uws.topic_word_id) filter (where uws.mastered_at is not null) as mastered_count,
              count(distinct uws.topic_word_id) filter (where uws.is_leech) as focus_word_count,
              count(distinct tw.id) filter (
                where tw.status = 'READY' and uws.mastered_at is null
                  and (uws.id is null or uws.fsrs_state = 'New')
              ) as seed_count,
              count(distinct uws.topic_word_id) filter (
                where uws.mastered_at is null and uws.fsrs_state in ('Learning', 'Relearning')
              ) as sprout_count,
              count(distinct uws.topic_word_id) filter (
                where uws.mastered_at is null and uws.fsrs_state = 'Review'
              ) as flower_count,
              count(distinct uws.topic_word_id) filter (where uws.next_due_at <= now()) as due_count,
              min(ml.cefr_level)::text as min_level,
              max(ml.cefr_level)::text as max_level,
              case
                when g.owner_id = $1 then 'mine'
                when bool_or(me.user_id is not null) then 'group'
                when t.is_public then 'library'
                else 'group'
              end as kind,
              case
                when g.owner_id is distinct from $1 and not bool_or(me.user_id is not null) and t.is_public
                then g.name
              end as collection_title,
              t.created_at
         from public.topics t
         left join public.groups g on g.id = t.group_id
         left join public.group_members me on me.group_id = t.group_id and me.user_id = $1
         left join public.topic_words tw on tw.topic_id = t.id
         left join public.master_lexicon ml on ml.id = tw.lexicon_id
         left join public.user_word_srs uws on uws.topic_word_id = tw.id
        group by t.id, g.id
        order by t.created_at desc`,
      [userId],
    );
  }

  /**
   * `topics_insert_write` (002_rls_policies.sql) requires
   * `has_group_role(group_id, 'WRITE')`, checked entirely by Postgres — a
   * caller without WRITE on `dto.groupId` gets a 403 from the INSERT itself
   * (`with check` failure raises, unlike UPDATE/DELETE's silent row
   * filtering — see update()/remove() below for that distinction).
   *
   * Without a `groupId` the bed goes in the caller's personal group, which
   * `my_personal_group_id()` creates if it's missing, so a learner with no
   * shared group can still make beds. Resolved in its own statement first
   * so the INSERT's RLS check sees the owner's ADMIN row.
   */
  async create(userId: string, dto: CreateTopicDto): Promise<TopicRow> {
    const groupId = dto.groupId ?? (await this.personalGroupId(userId));
    try {
      const rows = await this.db.queryAs<TopicRow>(
        userId,
        `insert into public.topics (group_id, title, description, is_public)
         values ($1, $2, $3, $4)
         returning id, group_id, title, description, is_public, created_at`,
        [groupId, dto.title.trim(), dto.description ?? null, dto.isPublic ?? false],
      );
      return rows[0];
    } catch (err) {
      throw this.translateWriteError(err);
    }
  }

  /**
   * Detail with words (FR-1.1). Two RLS-scoped queries, not a join: the
   * topic itself is gated by `topics_select`, its words by
   * `topic_words_select` (via `can_read_topic`) — the same two policies
   * that already govern `findAllVisible` and `WordsService.ingest`, kept
   * separate here rather than joined so either query can 0-row out to a
   * clean 404 without the other's shape leaking through.
   */
  async findById(userId: string, topicId: string): Promise<TopicDetail> {
    const topicRows = await this.db.queryAs<TopicRow>(
      userId,
      `select id, group_id, title, description, is_public, created_at
         from public.topics
        where id = $1`,
      [topicId],
    );
    if (topicRows.length === 0) {
      throw new NotFoundException('Topic not found.');
    }

    // Newest word first -- live-requested 2026-09-08 ("sort the topics
    // listing, new word will be show in the top"). Was `asc` (oldest
    // first), so a word just added via AddWordModal landed at the bottom
    // of WordStatusRow's list, off-screen on a topic with any real amount
    // of content -- `desc` puts what the caller just added right where
    // they're already looking.
    //
    // Phase 12 UI-5 U5-1: the caller's per-word SRS state rides along on a
    // left join to `user_word_srs`, the same RLS-scoped join the counts in
    // findAllVisible use. The extra `uws.user_id = $2` join condition is
    // belt and braces on top of `user_word_srs_all_own`: even if this ever
    // ran outside RLS it could only pick up the caller's own row, and
    // (user_id, topic_word_id) is unique, so the join can't multiply words.
    const words = await this.db.queryAs<TopicWordRow>(
      userId,
      `select tw.id, tw.source_word, tw.language_code, tw.status, tw.custom_note,
              tw.failure_reason, tw.created_at,
              uws.fsrs_state::text as fsrs_state,
              uws.mastered_at,
              uws.is_leech,
              uws.next_due_at
         from public.topic_words tw
         left join public.user_word_srs uws
           on uws.topic_word_id = tw.id and uws.user_id = $2
        where tw.topic_id = $1
        order by tw.created_at desc`,
      [topicId, userId],
    );

    return { ...topicRows[0], words };
  }

  /**
   * `topics_update_write` requires WRITE (FR-1.2). Unlike create()'s
   * INSERT, a caller lacking WRITE simply matches zero rows here — RLS's
   * `using` clause filters the row out of the UPDATE's target set rather
   * than raising, so this and a genuinely missing topic id are
   * indistinguishable, and deliberately return the same 404 (see
   * GroupsService.update for the same reasoning).
   */
  async update(userId: string, topicId: string, dto: UpdateTopicDto): Promise<TopicRow> {
    const rows = await this.db.queryAs<TopicRow>(
      userId,
      `update public.topics
          set title       = coalesce($2, title),
              description = coalesce($3, description),
              is_public   = coalesce($4, is_public),
              updated_at  = now()
        where id = $1
        returning id, group_id, title, description, is_public, created_at`,
      [topicId, dto.title?.trim() ?? null, dto.description ?? null, dto.isPublic ?? null],
    );
    if (rows.length === 0) {
      throw new NotFoundException('Topic not found.');
    }
    return rows[0];
  }

  /**
   * ADMIN-only, via `topics_delete_admin` — tech spec §4.1 is explicit that
   * WRITE "cannot delete a topic", unlike create/update which only need
   * WRITE. Same zero-rows-means-404 reasoning as update().
   */
  async remove(userId: string, topicId: string): Promise<void> {
    const rows = await this.db.queryAs<{ id: string }>(
      userId,
      `delete from public.topics where id = $1 returning id`,
      [topicId],
    );
    if (rows.length === 0) {
      throw new NotFoundException('Topic not found.');
    }
  }

  /**
   * Clones a *public* topic's words into a new, private-by-default topic
   * under `targetGroupId` (FR-1.1: "public topics are searchable,
   * cloneable"). Deliberately checks `is_public = true` explicitly rather
   * than relying on `topics_select`'s broader "public OR readable via my
   * group" visibility: a topic that is merely readable because the caller
   * has READ in its group is not the same thing the requirement calls
   * cloneable, and RLS alone can't tell those two apart for this purpose.
   *
   * Runs as one transaction via `withUser` (not `queryAs`, which is
   * single-statement) so the new topic and its copied words either both
   * land or neither does. `topic_words_insert_write` on the *new* row needs
   * WRITE on `targetGroupId` — the same permission `topics_insert_write`
   * already required to create the topic itself, so no separate check is
   * needed here beyond letting both INSERTs run under RLS.
   *
   * `custom_note` is intentionally not copied — it is the original owner's
   * private annotation, not part of the topic's shared content.
   * `lexicon_id` IS copied: reusing an already-resolved lexicon entry is
   * exactly the point of `master_lexicon` (FR-2.2's dedup cache) — a clone
   * should not re-trigger Gemini/TTS for words already enriched once.
   */
  async clone(userId: string, sourceTopicId: string, targetGroupId: string): Promise<TopicRow> {
    return this.db.withUser(userId, async (client) => {
      const sourceRows = await client.query<Pick<TopicRow, 'title' | 'description'>>(
        `select title, description from public.topics where id = $1 and is_public = true`,
        [sourceTopicId],
      );
      if (sourceRows.rows.length === 0) {
        throw new NotFoundException('Public topic not found.');
      }
      const source = sourceRows.rows[0];

      let newTopicRows;
      try {
        newTopicRows = await client.query<TopicRow>(
          `insert into public.topics (group_id, title, description, is_public)
           values ($1, $2, $3, false)
           returning id, group_id, title, description, is_public, created_at`,
          [targetGroupId, source.title, source.description],
        );
      } catch (err) {
        throw this.translateWriteError(err);
      }
      const newTopic = newTopicRows.rows[0];

      await client.query(
        `insert into public.topic_words
           (topic_id, lexicon_id, source_word, language_code, status, added_by)
         select $1, lexicon_id, source_word, language_code, status, $2
           from public.topic_words
          where topic_id = $3`,
        [newTopic.id, userId, sourceTopicId],
      );

      return newTopic;
    });
  }

  private async personalGroupId(userId: string): Promise<string> {
    const rows = await this.db.queryAs<{ id: string | null }>(
      userId,
      `select public.my_personal_group_id() as id`,
    );
    if (!rows[0]?.id) {
      throw new NotFoundException('Profile not found.');
    }
    return rows[0].id;
  }

  private translateWriteError(err: unknown): Error {
    const pgErr = err as { code?: string; message?: string };

    if (pgErr?.code === PG_ROW_LEVEL_SECURITY_VIOLATION) {
      return new ForbiddenException('WRITE role on this group is required.');
    }
    return err instanceof Error ? err : new Error(String(err));
  }
}
