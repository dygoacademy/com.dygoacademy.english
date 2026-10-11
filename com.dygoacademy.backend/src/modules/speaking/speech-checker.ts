import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { toScorerWordResult, type PronunciationReply } from './pronunciation-word';

/**
 * Phase 13 S17 / G6: checks a learner's recording against a sentence.
 * `SPEECH_CHECKER` is the injection token, so the scorer behind it can be
 * swapped (the Mac scorer today; a paid service later) without touching the
 * endpoint. The recording is only ever held in memory.
 */
export const SPEECH_CHECKER = Symbol('SPEECH_CHECKER');

/**
 * One word in the scorer's reply (docker/speech, `POST /check-pronunciation`; `/check` has the
 * same fields). `score` is null for a word the GOPT scorer couldn't score (no known phones, or
 * audio too short to align): Whisper alone decided its status. The mapper doesn't read it.
 */
export interface ScorerWord {
  index: number;
  text: string;
  score: number | null;
  status: 'ok' | 'unclear' | 'missing';
  heard: string | null;
  start: number | null;
  end: number | null;
}

/** The scorer's reply, provider-neutral. */
export interface ScorerResult {
  total: number;
  heard_text: string;
  duration_ms: number;
  latency_ms: number;
  words: ScorerWord[];
}

/** What the Pronunciation stones show for one word, per syllable (built from `POST /check-pronunciation`, see pronunciation-word.ts). */
export interface ScorerWordResult {
  status: 'ok' | 'not_heard' | 'other_word';
  total: number;
  heard_text: string;
  duration_ms: number;
  latency_ms: number;
  syllables: { ipa: string; score: number; wobbly: boolean; heard_ipa: string | null }[];
}

export interface SpeechAudio {
  buffer: Buffer;
  mimetype: string;
  filename: string;
}

export interface SpeechChecker {
  /** `targetIndex`: the practised word's position in sentence.split() (it weighs more, M4-a). */
  check(
    audio: SpeechAudio,
    sentence: string,
    targetIndex: number | undefined,
    /** Which scorer: the queue worker picks a free one from SPEECH_SCORER_URLS. */
    scorerUrl: string,
  ): Promise<ScorerResult>;
  /** One word (Pronunciation): `ipa` for the practised accent, '' when the word has none. */
  checkWord(
    audio: SpeechAudio,
    word: string,
    ipa: string,
    scorerUrl: string,
  ): Promise<ScorerWordResult>;
}

/** Why a check failed, for the endpoint's status code. */
export class SpeechCheckError extends Error {
  constructor(
    readonly kind: 'unavailable' | 'timeout' | 'bad_audio',
    message: string,
  ) {
    super(message);
  }
}

/**
 * The free scorer on this Mac (docker compose service `speech`, README
 * "Speech checking"). Multipart `audio` + `sentence` to `{scorerUrl}/check-pronunciation`
 * (the GOPT scorer; `/check` is the older GOP one, same reply fields);
 * a word goes to the same endpoint as a one-word sentence (the old `/check-word` is gone).
 * Logs status and timings only, never the audio, the sentence or what was
 * heard.
 */
@Injectable()
export class MacSpeechChecker implements SpeechChecker {
  private readonly log = new Logger(MacSpeechChecker.name);

  constructor(private readonly config: ConfigService) {}

  async check(
    audio: SpeechAudio,
    sentence: string,
    targetIndex: number | undefined,
    scorerUrl: string,
  ): Promise<ScorerResult> {
    const fields: Record<string, string> = { sentence };
    if (targetIndex !== undefined) fields.target_index = String(targetIndex);
    return this.post<ScorerResult>(`${scorerUrl}/check-pronunciation`, audio, fields);
  }

  async checkWord(
    audio: SpeechAudio,
    word: string,
    ipa: string,
    scorerUrl: string,
  ): Promise<ScorerWordResult> {
    const raw = await this.post<PronunciationReply>(`${scorerUrl}/check-pronunciation`, audio, {
      sentence: word,
    });
    return toScorerWordResult(raw, word, ipa);
  }

  private async post<T>(
    url: string,
    audio: SpeechAudio,
    fields: Record<string, string>,
  ): Promise<T> {
    const timeoutMs = this.config.get<number>('speech.timeoutMs') ?? 8000;
    const form = new FormData();
    form.append(
      'audio',
      new Blob([new Uint8Array(audio.buffer)], { type: audio.mimetype }),
      audio.filename,
    );
    for (const [name, value] of Object.entries(fields)) form.append(name, value);

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      const name = (err as { name?: string }).name;
      if (name === 'TimeoutError' || name === 'AbortError') {
        this.log.warn(`speech check timed out after ${timeoutMs} ms`);
        throw new SpeechCheckError('timeout', 'Speech check timed out');
      }
      this.log.warn(`speech scorer unreachable: ${name ?? 'error'}`);
      throw new SpeechCheckError('unavailable', 'Speech check is unavailable');
    }
    if (res.status === 422 || res.status === 413) {
      throw new SpeechCheckError('bad_audio', 'The recording could not be checked');
    }
    if (!res.ok) {
      this.log.warn(`speech scorer answered ${res.status}`);
      throw new SpeechCheckError('unavailable', 'Speech check is unavailable');
    }
    return (await res.json()) as T;
  }
}
