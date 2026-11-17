import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { UsageCapService } from './usage-cap.service';

const TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';
/** SSML mark timepoints are only on v1beta1 (enableTimePointing). */
const TTS_BETA_URL = 'https://texttospeech.googleapis.com/v1beta1/text:synthesize';

/** A word clip's accent: profiles.english_variety en-GB -> UK, anything else -> US. */
export type WordAccent = 'UK' | 'US';

/**
 * The Pond's sentence voices (scripts/speaking-generate.ts), so a word
 * sounds the same in both. Both female. The name is part of a clip's
 * storage key, so changing one makes new files.
 */
export const WORD_VOICES: Record<WordAccent, string> = {
  US: 'en-US-Neural2-F',
  UK: 'en-GB-Neural2-C',
};
/** Same learner pace as the sentence clips (SPEAKING_RATE default). */
export const WORD_SPEAKING_RATE = 0.85;
const SAMPLE_RATE = 24000;

/**
 * The word's IPA for an accent: its own, else the other one (which
 * `ipaForPhoneme` adapts to the voice).
 */
export function ipaForAccent(
  row: { ipa_us?: string | null; ipa_uk?: string | null },
  accent: WordAccent,
): string | null {
  return (accent === 'UK' ? (row.ipa_uk ?? row.ipa_us) : (row.ipa_us ?? row.ipa_uk)) ?? null;
}

/**
 * American symbols the en-GB voices don't know, with their nearest British
 * sound. Checked against the API on 2026-10-25: an en-GB Neural2 voice reads
 * the spelling instead when the `ph` has any of these; en-US takes them all.
 */
const US_ONLY_TO_UK: Array<[RegExp, string]> = [
  [/ɚ/g, 'ə'],
  [/ɝ/g, 'ɜː'],
  [/ɾ/g, 't'],
];

/**
 * The lexicon's IPA as Google's `<phoneme alphabet="ipa">` accepts it for
 * the accent's voice. Google silently ignores a `ph` with a symbol it
 * doesn't know and reads the text instead, so drop what it rejects:
 * slashes/brackets, alternatives after "," or ";", optional-sound
 * parentheses (the sound is kept) and combining diacritics (n̩). The US flap
 * t̬ becomes ɾ, which en-US says as a flap (dropping the mark made a hard
 * t), but only after a vowel or r: after a consonant (loyalty, winter),
 * even across a syllable dot or stress mark, no flap is said, so it becomes
 * a plain t. A UK voice gets t, and its US-only symbols mapped
 * (`US_ONLY_TO_UK`). Null when nothing usable is left.
 */
export function ipaForPhoneme(
  ipa: string | null | undefined,
  accent: WordAccent = 'US',
): string | null {
  if (!ipa) return null;
  let core = ipa
    .trim()
    .replace(/^[/[]+|[/\]]+$/g, '')
    .split(/[,;]/)[0]
    .replace(/[/[\]()]/g, '')
    .normalize('NFD')
    .replace(/([^aeiouæɑɒɔəɛɜɪʊʌɚɝːrɹ.ˈˌ ])([.ˈˌ]?)t\u032C/g, '$1$2t')
    .replace(/t\u032C/g, 'ɾ')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (accent === 'UK') {
    for (const [us, uk] of US_ONLY_TO_UK) core = core.replace(us, uk);
  }
  return core && !/["<>&]/.test(core) ? core : null;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** SSML for one word: said from its IPA when there is one, else from the spelling. */
export function wordSsml(
  word: string,
  ipa: string | null | undefined,
  accent: WordAccent = 'US',
): string {
  const ph = ipaForPhoneme(ipa, accent);
  const text = escapeXml(word);
  return ph
    ? `<speak><phoneme alphabet="ipa" ph="${ph}">${text}</phoneme></speak>`
    : `<speak>${text}</speak>`;
}

/**
 * SSML that says the word one stone at a time, `<mark name="s{k}"/>` before
 * stone k and `<mark name="end"/>` after the last, each stone from its own
 * IPA (`ipas`, stress marks kept) with its spelling as the text. Marks can't
 * go inside a `<phoneme>`, so this is only for timing the stones: it says
 * the word more carefully than `wordSsml` (see pron-syllables syllableSpans).
 */
export function markedWordSsml(
  texts: readonly string[],
  ipas: readonly string[],
  accent: WordAccent = 'US',
): string | null {
  const phs = ipas.map((ipa) => ipaForPhoneme(ipa, accent));
  if (phs.some((ph) => !ph) || texts.length !== ipas.length) return null;
  const body = texts
    .map(
      (t, k) =>
        `<mark name="s${k}"/><phoneme alphabet="ipa" ph="${phs[k]}">${escapeXml(t)}</phoneme>`,
    )
    .join('');
  return `<speak>${body}<mark name="end"/></speak>`;
}

/**
 * Word audio (Hear it, Slowly, Review) from Google Cloud TTS, said from the
 * word's IPA. Replaced Gemini TTS for new clips on 2026-10-18: Gemini's
 * voice model only saw the spelling and sometimes said a different word
 * ("counterfeit" ended in "sit"), while the screen showed the right IPA.
 * Counts characters against today's google_tts cap (S13).
 */
@Injectable()
export class GoogleWordTtsService {
  constructor(
    private readonly config: ConfigService,
    private readonly usage: UsageCapService,
  ) {}

  private apiKey(): string {
    return this.config.get<string>('ai.googleTtsApiKey', '');
  }

  /** False without GOOGLE_TTS_API_KEY; word audio then stays on Gemini TTS. */
  isConfigured(): boolean {
    return !!this.apiKey();
  }

  /**
   * A 24 kHz mono WAV of `word` in the accent's voice, said from `ipa` (the
   * caller picks it with `ipaForAccent`), at the learner pace. Throws on a
   * cap, network or API error.
   */
  async synthesizeWord(
    word: string,
    ipa: string | null | undefined,
    accent: WordAccent = 'US',
  ): Promise<Buffer> {
    return (await this.synthesize(wordSsml(word, ipa, accent), accent, WORD_SPEAKING_RATE, false))
      .wav;
  }

  /**
   * The word said stone by stone (`markedWordSsml`) and when each mark was
   * reached (seconds, by mark name). Null when a stone's IPA can't be said.
   */
  async synthesizeMarked(
    texts: readonly string[],
    ipas: readonly string[],
    accent: WordAccent = 'US',
  ): Promise<{ wav: Buffer; marks: Record<string, number> } | null> {
    const ssml = markedWordSsml(texts, ipas, accent);
    if (!ssml) return null;
    return this.synthesize(ssml, accent, WORD_SPEAKING_RATE, true);
  }

  private async synthesize(
    ssml: string,
    accent: WordAccent,
    speakingRate: number,
    marks: boolean,
  ): Promise<{ wav: Buffer; marks: Record<string, number> }> {
    const apiKey = this.apiKey();
    if (!apiKey) throw new Error('GOOGLE_TTS_API_KEY is not configured.');
    await this.usage.take('google_tts', ssml.length);
    const res = await fetch(`${marks ? TTS_BETA_URL : TTS_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        input: { ssml },
        voice: { languageCode: accent === 'UK' ? 'en-GB' : 'en-US', name: WORD_VOICES[accent] },
        audioConfig: {
          audioEncoding: 'LINEAR16',
          sampleRateHertz: SAMPLE_RATE,
          speakingRate,
        },
        ...(marks ? { enableTimePointing: ['SSML_MARK'] } : {}),
      }),
    });
    if (!res.ok) {
      throw new Error(`Google TTS ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const body = (await res.json()) as {
      audioContent?: string;
      timepoints?: { markName: string; timeSeconds: number }[];
    };
    if (!body.audioContent) throw new Error('Google TTS returned no audio');
    // LINEAR16 comes back as a whole WAV file (RIFF header included).
    return {
      wav: Buffer.from(body.audioContent, 'base64'),
      marks: Object.fromEntries((body.timepoints ?? []).map((t) => [t.markName, t.timeSeconds])),
    };
  }
}

/**
 * The voiced part of a 16-bit PCM WAV (seconds): first to last sample louder
 * than `threshold` (800 ≈ −32 dBFS). Null when it isn't such a WAV or is silent.
 */
export function voicedSpan(wav: Buffer, threshold = 800): { start: number; end: number } | null {
  if (wav.length < 44 || wav.toString('ascii', 0, 4) !== 'RIFF') return null;
  // Find the fmt and data chunks (Google's header is 44 bytes; ffmpeg's can be longer).
  let at = 12;
  let rate = 0;
  let channels = 1;
  let bits = 16;
  while (at + 8 <= wav.length) {
    const id = wav.toString('ascii', at, at + 4);
    const size = wav.readUInt32LE(at + 4);
    if (id === 'fmt ') {
      channels = wav.readUInt16LE(at + 10);
      rate = wav.readUInt32LE(at + 12);
      bits = wav.readUInt16LE(at + 22);
    } else if (id === 'data') {
      if (!rate || bits !== 16) return null;
      const end = Math.min(wav.length, at + 8 + size);
      const frame = 2 * channels;
      let first = -1;
      let last = -1;
      for (let i = at + 8, n = 0; i + 1 < end; i += frame, n++) {
        if (Math.abs(wav.readInt16LE(i)) > threshold) {
          if (first < 0) first = n;
          last = n;
        }
      }
      return first < 0 ? null : { start: first / rate, end: (last + 1) / rate };
    }
    at += 8 + size + (size % 2);
  }
  return null;
}
