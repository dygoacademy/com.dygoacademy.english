import { Injectable, NotFoundException } from '@nestjs/common';
import { PoolClient } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { resolveUserTimezone } from '../srs/srs.service';
import { StorageService } from '../../storage/storage.service';
import { CreateSpeakingAttemptDto } from './dto/create-attempt.dto';
import {
  SPEAKING_LOOKUP_MAX,
  SPEAKING_SESSION_SIZE,
  SpeakingAccent,
  SpeakingAttempt,
  SpeakingSession,
  SpeakingSessionItem,
  SpeakingTimings,
  SpeakingWordItem,
  SpeakingWordLookup,
} from './speaking.types';

/** Any 8-4-4-4-12 hex id (seed ids aren't RFC-version UUIDs, so no version check). */
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ItemRow extends Omit<SpeakingSessionItem, 'audio_uk_url' | 'audio_us_url'> {
  audio_uk_path: string | null;
  audio_us_path: string | null;
  timings_uk: SpeakingTimings | null;
  timings_us: SpeakingTimings | null;
}

/** Item columns; expects aliases `w` (word: topic_word_id, is_due), `si`, `ml`, `wt`. */
const ITEM_COLUMNS = `
  si.id, si.lexicon_id, w.topic_word_id, ml.normalized_word as word, ml.part_of_speech,
  ml.cefr_level::text as cefr_level, ml.ipa_uk, ml.ipa_us, ml.definition_en,
  wt.locale as meaning_locale, wt.meaning as meaning_translation,
  si.sentence, si.target_index,
  si.audio_uk_path, si.audio_us_path, si.timings_uk, si.timings_us,
  w.is_due
`;

const MEANING_TRANSLATION_JOIN = `
  left join public.word_translations wt
         on wt.word_id = ml.id
        and wt.locale = (select p.meaning_locale from public.profiles p where p.id = auth.uid())
`;

/**
 * The learner's words that have a speaking item, one row per word (a word
 * in two beds counts once). Same scope as Review's new cards
 * (`SrsService.findDue`): every READY word the learner can read; RLS on
 * topic_words and user_word_srs does the filtering (master rule 1).
 * $1 = optional topic id.
 */
const LEARNER_WORDS = `
  with words as (
    select distinct on (tw.lexicon_id)
           tw.id as topic_word_id, tw.lexicon_id,
           (s.id is not null and s.next_due_at <= now()) as due_now,
           (s.id is null or s.fsrs_state = 'New') as is_new,
           s.next_due_at
      from public.topic_words tw
      join public.speaking_items si0 on si0.lexicon_id = tw.lexicon_id
      left join public.user_word_srs s on s.topic_word_id = tw.id
     where tw.status = 'READY'
       and ($1::uuid is null or tw.topic_id = $1::uuid)
     order by tw.lexicon_id, s.next_due_at asc nulls last, tw.created_at
  ),
  w as (select words.*, (due_now or is_new) as is_due from words)
`;

/**
 * Phase 13 speaking. Entry points (Dylan, 2026-10-04): the Sound Garden's
 * Pond on the Missions tab (`session`) and "Say this one?" on a flashcard
 * (`forWord`); nothing from the quiz. A speaking item belongs to the word,
 * so both read the learner's words and join items by `lexicon_id`.
 * Every query runs as the learner (`withUser`): `speaking_items` is readable
 * by anyone signed in, topic_words / SRS rows by RLS, attempts owner-only.
 */
@Injectable()
export class SpeakingService {
  constructor(
    private readonly db: DatabaseService,
    private readonly storage: StorageService,
  ) {}

  /**
   * The Pond: up to 5 of the learner's words with speaking items, due words
   * first, then new ones (no SRS row or state New), then the rest by next
   * due date. `topicId` narrows it to one bed.
   */
  async session(userId: string, topicId?: string): Promise<SpeakingSession> {
    if (topicId !== undefined && !UUID_SHAPE.test(topicId)) {
      throw new NotFoundException('Topic not found');
    }
    return this.db.withUser(userId, async (client) => {
      const count = await client.query<{ item_count: string }>(
        `${LEARNER_WORDS} select count(*) as item_count from w`,
        [topicId ?? null],
      );
      const items = await client.query<ItemRow>(
        `${LEARNER_WORDS}
         select ${ITEM_COLUMNS}
           from w
           join public.speaking_items si on si.lexicon_id = w.lexicon_id
           join public.master_lexicon ml on ml.id = si.lexicon_id
           ${MEANING_TRANSLATION_JOIN}
          order by w.due_now desc, w.is_new desc, w.next_due_at asc nulls last, si.created_at, si.id
          limit $2`,
        [topicId ?? null, SPEAKING_SESSION_SIZE],
      );
      return {
        item_count: Number(count.rows[0]?.item_count ?? 0),
        default_accent: await this.defaultAccent(client),
        items: items.rows.map((row) => this.toItem(row)),
      };
    });
  }

  /**
   * "Say this one?" on a flashcard: the speaking item for the card's word
   * (`topic_word_id`, as on DueCard). 404 when the learner can't read that
   * word or it has no item yet.
   */
  async forWord(userId: string, topicWordId: string): Promise<SpeakingWordItem> {
    if (!UUID_SHAPE.test(topicWordId)) throw new NotFoundException('Speaking item not found');
    return this.db.withUser(userId, async (client) => {
      const rows = await client.query<ItemRow>(
        `with w as (
           select tw.id as topic_word_id, tw.lexicon_id,
                  (s.id is null or s.fsrs_state = 'New' or s.next_due_at <= now()) as is_due
             from public.topic_words tw
             left join public.user_word_srs s on s.topic_word_id = tw.id
            where tw.id = $1
         )
         select ${ITEM_COLUMNS}
           from w
           join public.speaking_items si on si.lexicon_id = w.lexicon_id
           join public.master_lexicon ml on ml.id = si.lexicon_id
           ${MEANING_TRANSLATION_JOIN}`,
        [topicWordId],
      );
      if (!rows.rows[0]) throw new NotFoundException('Speaking item not found');
      return {
        default_accent: await this.defaultAccent(client),
        item: this.toItem(rows.rows[0]),
      };
    });
  }

  /**
   * "Say this one?" offers (T9-a): for the review session's cards, which
   * words have a speaking item and whether the learner has spoken that item
   * since local midnight (profile timezone, else `detectedTz`, like the
   * missions). Unknown, unreadable or malformed ids are just left out.
   */
  async lookupWords(
    userId: string,
    topicWordIds: string[],
    detectedTz?: string,
  ): Promise<SpeakingWordLookup[]> {
    const ids = [...new Set(topicWordIds.filter((id) => UUID_SHAPE.test(id)))].slice(
      0,
      SPEAKING_LOOKUP_MAX,
    );
    if (ids.length === 0) return [];
    return this.db.withUser(userId, async (client) => {
      const timezone = await resolveUserTimezone(
        async <T extends Record<string, unknown>>(text: string, params: unknown[]) =>
          (await client.query<T>(text, params)).rows,
        userId,
        detectedTz,
      );
      const rows = await client.query<SpeakingWordLookup>(
        `select tw.id as topic_word_id, si.id as item_id,
                exists (
                  select 1 from public.speaking_attempts a
                   where a.item_id = si.id
                     and a.user_id = auth.uid()
                     and a.created_at >= (date_trunc('day', now() at time zone $2) at time zone $2)
                ) as spoken_today
           from public.topic_words tw
           join public.speaking_items si on si.lexicon_id = tw.lexicon_id
          where tw.id = any($1::uuid[])`,
        [ids, timezone],
      );
      return rows.rows;
    });
  }

  /** Saves one Compare result. Try again saves another row (both are kept). */
  async createAttempt(userId: string, dto: CreateSpeakingAttemptDto): Promise<SpeakingAttempt> {
    try {
      const rows = await this.db.queryAs<SpeakingAttempt>(
        userId,
        `insert into public.speaking_attempts
           (item_id, accent, score, stage, word_marks, user_duration_ms)
         values ($1, $2, $3, $4, $5::jsonb, $6)
         returning id, item_id, accent, score, stage, word_marks, user_duration_ms, created_at`,
        [
          dto.item_id,
          dto.accent,
          dto.score,
          dto.stage,
          JSON.stringify(dto.word_marks.map(({ index, ok, reason }) => ({ index, ok, reason }))),
          dto.user_duration_ms,
        ],
      );
      return rows[0];
    } catch (err) {
      // 23503: item_id doesn't exist.
      if ((err as { code?: string }).code === '23503') {
        throw new NotFoundException('Speaking item not found');
      }
      throw err;
    }
  }

  /** From profiles.english_variety: en-GB → UK, anything else → US. */
  private async defaultAccent(client: PoolClient): Promise<SpeakingAccent> {
    const res = await client.query<{ english_variety: string | null }>(
      'select english_variety from public.profiles where id = auth.uid()',
    );
    return res.rows[0]?.english_variety === 'en-GB' ? 'UK' : 'US';
  }

  /** R2 keys → public URLs; the keys never leave the API. */
  private toItem({ audio_uk_path, audio_us_path, ...item }: ItemRow): SpeakingSessionItem {
    return {
      ...item,
      audio_uk_url: audio_uk_path ? this.storage.publicUrlFor(audio_uk_path) : null,
      audio_us_url: audio_us_path ? this.storage.publicUrlFor(audio_us_path) : null,
    };
  }
}
