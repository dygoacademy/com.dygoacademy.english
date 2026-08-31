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
  created_at: Date;
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
   */
  async findAllVisible(userId: string): Promise<TopicSummary[]> {
    return this.db.queryAs<TopicSummary>(
      userId,
      `select t.id,
              t.group_id,
              t.title,
              t.description,
              t.is_public,
              count(tw.id) as word_count,
              t.created_at
         from public.topics t
         left join public.topic_words tw on tw.topic_id = t.id
        group by t.id
        order by t.created_at desc`,
    );
  }

  /**
   * `topics_insert_write` (002_rls_policies.sql) requires
   * `has_group_role(group_id, 'WRITE')`, checked entirely by Postgres — a
   * caller without WRITE on `dto.groupId` gets a 403 from the INSERT itself
   * (`with check` failure raises, unlike UPDATE/DELETE's silent row
   * filtering — see update()/remove() below for that distinction).
   */
  async create(userId: string, dto: CreateTopicDto): Promise<TopicRow> {
    try {
      const rows = await this.db.queryAs<TopicRow>(
        userId,
        `insert into public.topics (group_id, title, description, is_public)
         values ($1, $2, $3, $4)
         returning id, group_id, title, description, is_public, created_at`,
        [dto.groupId, dto.title.trim(), dto.description ?? null, dto.isPublic ?? false],
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

    const words = await this.db.queryAs<TopicWordRow>(
      userId,
      `select id, source_word, language_code, status, custom_note, created_at
         from public.topic_words
        where topic_id = $1
        order by created_at asc`,
      [topicId],
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

  private translateWriteError(err: unknown): Error {
    const pgErr = err as { code?: string; message?: string };

    if (pgErr?.code === PG_ROW_LEVEL_SECURITY_VIOLATION) {
      return new ForbiddenException('WRITE role on this group is required.');
    }
    return err instanceof Error ? err : new Error(String(err));
  }
}
