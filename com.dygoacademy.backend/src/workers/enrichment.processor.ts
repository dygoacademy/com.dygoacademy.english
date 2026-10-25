import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';

import { GeminiEnrichmentService } from '../ai/gemini-enrichment.service';
import {
  GoogleWordTtsService,
  WORD_SPEAKING_RATE,
  WORD_VOICES,
  WordAccent,
  ipaForAccent,
  ipaForPhoneme,
} from '../ai/google-word-tts.service';
import { PronDataService, pronDataUpdate, type PronDataRow } from '../ai/pron-data.service';
import { UsageCapExceededError } from '../ai/usage-cap.service';
import { DatabaseService } from '../database/database.service';
import {
  AUDIO_BACKFILL_JOB,
  AudioBackfillJob,
  ENRICHMENT_QUEUE,
  TRANSLATIONS_BACKFILL_JOB,
  TranslationsBackfillJob,
  WordEnrichmentJob,
} from '../queues/queue.constants';
import { encodeForWeb, filesToStore } from '../storage/audio-encode';
import { StorageService } from '../storage/storage.service';

interface MasterLexiconRow {
  id: string;
  audio_url_us?: string | null;
  audio_url_uk?: string | null;
  ipa_us?: string | null;
  ipa_uk?: string | null;
}

/**
 * Seed data once shipped placeholder links on this domain, which never
 * existed. Treated exactly like a missing audio_url_us so those rows get real
 * audio instead of a broken play button.
 */
export const PLACEHOLDER_AUDIO_PREFIX = 'https://cdn.dygo.academy/';

export function isMissingAudio(url: string | null | undefined): boolean {
  return !url || url.startsWith(PLACEHOLDER_AUDIO_PREFIX);
}

/** The master_lexicon column holding each accent's clip (20261025_word_audio_uk.sql). */
const AUDIO_COLUMN: Record<WordAccent, 'audio_url_us' | 'audio_url_uk'> = {
  US: 'audio_url_us',
  UK: 'audio_url_uk',
};

/**
 * Gemini + TTS enrichment pipeline (Phase 1, Module 2).
 *
 * Flow: master_lexicon dedup lookup (>85% hit-rate KPI, BRD §2) -> on miss,
 * Gemini 1.5 Flash for linguistic fields -> Google TTS from the IPA for audio -> upload
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
    private readonly wordTts: GoogleWordTtsService,
    private readonly storage: StorageService,
    private readonly pronData: PronDataService,
  ) {
    super();
  }

  async process(
    job: Job<WordEnrichmentJob | AudioBackfillJob | TranslationsBackfillJob>,
  ): Promise<void> {
    if (job.name === AUDIO_BACKFILL_JOB) {
      // Fatal on failure (rethrows), so BullMQ retries with backoff. There is
      // no topic_word to mark FAILED: the word is already READY and usable,
      // it just has no audio until a retry or the next `npm run audio-backfill` succeeds.
      const { lexiconId, word, languageCode, remake } = job.data as AudioBackfillJob;
      const changed = await this.ensureAudio(
        lexiconId,
        word.trim().toLowerCase(),
        languageCode,
        remake,
      );
      // A remade clip moves the syllables inside it: time them again.
      if (remake && changed) await this.fillPronData(lexiconId, true);
      return;
    }
    if (job.name === TRANSLATIONS_BACKFILL_JOB) {
      // Also fatal on failure, same reasoning as audio-backfill: the word is
      // already READY, this just fills in a meaning-locale gap.
      await this.backfillTranslations(job.data as TranslationsBackfillJob);
      return;
    }
    return this.enrichWordJob(job as Job<WordEnrichmentJob>);
  }

  /**
   * `translations-backfill` job body (queued by
   * scripts/translations-backfill.js for words that already have
   * definition_en but are missing a word_translations row for one or more
   * meaning locales — see the 2026-09-29 array→object schema fix in
   * gemini-enrichment.service.ts for why that gap existed). Cheaper than
   * `enrichAndCache`: `GeminiEnrichmentService.translateMeaning` only asks
   * for the translation, not the whole lexicon entry.
   */
  private async backfillTranslations(data: TranslationsBackfillJob): Promise<void> {
    const { lexiconId, missingLocales, definitionEn, exampleSentence } = data;
    if (missingLocales.length === 0) return;

    const translations = await this.gemini.translateMeaning(definitionEn, exampleSentence);
    const rows = missingLocales
      .filter((locale) => translations[locale])
      .map((locale) => ({ locale, ...translations[locale] }));
    await this.upsertTranslations(lexiconId, rows);
  }

  private async enrichWordJob(job: Job<WordEnrichmentJob>): Promise<void> {
    const { topicWordId, word, languageCode, targetCEFR } = job.data;
    const normalizedWord = word.trim().toLowerCase();
    this.logger.log(`enriching "${word}" (${languageCode}) for ${topicWordId}`);

    try {
      // Step 1 — global lexical deduplication (FR-2.2). Checked BEFORE any
      // paid API call; this is what cuts AI cost by ~90%.
      const [cached] = await this.db.queryAsService<MasterLexiconRow>(
        `select id, audio_url_us, audio_url_uk from public.master_lexicon
          where normalized_word = $1 and language_code = $2`,
        [normalizedWord, languageCode],
      );

      const lexiconId = cached
        ? cached.id
        : await this.enrichAndCache(normalizedWord, languageCode, targetCEFR);

      if (cached) {
        this.logger.log(`cache hit for "${word}" — no text AI call made`);
        if (this.accentsMissing(cached).length > 0) {
          // A cached word with no (or placeholder) audio in an accent: fill it in now.
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
      // After READY, so the learner never waits for it.
      await this.fillPronData(lexiconId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Over today's Gemini cap (S13): retrying won't help until tomorrow (UTC),
      // so fail the word now instead of burning the retries.
      const capped = err instanceof UsageCapExceededError;
      const isFinalAttempt = capped || job.attemptsMade + 1 >= (job.opts.attempts ?? 1);

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
      // decides whether this becomes a retry or a terminal failure; a capped
      // job is marked unrecoverable so BullMQ doesn't retry it.
      if (capped) throw new UnrecoverableError(message);
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

    // Audio is a nice-to-have on top of the text fields, not the field
    // that gates READY (topic_words_ready_requires_lexicon only requires a
    // lexicon_id). A TTS/storage hiccup shouldn't fail the whole word when
    // Gemini's text extraction already succeeded — the row can be
    // re-synthesised later without redoing the text call.
    const audio: Record<WordAccent, string | null> = { US: null, UK: null };
    for (const accent of this.accentsMade()) {
      try {
        audio[accent] = await this.resolveAudioUrl(
          normalizedWord,
          languageCode,
          ipaForAccent(entry, accent),
          accent,
        );
      } catch (err) {
        this.logger.warn(
          `${accent} TTS/upload failed for "${normalizedWord}", continuing without it: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    }

    // ON CONFLICT: two topic_words for the same word/language can race into
    // enrichAndCache concurrently (both missed the dedup check before either
    // finished). The unique constraint on (normalized_word, language_code)
    // makes the second writer update rather than error.
    const [row] = await this.db.queryAsService<MasterLexiconRow>(
      `insert into public.master_lexicon
         (normalized_word, language_code, part_of_speech, ipa_us, ipa_uk,
          cefr_level, definition_en, audio_url_us, synonyms, antonyms,
          example_sentences, enriched_at, audio_url_uk)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11::jsonb, now(), $12)
       on conflict (normalized_word, language_code) do update
         set audio_url_us = case
               when public.master_lexicon.audio_url_us is null
                 or public.master_lexicon.audio_url_us like '${PLACEHOLDER_AUDIO_PREFIX}%'
               then excluded.audio_url_us
               else public.master_lexicon.audio_url_us
             end,
             audio_url_uk = coalesce(public.master_lexicon.audio_url_uk, excluded.audio_url_uk),
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
        audio.US,
        JSON.stringify(entry.synonyms ?? []),
        JSON.stringify(entry.antonyms ?? []),
        JSON.stringify(entry.example_sentences ?? []),
        audio.UK,
      ],
    );

    const translationsRows = (['vi-VN', 'zh-CN'] as const)
      .filter((locale) => entry.translations?.[locale])
      .map((locale) => ({ locale, ...entry.translations[locale] }));
    await this.upsertTranslations(row.id, translationsRows);

    return row.id;
  }

  /**
   * `word_translations` upsert (design system §14.8): one row per
   * (word_id, locale). Called from two places: `enrichAndCache` on a fresh
   * word (a normal cache miss never skips this — the response schema now
   * requires both locales, see gemini-enrichment.service.ts), and
   * `backfillTranslations` repairing an already-cached word that was
   * enriched before that schema fix and is missing one or more locale rows.
   *
   * One multi-row INSERT rather than one query per language (mirrors the
   * single master_lexicon upsert above) — the number of meaning languages
   * shouldn't multiply the query count, and a partial write (one language's
   * row written, the next failing) would leave the pair inconsistent.
   * No-ops without a query when there's nothing to write.
   */
  private async upsertTranslations(
    lexiconId: string,
    translations: Array<{ locale: string; meaning: string; example_translation: string }>,
  ): Promise<void> {
    if (translations.length === 0) return;

    const values: string[] = [];
    const params: unknown[] = [];
    translations.forEach((t, i) => {
      const base = i * 4;
      values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`);
      params.push(lexiconId, t.locale, t.meaning, t.example_translation);
    });

    await this.db.queryAsService(
      `insert into public.word_translations (word_id, locale, meaning, example_translation)
       values ${values.join(', ')}
       on conflict (word_id, locale) do update
         set meaning = excluded.meaning,
             example_translation = excluded.example_translation,
             updated_at = now()`,
      params,
    );
  }

  /**
   * Pronunciation v2 (20261025_word_pron_data.sql): the word's stones (with
   * their place in each accent's clip). Only
   * when missing, unless `remake`. Never fails the word: a word without
   * stones is just not offered in Pronunciation until `npm run pron-backfill`.
   */
  private async fillPronData(lexiconId: string, remake = false): Promise<void> {
    try {
      const [row] = await this.db.queryAsService<PronDataRow & { has_data: boolean }>(
        `select id, normalized_word, language_code, ipa_us, ipa_uk, audio_url_us, audio_url_uk,
                syllables_us is not null as has_data
           from public.master_lexicon where id = $1`,
        [lexiconId],
      );
      if (!row || (row.has_data && !remake)) return;
      const update = pronDataUpdate(row.id, await this.pronData.make(row));
      await this.db.queryAsService(update.text, update.params);
    } catch (err) {
      this.logger.warn(
        `pron data failed for ${lexiconId}, run npm run pron-backfill: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
  }

  /**
   * The accents a clip is made in. The UK clip needs Google TTS (Gemini's
   * voice has no accent to choose), so without a key only the US one.
   */
  private accentsMade(): WordAccent[] {
    return this.wordTts.isConfigured() ? ['US', 'UK'] : ['US'];
  }

  private accentsMissing(row: MasterLexiconRow): WordAccent[] {
    return this.accentsMade().filter((accent) => isMissingAudio(row[AUDIO_COLUMN[accent]]));
  }

  /**
   * Audio for a word in an accent, cheapest source first: the object key is
   * deterministic, so audio made before a database reset is still in storage
   * and is reused for free (the .m4a, or an older .wav). Only a word that
   * never had audio costs a TTS call. New clips come from Google TTS said
   * from the IPA in the accent's sentence voice (keyed by accent + voice +
   * IPA + word); for US only, Gemini TTS, keyed by md5(word), when Google
   * isn't configured or fails. Stored as AAC .m4a (~6× smaller, what the URL
   * points at) plus the WAV at the same key (KEEP_WAV_COPY); WAV only if
   * ffmpeg is missing. Throws on TTS/storage failure; callers decide if
   * that's fatal.
   */
  private async resolveAudioUrl(
    normalizedWord: string,
    languageCode: string,
    ipa: string | null | undefined,
    accent: WordAccent = 'US',
  ): Promise<string> {
    if (this.wordTts.isConfigured()) {
      const madeFrom = `${WORD_VOICES[accent]}@${WORD_SPEAKING_RATE}|${ipaForPhoneme(ipa, accent) ?? ''}`;
      const keyFor = (ext: 'm4a' | 'wav') =>
        StorageService.audioKeyFor(normalizedWord, languageCode, ext, madeFrom, accent);
      const reused = await this.existingAudio(normalizedWord, keyFor);
      if (reused) return reused;
      try {
        const wav = await this.wordTts.synthesizeWord(normalizedWord, ipa, accent);
        return await this.storeAudio(normalizedWord, wav, keyFor);
      } catch (err) {
        // Gemini's voice is American: a UK clip from it would be the wrong accent.
        if (err instanceof UsageCapExceededError || accent === 'UK') throw err;
        this.logger.warn(
          `Google TTS failed for "${normalizedWord}", using Gemini TTS: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    }
    if (accent === 'UK') throw new Error('UK word audio needs GOOGLE_TTS_API_KEY.');
    const keyFor = (ext: 'm4a' | 'wav') =>
      StorageService.audioKeyFor(normalizedWord, languageCode, ext);
    const reused = await this.existingAudio(normalizedWord, keyFor);
    if (reused) return reused;
    const { pcm, sampleRateHz } = await this.gemini.synthesizeSpeech(normalizedWord);
    return this.storeAudio(
      normalizedWord,
      GeminiEnrichmentService.pcmToWav(pcm, sampleRateHz),
      keyFor,
    );
  }

  private async existingAudio(
    normalizedWord: string,
    keyFor: (ext: 'm4a' | 'wav') => string,
  ): Promise<string | null> {
    for (const ext of ['m4a', 'wav'] as const) {
      const existing = keyFor(ext);
      if (await this.storage.hasObject(existing)) {
        this.logger.log(`reusing existing audio for "${normalizedWord}" (no TTS call)`);
        return this.storage.publicUrlFor(existing);
      }
    }
    return null;
  }

  private async storeAudio(
    normalizedWord: string,
    wav: Buffer,
    keyFor: (ext: 'm4a' | 'wav') => string,
  ): Promise<string> {
    const audio = await encodeForWeb(wav);
    if (audio.fallback)
      this.logger.warn(`no AAC for "${normalizedWord}", WAV only: ${audio.fallback}`);
    // Primary first, so its URL is the one returned; the WAV copy sits at
    // the same key with .wav (KEEP_WAV_COPY).
    const urls: string[] = [];
    for (const file of filesToStore(audio, keyFor)) {
      urls.push(await this.storage.upload(file.key, file.body, file.contentType));
    }
    return urls[0];
  }

  /**
   * Gives an existing master_lexicon row real audio in each accent it has
   * none in (or only a placeholder link): `audio_url_us`, then
   * `audio_url_uk` (UK). Re-checks the row first, so a duplicate or stale
   * job is a cheap no-op, and only overwrites a missing/placeholder value.
   * `remake` (audio-backfill --word / --all / --library) replaces both
   * accents' clips, e.g. one that says the word wrong; one that comes out the
   * same is left alone. Throws on the first failure, after writing the
   * accents done so far, so a BullMQ retry only redoes what is missing.
   * True when a clip was written.
   */
  private async ensureAudio(
    lexiconId: string,
    normalizedWord: string,
    languageCode: string,
    remake = false,
  ): Promise<boolean> {
    const [row] = await this.db.queryAsService<MasterLexiconRow>(
      `select id, audio_url_us, audio_url_uk, ipa_us, ipa_uk from public.master_lexicon where id = $1`,
      [lexiconId],
    );
    if (!row) {
      this.logger.warn(`audio backfill: lexicon row ${lexiconId} no longer exists, skipping`);
      return false;
    }
    let changed = false;
    const accents = remake ? this.accentsMade() : this.accentsMissing(row);

    for (const accent of accents) {
      const column = AUDIO_COLUMN[accent];
      const audioUrl = await this.resolveAudioUrl(
        normalizedWord,
        languageCode,
        ipaForAccent(row, accent),
        accent,
      );
      if (remake && audioUrl === row[column]) {
        this.logger.warn(
          `remake of "${normalizedWord}" (${accent}) made the same clip; nothing changed`,
        );
        continue;
      }
      // A remake replaces whatever is there; a fill-in only a missing/placeholder value.
      const onlyIfMissing = remake
        ? ''
        : `and (${column} is null or ${column} like '${PLACEHOLDER_AUDIO_PREFIX}%')`;
      await this.db.queryAsService(
        `update public.master_lexicon
            set ${column} = $2, updated_at = now()
          where id = $1 ${onlyIfMissing}`,
        [lexiconId, audioUrl],
      );
      changed = true;
      this.logger.log(`${accent} audio ready for "${normalizedWord}"`);
    }
    return changed;
  }
}
