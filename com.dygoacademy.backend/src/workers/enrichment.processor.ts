import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { GeminiEnrichmentService } from '../ai/gemini-enrichment.service';
import { DatabaseService } from '../database/database.service';
import {
  AUDIO_BACKFILL_JOB,
  AudioBackfillJob,
  ENRICHMENT_QUEUE,
  WordEnrichmentJob,
} from '../queues/queue.constants';
import { StorageService } from '../storage/storage.service';

interface MasterLexiconRow {
  id: string;
  audio_url?: string | null;
}

/**
 * Seed data once shipped placeholder links on this domain, which never
 * existed. Treated exactly like a missing audio_url so those rows get real
 * audio instead of a broken play button.
 */
export const PLACEHOLDER_AUDIO_PREFIX = 'https://cdn.dygo.academy/';

export function isMissingAudio(url: string | null | undefined): boolean {
  return !url || url.startsWith(PLACEHOLDER_AUDIO_PREFIX);
}

/**
 * Gemini + TTS enrichment pipeline (Phase 1, Module 2).
 *
 * Flow: master_lexicon dedup lookup (>85% hit-rate KPI, BRD §2) -> on miss,
 * Gemini 1.5 Flash for linguistic fields -> Gemini TTS for audio -> upload
 * to R2/MinIO -> upsert master_lexicon -> mark the topic_word READY.
 *
 * Also handles `audio-backfill` jobs, queued by `npm run audio-backfill`
 * (scripts/audio-backfill.js, run by an admin or cron, never at startup) at
 * low priority so they never delay a learner's own words. A cache hit on a
 * word with missing audio also fills it in: see `ensureAudio`.
 */
@Processor(ENRICHMENT_QUEUE)
export class EnrichmentProcessor extends WorkerHost {
  private readonly logger = new Logger(EnrichmentProcessor.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly gemini: GeminiEnrichmentService,
    private readonly storage: StorageService,
  ) {
    super();
  }

  async process(job: Job<WordEnrichmentJob | AudioBackfillJob>): Promise<void> {
    if (job.name === AUDIO_BACKFILL_JOB) {
      // Fatal on failure (rethrows), so BullMQ retries with backoff. There is
      // no topic_word to mark FAILED: the word is already READY and usable,
      // it just has no audio until a retry or the next `npm run audio-backfill` succeeds.
      const { lexiconId, word, languageCode } = job.data as AudioBackfillJob;
      await this.ensureAudio(lexiconId, word.trim().toLowerCase(), languageCode);
      return;
    }
    return this.enrichWordJob(job as Job<WordEnrichmentJob>);
  }

  private async enrichWordJob(job: Job<WordEnrichmentJob>): Promise<void> {
    const { topicWordId, word, languageCode, targetCEFR } = job.data;
    const normalizedWord = word.trim().toLowerCase();
    this.logger.log(`enriching "${word}" (${languageCode}) for ${topicWordId}`);

    try {
      // Step 1 — global lexical deduplication (FR-2.2). Checked BEFORE any
      // paid API call; this is what cuts AI cost by ~90%.
      const [cached] = await this.db.queryAsService<MasterLexiconRow>(
        `select id, audio_url from public.master_lexicon
          where normalized_word = $1 and language_code = $2`,
        [normalizedWord, languageCode],
      );

      const lexiconId = cached
        ? cached.id
        : await this.enrichAndCache(normalizedWord, languageCode, targetCEFR);

      if (cached) {
        this.logger.log(`cache hit for "${word}" — no text AI call made`);
        if (isMissingAudio(cached.audio_url)) {
          // A cached word with no (or placeholder) audio: fill it in now.
          // Non-fatal here — the text fields are what make the word READY.
          await this.ensureAudio(cached.id, normalizedWord, languageCode).catch((err) =>
            this.logger.warn(
              `audio fill-in failed for cached "${normalizedWord}", word stays READY without audio: ${
                err instanceof Error ? err.message : err
              }`,
            ),
          );
        }
      }

      await this.db.queryAsService(
        `update public.topic_words
            set lexicon_id = $1, status = 'READY', failure_reason = null, updated_at = now()
          where id = $2`,
        [lexiconId, topicWordId],
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isFinalAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);

      if (isFinalAttempt) {
        this.logger.error(`enrichment permanently failed for "${word}": ${message}`);
        await this.db
          .queryAsService(
            `update public.topic_words
                set status = 'FAILED', failure_reason = $1, updated_at = now()
              where id = $2`,
            [message.slice(0, 500), topicWordId],
          )
          .catch((dbErr) =>
            this.logger.error(`failed to record FAILED status for ${topicWordId}: ${dbErr}`),
          );
      } else {
        this.logger.warn(
          `enrichment attempt ${job.attemptsMade + 1} failed for "${word}", will retry: ${message}`,
        );
      }

      // Rethrow regardless — BullMQ's own attempts/backoff (queues.module.ts)
      // decides whether this becomes a retry or a terminal failure.
      throw err;
    }
  }

  /** Calls Gemini for linguistic fields + TTS audio, uploads audio, upserts master_lexicon. Returns the lexicon row id. */
  private async enrichAndCache(
    normalizedWord: string,
    languageCode: string,
    targetCEFR: WordEnrichmentJob['targetCEFR'],
  ): Promise<string> {
    const entry = await this.gemini.enrichWord(normalizedWord, languageCode, targetCEFR);

    let audioUrl: string | null = null;
    try {
      audioUrl = await this.resolveAudioUrl(normalizedWord, languageCode);
    } catch (err) {
      // Audio is a nice-to-have on top of the text fields, not the field
      // that gates READY (topic_words_ready_requires_lexicon only requires a
      // lexicon_id). A TTS/storage hiccup shouldn't fail the whole word when
      // Gemini's text extraction already succeeded — the row can be
      // re-synthesised later without redoing the text call.
      this.logger.warn(
        `TTS/upload failed for "${normalizedWord}", continuing without audio: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }

    // ON CONFLICT: two topic_words for the same word/language can race into
    // enrichAndCache concurrently (both missed the dedup check before either
    // finished). The unique constraint on (normalized_word, language_code)
    // makes the second writer update rather than error.
    const [row] = await this.db.queryAsService<MasterLexiconRow>(
      `insert into public.master_lexicon
         (normalized_word, language_code, part_of_speech, ipa_us, ipa_uk,
          cefr_level, definition_en, audio_url, synonyms, antonyms,
          example_sentences, enriched_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11::jsonb, now())
       on conflict (normalized_word, language_code) do update
         set audio_url = case
               when public.master_lexicon.audio_url is null
                 or public.master_lexicon.audio_url like '${PLACEHOLDER_AUDIO_PREFIX}%'
               then excluded.audio_url
               else public.master_lexicon.audio_url
             end,
             updated_at = now()
       returning id`,
      [
        normalizedWord,
        languageCode,
        entry.part_of_speech,
        entry.ipa_us,
        entry.ipa_uk,
        entry.cefr_level,
        entry.definition_en,
        audioUrl,
        JSON.stringify(entry.synonyms ?? []),
        JSON.stringify(entry.antonyms ?? []),
        JSON.stringify(entry.example_sentences ?? []),
      ],
    );

    return row.id;
  }

  /**
   * Audio for a word, cheapest source first: the object is keyed by
   * md5(word), so audio generated before a database reset is still in R2
   * and is reused for free. Only a word that never had audio costs a TTS
   * call. Throws on TTS/storage failure; callers decide if that's fatal.
   */
  private async resolveAudioUrl(normalizedWord: string, languageCode: string): Promise<string> {
    // Path convention per tech spec §4.2, extension .wav — see
    // GeminiEnrichmentService.pcmToWav's doc comment for why.
    const key = StorageService.audioKeyFor(normalizedWord, languageCode);
    if (await this.storage.hasObject(key)) {
      this.logger.log(`reusing existing audio for "${normalizedWord}" (no TTS call)`);
      return this.storage.publicUrlFor(key);
    }
    const { pcm, sampleRateHz } = await this.gemini.synthesizeSpeech(normalizedWord);
    const wav = GeminiEnrichmentService.pcmToWav(pcm, sampleRateHz);
    return this.storage.upload(key, wav, 'audio/wav');
  }

  /**
   * Gives an existing master_lexicon row real audio if it has none (or only
   * a placeholder link). Re-checks the row first, so a duplicate or stale
   * job is a cheap no-op, and only overwrites a missing/placeholder value.
   */
  private async ensureAudio(
    lexiconId: string,
    normalizedWord: string,
    languageCode: string,
  ): Promise<void> {
    const [row] = await this.db.queryAsService<MasterLexiconRow>(
      `select id, audio_url from public.master_lexicon where id = $1`,
      [lexiconId],
    );
    if (!row) {
      this.logger.warn(`audio backfill: lexicon row ${lexiconId} no longer exists, skipping`);
      return;
    }
    if (!isMissingAudio(row.audio_url)) return;

    const audioUrl = await this.resolveAudioUrl(normalizedWord, languageCode);
    await this.db.queryAsService(
      `update public.master_lexicon
          set audio_url = $2, updated_at = now()
        where id = $1
          and (audio_url is null or audio_url like '${PLACEHOLDER_AUDIO_PREFIX}%')`,
      [lexiconId, audioUrl],
    );
    this.logger.log(`audio ready for "${normalizedWord}"`);
  }
}
