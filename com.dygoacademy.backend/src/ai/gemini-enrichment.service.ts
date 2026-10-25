import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, Type } from '@google/genai';

import { UsageCapService } from './usage-cap.service';

/** Mirrors tech spec §4.2's Gemini prompting output exactly. */
export interface LexiconEntry {
  part_of_speech: string | null;
  ipa_us: string | null;
  ipa_uk: string | null;
  cefr_level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | null;
  definition_en: string | null;
  synonyms: Array<{ word: string; level: string }>;
  antonyms: Array<{ word: string; level: string }>;
  example_sentences: Array<{ sentence: string; level: string; translation_hint: string }>;
  /**
   * The review card's meaning-language line (design system §14.8), one
   * entry per app meaning language (i18n/config.ts MEANING_LOCALES: 'vi-VN',
   * 'zh-CN'). `meaning` translates `definition_en`; `example_translation`
   * translates `example_sentences[0]`. Filled in the same call as
   * everything else above — one Gemini call per word, not one per
   * language, to keep the >85% cache-hit KPI's cost saving (BRD §2) rather
   * than multiplying it by the number of meaning languages.
   *
   * Keyed by locale (2026-09-29), not an array: an array's `items` schema
   * only constrains each element's shape, not how many elements come back
   * or which locales they cover, so Gemini was structurally free to return
   * one entry (observed: vi-VN reliably, zh-CN dropped). Naming both
   * locales as required object properties makes an incomplete response a
   * schema violation instead of a silent gap — see
   * `20260929_translations_backfill.md` for the data repair this required.
   */
  translations: TranslationsByLocale;
}

export interface TranslationsByLocale {
  'vi-VN': { meaning: string; example_translation: string };
  'zh-CN': { meaning: string; example_translation: string };
}

export interface SynthesizedAudio {
  /** Raw PCM (16-bit signed LE, mono) as returned by Gemini's TTS model. */
  pcm: Buffer;
  sampleRateHz: number;
}

// gemini-1.5-flash (tech spec §3, "AI Linguistic Engine") was retired —
// confirmed 2026-09-04 it's no longer listed in Google's model docs.
// Tried gemini-2.5-flash-lite next based on that same day's research, but
// live-verified wrong within hours: the real API rejected it outright —
//   404 "This model models/gemini-2.5-flash-lite is no longer available
//   to new users. ... use models/gemini-3.5-flash-lite" — i.e. web
// research and even Google's own docs pages lag what the API actually
// accepts for a freshly-created key; the API's own error is the one
// source that's actually authoritative here. Using its named replacement.
// Kept as a constant rather than config — swapping models is a
// deliberate code change, not an ops toggle.
const TEXT_MODEL = 'gemini-3.5-flash-lite';
// Gemini's own TTS-capable model. The tech spec names a generic "Neural TTS
// engine" without pinning a vendor; using Gemini's rather than adding a
// second AI vendor (e.g. ElevenLabs) keeps one API key and one rate-limit
// budget to manage, and matches the GEMINI_API_KEY-only credential already
// provisioned in .env (no separate TTS credential exists).
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const TTS_VOICE = 'Kore'; // Gemini prebuilt voice — closest to "crisp US female" (tech spec §4.2 audio pipeline note).

/**
 * The prompt's IPA rule. It used to say only "ipa_us for General American,
 * ipa_uk for Received Pronunciation", and Gemini often copied the British
 * IPA into ipa_us (193 of 424 library words, 2026-10-25), so the US clip
 * was said from British sounds. Cambridge Dictionary conventions, with the
 * US features spelled out and an example.
 */
export const IPA_INSTRUCTION = [
  `Dual-accent IPA in the Cambridge Dictionary style, between slashes, with ˈ and ˌ stress marks and syllable dots:`,
  `ipa_uk is Received Pronunciation; ipa_us is real General American, not a copy of ipa_uk.`,
  `In ipa_us use the American sounds: rhotic r after vowels, ɚ (unstressed) and ɝ (stressed) for r-coloured vowels,`,
  `the flapped t written t̬ between vowels (e.g. "water" /ˈwɑː.t̬ɚ/), ɑː where British has ɒ, oʊ where British has əʊ,`,
  `æ in bath words, and ə for unstressed vowels.`,
  `Example: inevitable → ipa_uk /ɪˈnev.ɪ.tə.bəl/, ipa_us /ˌɪnˈev.ə.t̬ə.bəl/.`,
  `Give the same IPA in both only when the word really sounds the same in both accents (e.g. "fish" /fɪʃ/).`,
].join('\n');

/** One meaning-language entry, shared by both keys of `translations` below. */
const TRANSLATION_ENTRY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    meaning: { type: Type.STRING },
    example_translation: { type: Type.STRING },
  },
  required: ['meaning', 'example_translation'],
};

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    part_of_speech: { type: Type.STRING },
    ipa_us: { type: Type.STRING },
    ipa_uk: { type: Type.STRING },
    cefr_level: { type: Type.STRING, enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] },
    definition_en: { type: Type.STRING },
    synonyms: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { word: { type: Type.STRING }, level: { type: Type.STRING } },
        required: ['word', 'level'],
      },
    },
    antonyms: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { word: { type: Type.STRING }, level: { type: Type.STRING } },
        required: ['word', 'level'],
      },
    },
    example_sentences: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sentence: { type: Type.STRING },
          level: { type: Type.STRING },
          translation_hint: { type: Type.STRING },
        },
        required: ['sentence', 'level', 'translation_hint'],
      },
    },
    translations: {
      type: Type.OBJECT,
      properties: {
        'vi-VN': TRANSLATION_ENTRY_SCHEMA,
        'zh-CN': TRANSLATION_ENTRY_SCHEMA,
      },
      required: ['vi-VN', 'zh-CN'],
    },
  },
  required: [
    'part_of_speech',
    'ipa_us',
    'ipa_uk',
    'cefr_level',
    'definition_en',
    'synonyms',
    'antonyms',
    'example_sentences',
    'translations',
  ],
};

/**
 * Module 2 — Gemini 1.5 Flash linguistic extraction + Gemini TTS audio
 * synthesis (tech spec §4.2). Wrapped behind an injectable service, rather
 * than called directly from EnrichmentProcessor, so tests can mock this one
 * seam instead of the SDK.
 */
@Injectable()
export class GeminiEnrichmentService {
  private readonly logger = new Logger(GeminiEnrichmentService.name);
  private client: GoogleGenAI | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly usage: UsageCapService,
  ) {}

  /**
   * Every Gemini call goes through here: one unit of today's cap first
   * (S13), then the SDK. Over the cap it throws UsageCapExceededError
   * without calling Google.
   */
  private async generate(
    request: Parameters<GoogleGenAI['models']['generateContent']>[0],
  ): ReturnType<GoogleGenAI['models']['generateContent']> {
    const client = this.getClient();
    await this.usage.take('gemini');
    return client.models.generateContent(request);
  }

  /** Lazy — avoids constructing the SDK client (and needing a key) at boot for routes that never enrich. */
  private getClient(): GoogleGenAI {
    if (!this.client) {
      const apiKey = this.config.get<string>('ai.geminiApiKey', '');
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured.');
      }
      this.client = new GoogleGenAI({ apiKey });
    }
    return this.client;
  }

  async enrichWord(
    word: string,
    languageCode: string,
    targetCEFR?: 'A2' | 'B1' | 'B2' | 'C1',
  ): Promise<LexiconEntry> {
    const prompt = [
      `You are a professional lexicographer building a language-learning dictionary entry.`,
      `Word: "${word}"`,
      `Language: ${languageCode}`,
      targetCEFR
        ? `Bias example sentences toward CEFR level ${targetCEFR} where natural.`
        : `Choose the example sentences' CEFR levels to fit the word's own difficulty.`,
      `Provide exactly 5 synonyms and exactly 5 antonyms (fewer only if the word truly has none — do not pad with unrelated words), and 2 example sentences at different CEFR levels.`,
      IPA_INSTRUCTION,
      `If the word has no clean antonym (e.g. most nouns), return an empty array rather than forcing unrelated words.`,
      `Also provide "translations", an object with exactly two keys, "vi-VN" and "zh-CN" — both are required, ` +
        `neither may be omitted. Each key's "meaning" is a natural, idiomatic translation of definition_en into ` +
        `that language for a language learner (not a literal word-for-word gloss), and "example_translation" ` +
        `translates the first example sentence into that language.`,
    ].join('\n');

    const response = await this.generate({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.2, // low — this is a reference lookup, not creative writing
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error(`Gemini returned no content for "${word}"`);
    }

    let parsed: LexiconEntry;
    try {
      parsed = JSON.parse(text) as LexiconEntry;
    } catch (err) {
      throw new Error(`Gemini returned unparseable JSON for "${word}": ${(err as Error).message}`, {
        cause: err,
      });
    }
    return parsed;
  }

  /**
   * Translations-only re-run for a word master_lexicon already has fields
   * for (definition_en, an example sentence) but `word_translations` is
   * missing a locale for — the 2026-09-29 backfill after the array→object
   * schema fix above (see `scripts/translations-backfill.js`). Much
   * cheaper than `enrichWord`: no IPA/synonyms/antonyms/audio round trip,
   * just the two-locale translation object, reusing the schema's own
   * both-required guarantee.
   */
  async translateMeaning(
    definitionEn: string,
    exampleSentence: string,
  ): Promise<TranslationsByLocale> {
    const prompt = [
      `You are a professional lexicographer localizing an English dictionary entry.`,
      `English definition: "${definitionEn}"`,
      `English example sentence: "${exampleSentence}"`,
      `Provide "vi-VN" and "zh-CN" — both are required, neither may be omitted. Each key's "meaning" is a ` +
        `natural, idiomatic translation of the definition into that language for a language learner (not a ` +
        `literal word-for-word gloss), and "example_translation" translates the example sentence into that ` +
        `language.`,
    ].join('\n');

    const response = await this.generate({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: { 'vi-VN': TRANSLATION_ENTRY_SCHEMA, 'zh-CN': TRANSLATION_ENTRY_SCHEMA },
          required: ['vi-VN', 'zh-CN'],
        },
        temperature: 0.2,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error(`Gemini returned no content translating "${definitionEn}"`);
    }
    try {
      return JSON.parse(text) as TranslationsByLocale;
    } catch (err) {
      throw new Error(
        `Gemini returned unparseable JSON translating "${definitionEn}": ${(err as Error).message}`,
        { cause: err },
      );
    }
  }

  async synthesizeSpeech(word: string): Promise<SynthesizedAudio> {
    const response = await this.generate({
      model: TTS_MODEL,
      contents: `Pronounce this word clearly, at a moderate learner-friendly pace: ${word}`,
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: TTS_VOICE } },
        },
      },
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    const inline = part?.inlineData;
    if (!inline?.data) {
      throw new Error(`Gemini TTS returned no audio for "${word}"`);
    }

    // Gemini TTS returns raw 16-bit PCM, mono, 24kHz (mimeType audio/L16;rate=24000).
    const rateMatch = /rate=(\d+)/.exec(inline.mimeType ?? '');
    const sampleRateHz = rateMatch ? parseInt(rateMatch[1], 10) : 24000;

    return { pcm: Buffer.from(inline.data, 'base64'), sampleRateHz };
  }

  /**
   * FR-5.5 — "AI explains why the choice was wrong and clarifies the
   * nuance difference." Called from `QuizService.answer` **only when the
   * submission was wrong** — same cost-avoidance instinct as
   * `master_lexicon`'s dedup lookup: a correct answer needs no explanation,
   * so no Gemini call is spent on one. Free-text response, not
   * structured-JSON like `enrichWord` — a short paragraph of prose is the
   * actual product here, not a field to store or re-render into a schema.
   */
  async explainNuance(
    word: string,
    correctAnswer: string,
    submittedAnswer: string,
    context: string,
    /**
     * Language to write the explanation in (e.g. "Vietnamese"), from the
     * garden's app language via `nuanceLanguage`; null/omitted = English.
     */
    language?: string | null,
  ): Promise<string> {
    const prompt = [
      `You are a friendly language-learning tutor giving one-sentence feedback on a quiz mistake.`,
      `Question context: ${context}`,
      `The correct answer was: "${correctAnswer}"`,
      `The student answered: "${submittedAnswer}"`,
      word && word.toLowerCase() !== correctAnswer.toLowerCase()
        ? `The word being studied is "${word}".`
        : '',
      `In 1-2 short sentences, explain *why* the student's answer is wrong and clarify the nuance ` +
        `difference from the correct answer. Be encouraging, not scolding. Do not just restate the correct answer.`,
      language
        ? `Write the explanation in ${language}. Keep the English words and answers in English, inside quotation marks.`
        : '',
      `Write plain text only: no Markdown, no asterisks, no bold, no bullet points.`,
    ]
      .filter(Boolean)
      .join('\n');

    const response = await this.generate({
      model: TEXT_MODEL,
      contents: prompt,
      config: { temperature: 0.4 },
    });

    return response.text?.trim() || `Not quite — the correct answer was "${correctAnswer}".`;
  }

  /**
   * Wraps raw PCM in a WAV container. Stored as `.wav`, not the `.mp3` tech
   * spec §4.2 names — an MP3 encoder needs a native codec (lame/ffmpeg) not
   * available in this sandbox. WAV needs zero dependencies and plays
   * natively in every browser `<audio>` tag the frontend uses, so nothing
   * downstream breaks; swapping to real MP3 later is a drop-in change to
   * this one function plus the R2 key extension. Flagged in the session
   * report for a follow-up pass with ffmpeg available.
   */
  static pcmToWav(pcm: Buffer, sampleRateHz: number, channels = 1, bitsPerSample = 16): Buffer {
    const blockAlign = (channels * bitsPerSample) / 8;
    const byteRate = sampleRateHz * blockAlign;
    const header = Buffer.alloc(44);

    header.write('RIFF', 0, 'ascii');
    header.writeUInt32LE(36 + pcm.length, 4);
    header.write('WAVE', 8, 'ascii');
    header.write('fmt ', 12, 'ascii');
    header.writeUInt32LE(16, 16); // fmt chunk size
    header.writeUInt16LE(1, 20); // PCM format
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRateHz, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36, 'ascii');
    header.writeUInt32LE(pcm.length, 40);

    return Buffer.concat([header, pcm]);
  }
}
