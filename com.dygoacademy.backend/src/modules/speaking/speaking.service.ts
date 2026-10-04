import { Injectable, NotFoundException } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import { StorageService } from '../../storage/storage.service';
import { CreateSpeakingAttemptDto } from './dto/create-attempt.dto';
import {
  SPEAKING_SESSION_SIZE,
  SpeakingAttempt,
  SpeakingSession,
  SpeakingSessionItem,
  SpeakingTimings,
} from './speaking.types';

/** Any 8-4-4-4-12 hex id (seed ids aren't RFC-version UUIDs, so no version check). */
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface TopicRow {
  id: string;
  title: string;
  item_count: string;
  english_variety: string | null;
}

interface ItemRow extends Omit<SpeakingSessionItem, 'audio_uk_url' | 'audio_us_url'> {
  audio_uk_path: string | null;
  audio_us_path: string | null;
  timings_uk: SpeakingTimings | null;
  timings_us: SpeakingTimings | null;
}

/**
 * Phase 13 speaking sessions. Every query runs as the learner
 * (`withUser`), so RLS decides what they can see (master rule 1): a topic
 * they can't read returns no topic row (404), `speaking_items` is readable
 * by anyone signed in, and attempts are owner-only.
 */
@Injectable()
export class SpeakingService {
  constructor(
    private readonly db: DatabaseService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Up to 5 items for one bed: due and new words first (no SRS row, state
   * New, or due now), then the rest by next due date. Only items whose word
   * is still in the bed count.
   */
  async session(userId: string, topicId: string): Promise<SpeakingSession> {
    if (!UUID_SHAPE.test(topicId)) throw new NotFoundException('Topic not found');
    return this.db.withUser(userId, async (client) => {
      const topic = await client.query<TopicRow>(
        `select t.id, t.title,
                (select count(*) from public.speaking_items si
                   join public.topic_words tw
                     on tw.topic_id = si.topic_id and tw.lexicon_id = si.lexicon_id
                  where si.topic_id = t.id) as item_count,
                (select p.english_variety from public.profiles p where p.id = auth.uid()) as english_variety
           from public.topics t
          where t.id = $1`,
        [topicId],
      );
      const row = topic.rows[0];
      if (!row) throw new NotFoundException('Topic not found');

      const items = await client.query<ItemRow>(
        `select si.id, si.lexicon_id, ml.normalized_word as word, ml.part_of_speech,
                ml.cefr_level::text as cefr_level, ml.ipa_uk, ml.ipa_us, ml.definition_en,
                wt.locale as meaning_locale, wt.meaning as meaning_translation,
                si.sentence, si.target_index,
                si.audio_uk_path, si.audio_us_path, si.timings_uk, si.timings_us,
                (s.id is null or s.fsrs_state = 'New' or s.next_due_at <= now()) as is_due
           from public.speaking_items si
           join public.topic_words tw
             on tw.topic_id = si.topic_id and tw.lexicon_id = si.lexicon_id
           join public.master_lexicon ml on ml.id = si.lexicon_id
           left join public.user_word_srs s on s.topic_word_id = tw.id
           left join public.word_translations wt
             on wt.word_id = ml.id
            and wt.locale = (select p.meaning_locale from public.profiles p where p.id = auth.uid())
          where si.topic_id = $1
          order by is_due desc, s.next_due_at asc nulls first, si.created_at, si.id
          limit $2`,
        [topicId, SPEAKING_SESSION_SIZE],
      );

      return {
        topic_id: row.id,
        topic_title: row.title,
        item_count: Number(row.item_count),
        default_accent: row.english_variety === 'en-GB' ? 'UK' : 'US',
        items: items.rows.map(({ audio_uk_path, audio_us_path, ...item }) => ({
          ...item,
          audio_uk_url: audio_uk_path ? this.storage.publicUrlFor(audio_uk_path) : null,
          audio_us_url: audio_us_path ? this.storage.publicUrlFor(audio_us_path) : null,
        })),
      };
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
}
