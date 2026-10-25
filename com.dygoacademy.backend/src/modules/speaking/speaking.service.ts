import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PoolClient } from 'pg';

import { DatabaseService } from '../../database/database.service';
import { recordMissionProgress } from '../missions/missions.store';
import { settleWeek, weeklySafely } from '../missions/weekly.store';
import { ACTIVE_BED_TOPIC, resolveUserTimezone } from '../srs/srs.service';
import { StorageService } from '../../storage/storage.service';
import { CreateSpeakingAttemptDto } from './dto/create-attempt.dto';
import { storedStones, type PronTip, type StoredSyllable } from './pron-syllables';
import {
  SPEAKING_LOOKUP_MAX,
  SPEAKING_SESSION_SIZE,
  SpeakingAccent,
  SpeakingAttempt,
  SpeakingHarvestWord,
  SpeakingSession,
  SpeakingSessionItem,
  SpeakingTimings,
  SpeakingWordItem,
  SpeakingWordLookup,
} from './speaking.types';

/** Any 8-4-4-4-12 hex id (seed ids aren't RFC-version UUIDs, so no version check). */
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ItemRow extends Omit<
  SpeakingSessionItem,
  'audio_uk_url' | 'audio_us_url' | 'syllables' | 'syllables_clip_url' | 'pron_tip'
> {
  syllables_us: StoredSyllable[] | null;
  syllables_uk: StoredSyllable[] | null;
  pron_tip: PronTip | null;
  audio_uk_path: string | null;
  audio_us_path: string | null;
  timings_uk: SpeakingTimings | null;
  timings_us: SpeakingTimings | null;
}

/** Item columns; expects aliases `w` (word: topic_word_id, is_due), `si`, `ml`, `wt`. */
const ITEM_COLUMNS = `
  si.id, si.lexicon_id, w.topic_word_id, ml.normalized_word as word, ml.part_of_speech,
  ml.cefr_level::text as cefr_level, ml.ipa_uk, ml.ipa_us, ml.definition_en,
  ml.audio_url_us as word_audio_url_us, ml.audio_url_uk as word_audio_url_uk,
  ml.syllables_us, ml.syllables_uk, ml.pron_tip,
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
 * in two beds counts once): READY words they can read (RLS on topic_words
 * and user_word_srs does the filtering, master rule 1). Without a topic
 * (2026-10-15) only their own words: planted ones (an SRS row past New)
 * plus the first bed's (the goal's), so The Pond never asks for a library
 * word they have never met; a learner with no first bed keeps every word.
 * $1 = optional topic id.
 */
const LEARNER_WORDS = `
  with words as (
    select distinct on (tw.lexicon_id)
           tw.id as topic_word_id, tw.lexicon_id,
           (s.id is not null and s.next_due_at <= now()) as due_now,
           (s.id is null or s.fsrs_state = 'New') as is_new,
           s.next_due_at,
           case when s.fsrs_state <> 'New' then s.created_at end as planted_at
      from public.topic_words tw
      join public.speaking_items si0 on si0.lexicon_id = tw.lexicon_id
      left join public.user_word_srs s on s.topic_word_id = tw.id
     where tw.status = 'READY'
       and ($1::uuid is null or tw.topic_id = $1::uuid)
       and ($1::uuid is not null or coalesce(s.fsrs_state <> 'New', false)
            or ${ACTIVE_BED_TOPIC} is null or tw.topic_id = ${ACTIVE_BED_TOPIC})
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
  private readonly logger = new Logger(SpeakingService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly storage: StorageService,
  ) {}

  /**
   * The Pond: up to 5 of the learner's words with speaking items (see
   * LEARNER_WORDS): due words first, then the most recently planted, then
   * new ones (no SRS row or state New, from the first bed or `topicId`'s
   * bed). `topicId` narrows it to one bed.
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
          order by w.due_now desc, w.planted_at desc nulls last, si.created_at, si.id
          limit $2`,
        [topicId ?? null, SPEAKING_SESSION_SIZE],
      );
      const accent = await this.defaultAccent(client);
      return {
        item_count: Number(count.rows[0]?.item_count ?? 0),
        default_accent: accent,
        items: items.rows.map((row) => this.toItem(row, accent)),
      };
    });
  }

  /**
   * "Say this one?" on a flashcard, and one Pronunciation word: the speaking
   * item for the card's word (`topic_word_id`, as on DueCard). 404 when the
   * learner can't read that word or it has no item yet. `blocked` =
   * `no_syllables` (logged) when the word has no stored stones: the app
   * doesn't offer it in Pronunciation (sentences still work).
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
      const accent = await this.defaultAccent(client);
      const item = this.toItem(rows.rows[0], accent);
      const blocked = item.syllables.length === 0 ? ('no_syllables' as const) : null;
      if (blocked)
        this.logger.warn(`pron word blocked: ${blocked} "${item.word}" (${item.lexicon_id})`);
      return { default_accent: accent, item, blocked };
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

  /**
   * Saves one Compare result. Try again saves another row (both are kept).
   * SE1: the first attempt on a sentence in the learner's day bumps the
   * SPEAK mission (a no-op on days without one). Never pollinates: since
   * 2026-10-11 only the word check does (Pronunciation, Stepping stones
   * Part 3); `harvest` from older apps is ignored.
   */
  async createAttempt(userId: string, dto: CreateSpeakingAttemptDto): Promise<SpeakingAttempt> {
    try {
      return await this.db.withUser(userId, async (client) => {
        const timezone = await resolveUserTimezone(
          async <T extends Record<string, unknown>>(text: string, params: unknown[]) =>
            (await client.query<T>(text, params)).rows,
          userId,
          dto.tz,
        );
        const before = await client.query<{ spoken: boolean }>(
          `select exists (
             select 1 from public.speaking_attempts a
              where a.item_id = $1
                and a.user_id = auth.uid()
                and a.created_at >= (date_trunc('day', now() at time zone $2) at time zone $2)
           ) as spoken`,
          [dto.item_id, timezone],
        );
        const inserted = await client.query<SpeakingAttempt>(
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
        if (!before.rows[0]?.spoken) {
          await recordMissionProgress(client, userId, timezone, new Date(), 'SPEAK');
        }
        // A4: an accepted sentence (bloom / fruit) counts toward "Use it in a sentence".
        if (dto.stage === 'bloom' || dto.stage === 'fruit') {
          await weeklySafely(
            client,
            () => settleWeek(client, userId, timezone, new Date()),
            (err) => this.logger.warn(`weekly missions: ${String(err)}`),
          );
        }
        return inserted.rows[0];
      });
    } catch (err) {
      // 23503: item_id doesn't exist.
      if ((err as { code?: string }).code === '23503') {
        throw new NotFoundException('Speaking item not found');
      }
      throw err;
    }
  }

  /**
   * SE5 "Ready to harvest" (A7 "Bees are waiting" since 2026-10-11): the
   * bed's words that have a speaking item, oldest planted first, with
   * whether (and how well) the learner harvested each, both IPAs and the
   * stored syllables in the profile accent for the bee row. The app picks
   * the ripe (Flower) ones from the bed's own stages. Words with no stored
   * syllables are left out and logged (pronunciation v2: never one stone for
   * the whole word). RLS scopes topic_words and speaking_harvests to the
   * learner.
   */
  async harvest(userId: string, topicId: string): Promise<SpeakingHarvestWord[]> {
    if (!UUID_SHAPE.test(topicId)) throw new NotFoundException('Topic not found');
    const rows = await this.db.queryAs<
      Omit<SpeakingHarvestWord, 'syllables'> & {
        word: string;
        lexicon_id: string;
        english_variety: string | null;
        syllables_us: StoredSyllable[] | null;
        syllables_uk: StoredSyllable[] | null;
      }
    >(
      userId,
      `select tw.id as topic_word_id, si.id as item_id,
              h.score as harvested_score, h.created_at as harvested_at, ml.ipa_uk,
              ml.normalized_word as word, ml.ipa_us, ml.id as lexicon_id,
              ml.syllables_us, ml.syllables_uk,
              (select p.english_variety from public.profiles p where p.id = auth.uid())
                as english_variety
         from public.topic_words tw
         join public.speaking_items si on si.lexicon_id = tw.lexicon_id
         join public.master_lexicon ml on ml.id = tw.lexicon_id
         left join public.speaking_harvests h
                on h.lexicon_id = tw.lexicon_id and h.user_id = auth.uid()
        where tw.topic_id = $1 and tw.status = 'READY'
        order by tw.created_at, tw.id`,
      [topicId],
    );
    const out: SpeakingHarvestWord[] = [];
    for (const { word, lexicon_id, english_variety, syllables_us, syllables_uk, ...row } of rows) {
      const accent: SpeakingAccent = english_variety === 'en-GB' ? 'UK' : 'US';
      const { syllables } = storedStones({ syllables_us, syllables_uk }, accent);
      if (syllables.length === 0) {
        this.logger.warn(`pron word blocked: no_syllables "${word}" (${lexicon_id})`);
        continue;
      }
      out.push({ ...row, syllables });
    }
    return out;
  }

  /** From profiles.english_variety: en-GB → UK, anything else → US. */
  private async defaultAccent(client: PoolClient): Promise<SpeakingAccent> {
    const res = await client.query<{ english_variety: string | null }>(
      'select english_variety from public.profiles where id = auth.uid()',
    );
    return res.rows[0]?.english_variety === 'en-GB' ? 'UK' : 'US';
  }

  /** R2 keys → public URLs; the keys never leave the API. */
  private toItem(
    { audio_uk_path, audio_us_path, syllables_us, syllables_uk, pron_tip, ...item }: ItemRow,
    accent: SpeakingAccent,
  ): SpeakingSessionItem {
    const stones = storedStones({ syllables_us, syllables_uk }, accent);
    return {
      ...item,
      syllables: stones.syllables,
      syllables_clip_url:
        stones.syllables.length === 0
          ? null
          : stones.accent === 'UK'
            ? item.word_audio_url_uk
            : item.word_audio_url_us,
      pron_tip,
      audio_uk_url: audio_uk_path ? this.storage.publicUrlFor(audio_uk_path) : null,
      audio_us_url: audio_us_path ? this.storage.publicUrlFor(audio_us_path) : null,
    };
  }
}
