import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { DatabaseService } from '../../database/database.service';
import { ENRICHMENT_QUEUE, ENRICH_WORD_JOB, WordEnrichmentJob } from '../../queues/queue.constants';
import { CreateWordDto } from './dto/create-word.dto';

export interface TopicWord {
  id: string;
  topic_id: string;
  source_word: string;
  language_code: string;
  status: 'ENRICHING' | 'READY' | 'FAILED';
  created_at: Date;
}

/**
 * One word's full enriched content, joined from `topic_words` +
 * `master_lexicon` — the same shape SrsService.DueCard carries (see its
 * DUE_CARD_COLUMNS), minus the SRS scheduling fields that only make sense
 * in the context of a review session. Backs GET /words/:id, the "click a
 * READY word in the topic list to flip its flashcard" action — unlike a
 * due-card fetch, this has no relationship to what's actually due; it is
 * purely "show me this one word's card," so it takes no session/mode
 * params and skips user_word_srs entirely.
 */
export interface WordCard {
  topic_word_id: string;
  topic_id: string;
  source_word: string;
  part_of_speech: string | null;
  ipa_us: string | null;
  ipa_uk: string | null;
  definition_en: string | null;
  audio_url: string | null;
  synonyms: unknown;
  antonyms: unknown;
  example_sentences: unknown;
}

/**
 * A guest lookup result -- deliberately leaner than WordCard: there is no
 * topic_word row at all here (no signed-in user, no topic), just whatever
 * `master_lexicon` already has cached for this normalized word. Backs
 * GET /words/guest-lookup (GuestWordTrial.tsx's "try a word before you
 * sign up" flow, live-requested 2026-09-05).
 */
export interface GuestWordCard {
  source_word: string;
  part_of_speech: string | null;
  ipa_us: string | null;
  ipa_uk: string | null;
  definition_en: string | null;
  audio_url: string | null;
  synonyms: unknown;
  antonyms: unknown;
  example_sentences: unknown;
}

/** Postgres error codes this service translates into HTTP responses. */
const PG_UNIQUE_VIOLATION = '23505';
const PG_ROW_LEVEL_SECURITY_VIOLATION = '42501';

/** Module 2 — Word ingestion; returns 201 ENRICHING in <50ms (Phase 1). */
@Injectable()
export class WordsService {
  constructor(
    protected readonly db: DatabaseService,
    @InjectQueue(ENRICHMENT_QUEUE) private readonly enrichmentQueue: Queue<WordEnrichmentJob>,
  ) {}

  /**
   * Inserts the word row and returns immediately with status ENRICHING —
   * the Gemini/TTS work happens in EnrichmentProcessor, off the request path,
   * which is what keeps this under the <50ms SLO (dygo_academy_api_surface.md
   * §3).
   *
   * No app-level permission check here on purpose: `topic_words_insert_write`
   * (002_rls_policies.sql) already requires `has_topic_role(topic_id, 'WRITE')`
   * for this INSERT to succeed. Duplicating that check here would just be a
   * second place for the permission logic to drift from the database's.
   */
  async ingest(userId: string, dto: CreateWordDto): Promise<TopicWord> {
    const languageCode = dto.languageCode ?? 'en';

    let row: TopicWord;
    try {
      const rows = await this.db.queryAs<TopicWord>(
        userId,
        `insert into public.topic_words (topic_id, source_word, language_code, added_by)
         values ($1, $2, $3, $4)
         returning id, topic_id, source_word, language_code, status, created_at`,
        [dto.topicId, dto.word.trim(), languageCode, userId],
      );
      row = rows[0];
    } catch (err) {
      throw this.translateInsertError(err);
    }

    // Fire the enrichment job after the row is committed. A failure to
    // enqueue must not roll back the insert or fail the request: the word
    // exists and stays ENRICHING; MaintenanceProcessor / a manual re-enrich
    // (POST /words/:id/re-enrich, see below) can recover it later rather
    // than the caller seeing a 500 for a queue hiccup.
    await this.enrichmentQueue.add(ENRICH_WORD_JOB, {
      topicWordId: row.id,
      word: row.source_word,
      languageCode: row.language_code,
      targetCEFR: dto.targetCEFR,
      triggeredByUserId: userId,
    });

    return row;
  }

  /**
   * POST /words/:id/re-enrich — the "Try again" action on wireframe 1l's
   * FAILED state (WordStatusRow.tsx), unimplemented since Module 2 shipped
   * (this replaces the "not yet built" note that used to sit on `ingest`,
   * above). Only flips FAILED -> ENRICHING: a word that's already
   * ENRICHING would get a second, concurrent job for the same row, and a
   * READY word has nothing to retry, so both are excluded by the WHERE
   * clause rather than a separate application check.
   *
   * Same RLS-does-the-permission-check pattern as `ingest`:
   * `topic_words_update_write` (002_rls_policies.sql) requires WRITE role
   * on the topic for this UPDATE to affect any row at all. Zero rows back
   * means "doesn't exist," "not visible to this caller," or "not
   * currently FAILED" — same three-way NotFoundException collapse
   * `topics.service.ts` and `groups.service.ts` already use elsewhere in
   * this codebase, rather than a fourth reason to distinguish here.
   */
  async reEnrich(userId: string, topicWordId: string): Promise<TopicWord> {
    const rows = await this.db.queryAs<TopicWord>(
      userId,
      `update public.topic_words
          set status = 'ENRICHING', failure_reason = null, updated_at = now()
        where id = $1 and status = 'FAILED'
        returning id, topic_id, source_word, language_code, status, created_at`,
      [topicWordId],
    );

    if (rows.length === 0) {
      throw new NotFoundException('Word not found, or not currently failed.');
    }

    const row = rows[0];

    // Same fire-after-commit reasoning as ingest: a queue hiccup here
    // shouldn't roll back the status flip or 500 the request. Unlike
    // ingest, there's no INSERT to leave orphaned if this add() throws —
    // worst case the row sits at ENRICHING until the next manual retry or
    // MaintenanceProcessor sweep, same as any other stuck-ENRICHING row.
    await this.enrichmentQueue.add(ENRICH_WORD_JOB, {
      topicWordId: row.id,
      word: row.source_word,
      languageCode: row.language_code,
      triggeredByUserId: userId,
    });

    return row;
  }

  /**
   * GET /words/:id — a single word's card content, independent of SRS due
   * status (contrast SrsService.findDue, which only ever returns cards
   * that are actually due/new). Same three-way NotFoundException collapse
   * as reEnrich above: RLS hides rows this caller can't read, so "doesn't
   * exist" and "not visible to this caller" land on the same 404 either
   * way — there is nothing to distinguish here that reEnrich's comment
   * doesn't already cover.
   */
  async getCard(userId: string, topicWordId: string): Promise<WordCard> {
    const rows = await this.db.queryAs<WordCard>(
      userId,
      `select tw.id as topic_word_id,
              tw.topic_id,
              tw.source_word,
              ml.part_of_speech,
              ml.ipa_us,
              ml.ipa_uk,
              ml.definition_en,
              ml.audio_url,
              ml.synonyms,
              ml.antonyms,
              ml.example_sentences
         from public.topic_words tw
         left join public.master_lexicon ml on ml.id = tw.lexicon_id
        where tw.id = $1`,
      [topicWordId],
    );

    if (rows.length === 0) {
      throw new NotFoundException('Word not found.');
    }

    return rows[0];
  }

  /**
   * DELETE /words/:id — removes one word from its topic (the trash icon on
   * each WordStatusRow row, live-requested 2026-09-18: "How to delete word
   * in the topics?"). `topic_words_delete_write` (002_rls_policies.sql)
   * already required WRITE role on the topic for this DELETE to affect any
   * row — that policy existed since the schema was first written but had
   * no caller until now, same gap useDeleteTopic's comment describes for
   * topics themselves. Same zero-rows-means-404 collapse as reEnrich/
   * getCard above: RLS hides rows this caller can't act on, so "doesn't
   * exist" and "not visible/not writable to this caller" land on the same
   * 404 either way.
   *
   * Deliberately does not touch `user_word_srs`/`review_logs` rows for
   * this word — both reference `topic_word_id` with `on delete cascade`
   * (001_initial_schema.sql), so Postgres cleans those up as part of the
   * same DELETE rather than this needing a second query.
   */
  async remove(userId: string, topicWordId: string): Promise<void> {
    const rows = await this.db.queryAs<{ id: string }>(
      userId,
      `delete from public.topic_words where id = $1 returning id`,
      [topicWordId],
    );
    if (rows.length === 0) {
      throw new NotFoundException('Word not found.');
    }
  }

  /**
   * GET /words/guest-lookup — the BA flow for the public landing page
   * (live-requested 2026-09-05):
   *   1. guest types a word and hits the search icon
   *   2. we look it up in master_lexicon (already-enriched words only --
   *      a guest request must never trigger a fresh Gemini/TTS enrichment
   *      job the way an authenticated POST /words does, both for cost
   *      control and because there is no topic to attach the result to)
   *   3. found -> return the card content
   *   4. not found -> 404, which GuestWordTrial.tsx turns into "create a
   *      free account to add new words" rather than a raw error
   *
   * Runs via queryAsAnon (DatabaseService), not queryAs(userId, ...): there
   * is no userId at all on this path, and 002_rls_policies.sql already
   * grants the `anon` role SELECT on master_lexicon for exactly this kind
   * of unauthenticated read.
   */
  async lookupGuestWord(word: string, languageCode = 'en'): Promise<GuestWordCard> {
    const rows = await this.db.queryAsAnon<GuestWordCard>(
      `select normalized_word as source_word,
              part_of_speech,
              ipa_us,
              ipa_uk,
              definition_en,
              audio_url,
              synonyms,
              antonyms,
              example_sentences
         from public.master_lexicon
        where normalized_word = lower(trim($1))
          and language_code = $2
        limit 1`,
      [word, languageCode],
    );

    if (rows.length === 0) {
      throw new NotFoundException('This word is not in the lexicon yet.');
    }

    return rows[0];
  }

  private translateInsertError(err: unknown): Error {
    const pgErr = err as { code?: string; message?: string };

    if (pgErr?.code === PG_UNIQUE_VIOLATION) {
      return new ConflictException('This word is already in the topic.');
    }
    if (pgErr?.code === PG_ROW_LEVEL_SECURITY_VIOLATION) {
      return new ForbiddenException('WRITE role on this topic is required.');
    }
    return err instanceof Error ? err : new Error(String(err));
  }
}
