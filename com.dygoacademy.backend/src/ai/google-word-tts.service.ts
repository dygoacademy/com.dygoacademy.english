import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { UsageCapService } from './usage-cap.service';

const TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';
/** The Pond's US sentence voice (scripts/speaking-generate.ts), so a word sounds the same in both. */
export const WORD_VOICE = 'en-US-Neural2-F';
/** Same learner pace as the sentence clips (SPEAKING_RATE default). */
export const WORD_SPEAKING_RATE = 0.85;
const SAMPLE_RATE = 24000;

/**
 * The lexicon's IPA as Google's `<phoneme alphabet="ipa">` accepts it. Google
 * silently ignores a `ph` with a symbol it doesn't know and reads the text
 * instead, so drop what it rejects: slashes/brackets, alternatives after
 * "," or ";", optional-sound parentheses (the sound is kept) and combining
 * diacritics (t̬, n̩). Null when nothing usable is left.
 */
export function ipaForPhoneme(ipa: string | null | undefined): string | null {
  if (!ipa) return null;
  const core = ipa
    .trim()
    .replace(/^[/[]+|[/\]]+$/g, '')
    .split(/[,;]/)[0]
    .replace(/[/[\]()]/g, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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
export function wordSsml(word: string, ipa: string | null | undefined): string {
  const ph = ipaForPhoneme(ipa);
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

  /** A 24 kHz mono WAV of `word`. Throws on a cap, network or API error. */
  async synthesizeWord(word: string, ipa: string | null | undefined): Promise<Buffer> {
    const apiKey = this.apiKey();
    if (!apiKey) throw new Error('GOOGLE_TTS_API_KEY is not configured.');
    const ssml = wordSsml(word, ipa);
    await this.usage.take('google_tts', ssml.length);
    const res = await fetch(`${TTS_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        input: { ssml },
        voice: { languageCode: 'en-US', name: WORD_VOICE },
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
