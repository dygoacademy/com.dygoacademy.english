import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { createHash } from 'node:crypto';

import { GeminiEnrichmentService } from '../ai/gemini-enrichment.service';
import { DatabaseService } from '../database/database.service';
import { ENRICHMENT_QUEUE, WordEnrichmentJob } from '../queues/queue.constants';
import { StorageService } from '../storage/storage.service';

interface MasterLexiconRow {
  id: string;
}

/**
 * Gemini + TTS enrichment pipeline (Phase 1, Module 2).
 *
 * Flow: master_lexicon dedup lookup (>85% hit-rate KPI, BRD §2) -> on miss,
 * Gemini 1.5 Flash for linguistic fields -> Gemini TTS for audio -> upload
 * to R2/MinIO -> upsert master_lexicon -> mark the topic_word READY.
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

  async process(job: Job<WordEnrichmentJob>): Promise<void> {
    const { topicWordId, word, languageCode, targetCEFR } = job.data;
    const normalizedWord = word.trim().toLowerCase();
    this.logger.log(`enriching "${word}" (${languageCode}) for ${topicWordId}`);

    try {
      // Step 1 — global lexical deduplication (FR-2.2). Checked BEFORE any
      // paid API call; this is what cuts AI cost by ~90%.
      const [cached] = await this.db.queryAsService<MasterLexiconRow>(
        `select id from public.master_lexicon
          where normalized_word = $1 and language_code = $2`,
        [normalizedWord, languageCode],
      );

      const lexiconId = cached
        ? cached.id
        : await this.enrichAndCache(normalizedWord, languageCode, targetCEFR);

      if (cached) {
        this.logger.log(`cache hit for "${word}" — no AI call made`);
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
      const { pcm, sampleRateHz } = await this.gemini.synthesizeSpeech(normalizedWord);
      const wav = GeminiEnrichmentService.pcmToWav(pcm, sampleRateHz);
      const hash = createHash('md5').update(normalizedWord).digest('hex');
      // Path convention per tech spec §4.2, extension changed to .wav — see
      // GeminiEnrichmentService.pcmToWav's doc comment for why.
      const key = `audio/${languageCode}/us/${hash}.wav`;
      audioUrl = await this.storage.upload(key, wav, 'audio/wav');
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
         set audio_url = coalesce(public.master_lexicon.audio_url, excluded.audio_url),
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
}
