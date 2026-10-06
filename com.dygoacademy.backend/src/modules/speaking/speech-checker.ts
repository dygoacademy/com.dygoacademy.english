import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Phase 13 S17 / G6: checks a learner's recording against a sentence.
 * `SPEECH_CHECKER` is the injection token, so the scorer behind it can be
 * swapped (the Mac scorer today; a paid service later) without touching the
 * endpoint. The recording is only ever held in memory.
 */
export const SPEECH_CHECKER = Symbol('SPEECH_CHECKER');

/** One word in the scorer's reply (docker/speech, `POST /check`). */
export interface ScorerWord {
  index: number;
  text: string;
  score: number;
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
    targetIndex?: number,
    /** Which scorer (queue v1 picks one from the pool); default `speech.scorerUrl`. */
    scorerUrl?: string,
  ): Promise<ScorerResult>;
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
 * "Speech checking"). Multipart `audio` + `sentence` to `{scorerUrl}/check`.
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
    targetIndex?: number,
    scorerUrl?: string,
  ): Promise<ScorerResult> {
    const url = `${scorerUrl ?? this.config.get<string>('speech.scorerUrl')}/check`;
    const timeoutMs = this.config.get<number>('speech.timeoutMs') ?? 8000;
    const form = new FormData();
    form.append(
      'audio',
      new Blob([new Uint8Array(audio.buffer)], { type: audio.mimetype }),
      audio.filename,
    );
    form.append('sentence', sentence);
    if (targetIndex !== undefined) form.append('target_index', String(targetIndex));

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
    return (await res.json()) as ScorerResult;
  }
}
