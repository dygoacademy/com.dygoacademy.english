import { Injectable, Logger } from '@nestjs/common';

import {
  buildSyllables,
  ipaPerStone,
  pronTip,
  syllableSpans,
  type PronTip,
  type StoredSyllable,
} from '../modules/speaking/pron-syllables';
import { StorageService } from '../storage/storage.service';
import {
  GoogleWordTtsService,
  WordAccent,
  ipaForAccent,
  voicedSpan,
} from './google-word-tts.service';

/** A master_lexicon row as this service reads it. */
export interface PronDataRow {
  id: string;
  normalized_word: string;
  language_code: string;
  ipa_us: string | null;
  ipa_uk: string | null;
  audio_url_us: string | null;
  audio_url_uk: string | null;
}

/** What it writes back (20261025_word_pron_data.sql). Null syllables = no stones: the word is blocked. */
export interface PronData {
  syllables_us: StoredSyllable[] | null;
  syllables_uk: StoredSyllable[] | null;
  pron_tip: PronTip | null;
}

const CLIP_COLUMN: Record<WordAccent, 'audio_url_us' | 'audio_url_uk'> = {
  US: 'audio_url_us',
  UK: 'audio_url_uk',
};

/**
 * Pronunciation v2 (plan of 2026-10-25): a word's stored stones and P1
 * tip. Per accent:
 *
 * - Stones: the spelling split to match the IPA (`buildSyllables`); none
 *   when they can't be worked out (the word is then not offered).
 * - Where each stone is in the word clip: Google TTS says the word one
 *   `<phoneme>` per stone with an SSML mark before each, and the mark times
 *   are scaled onto the word clip's voiced part (`syllableSpans`); the clip
 *   is read from storage (its .wav copy), else made again from the IPA. A
 *   word with one stone needs no marks. Without Google TTS the spans stay null.
 *
 * No slow clip since 2026-10-25: Slowly plays the word clip slowed in the
 * browser (Dylan compared the two on /garden/_speaking and chose that).
 *
 * Used by the enrichment worker (new words, fill-ins) and by
 * scripts/pron-backfill.ts, which builds it without Nest.
 */
@Injectable()
export class PronDataService {
  private readonly logger = new Logger(PronDataService.name);

  constructor(
    private readonly tts: GoogleWordTtsService,
    private readonly storage: StorageService,
  ) {}

  /** The accents made: both with Google TTS, else US only (stones still, no spans). */
  accents(): WordAccent[] {
    return this.tts.isConfigured() ? ['US', 'UK'] : ['US'];
  }

  /** Makes everything for `row`. Throws on a TTS cap or storage error (the caller decides). */
  async make(row: PronDataRow): Promise<PronData> {
    const word = row.normalized_word;
    const out: PronData = {
      syllables_us: null,
      syllables_uk: null,
      pron_tip: null,
    };
    for (const accent of this.accents()) {
      const ipa = ipaForAccent(row, accent);
      const stones = buildSyllables(word, ipa);
      const key = accent === 'UK' ? 'uk' : 'us';
      if (stones.length > 0) {
        out[`syllables_${key}`] = this.tts.isConfigured()
          ? await this.withSpans(word, ipa, accent, stones, row[CLIP_COLUMN[accent]])
          : stones;
      }
    }
    const tipStones = out.syllables_us ?? out.syllables_uk;
    out.pron_tip = tipStones ? pronTip(tipStones) : null;
    return out;
  }

  private async withSpans(
    word: string,
    ipa: string | null,
    accent: WordAccent,
    stones: StoredSyllable[],
    clipUrl: string | null,
  ): Promise<StoredSyllable[]> {
    const clip = await this.clipWav(word, ipa, accent, clipUrl);
    const clipVoiced = clip ? voicedSpan(clip) : null;
    if (!clipVoiced) return stones;
    let marks: { times: number[]; voiced: { start: number; end: number } } | null = null;
    const ipas = stones.length > 1 ? ipaPerStone(ipa, stones.length) : null;
    if (ipas) {
      const marked = await this.tts.synthesizeMarked(
        stones.map((s) => s.text),
        ipas,
        accent,
      );
      const voiced = marked ? voicedSpan(marked.wav) : null;
      const times = marked ? stones.map((_, k) => marked.marks[`s${k}`]) : [];
      if (voiced && times.every((t) => typeof t === 'number')) marks = { times, voiced };
    }
    if (stones.length > 1 && !marks) {
      this.logger.warn(
        `pron data: no SSML marks for "${word}" (${accent}), stones split by letters`,
      );
    }
    const spans = syllableSpans(stones, clipVoiced, marks);
    return stones.map((s, k) => ({ ...s, ...spans[k] }));
  }

  /** The word clip as WAV: its stored .wav copy, else made again (Google TTS is deterministic). */
  private async clipWav(
    word: string,
    ipa: string | null,
    accent: WordAccent,
    clipUrl: string | null,
  ): Promise<Buffer | null> {
    const key = this.storage.keyForUrl(clipUrl);
    if (key) {
      const wav = await this.storage.getObject(key.replace(/\.m4a$/, '.wav'));
      if (wav) return wav;
    }
    if (!clipUrl) return null;
    return this.tts.synthesizeWord(word, ipa, accent);
  }
}

/** The update that stores `data` on master_lexicon row `id` (enrichment and the backfill). */
export function pronDataUpdate(id: string, data: PronData): { text: string; params: unknown[] } {
  return {
    text: `update public.master_lexicon
              set syllables_us = $2::jsonb, syllables_uk = $3::jsonb, pron_tip = $4::jsonb,
                  updated_at = now()
            where id = $1`,
    params: [
      id,
      data.syllables_us ? JSON.stringify(data.syllables_us) : null,
      data.syllables_uk ? JSON.stringify(data.syllables_uk) : null,
      data.pron_tip ? JSON.stringify(data.pron_tip) : null,
    ],
  };
}
