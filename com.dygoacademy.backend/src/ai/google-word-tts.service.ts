import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { UsageCapService } from './usage-cap.service';

const TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

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
 * t); a UK voice gets t, and its US-only symbols mapped
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
   * caller picks it with `ipaForAccent`). Throws on a cap, network or API error.
   */
  async synthesizeWord(
    word: string,
    ipa: string | null | undefined,
    accent: WordAccent = 'US',
  ): Promise<Buffer> {
    const apiKey = this.apiKey();
    if (!apiKey) throw new Error('GOOGLE_TTS_API_KEY is not configured.');
    const ssml = wordSsml(word, ipa, accent);
    await this.usage.take('google_tts', ssml.length);
    const res = await fetch(`${TTS_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        input: { ssml },
        voice: { languageCode: accent === 'UK' ? 'en-GB' : 'en-US', name: WORD_VOICES[accent] },
        audioConfig: {
          audioEncoding: 'LINEAR16',
          sampleRateHertz: SAMPLE_RATE,
          speakingRate: WORD_SPEAKING_RATE,
        },
      }),
    });
    if (!res.ok) {
      throw new Error(`Google TTS ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const body = (await res.json()) as { audioContent?: string };
    if (!body.audioContent) throw new Error(`Google TTS returned no audio for "${word}"`);
    // LINEAR16 comes back as a whole WAV file (RIFF header included).
    return Buffer.from(body.audioContent, 'base64');
  }
}
