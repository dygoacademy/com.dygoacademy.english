import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, Type } from '@google/genai';

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

  constructor(private readonly config: ConfigService) {}

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
      `Dual-accent IPA: ipa_us for General American, ipa_uk for Received Pronunciation.`,
      `If the word has no clean antonym (e.g. most nouns), return an empty array rather than forcing unrelated words.`,
    ].join('\n');

    const response = await this.getClient().models.generateContent({
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

  async synthesizeSpeech(word: string): Promise<SynthesizedAudio> {
    const response = await this.getClient().models.generateContent({
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

    const response = await this.getClient().models.generateContent({
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
