import { Injectable, OnModuleDestroy } from '@nestjs/common';

import type { SpeechAudio } from './speech-checker';
import type {
  SpeakingCheckResult,
  SpeakingCheckStatus,
  SpeakingWordCheckResult,
} from './speaking.types';

/** A recording waits at most this long for a worker, then it's dropped. */
export const AUDIO_TTL_MS = 60_000;
/** A check's status and result can be read for this long. */
export const RESULT_TTL_MS = 10 * 60_000;

interface Entry {
  userId: string;
  status: SpeakingCheckStatus;
  result?: SpeakingCheckResult | SpeakingWordCheckResult;
  /** Why it failed: `bad_audio`, `timeout`, `unavailable`, `expired`. */
  reason?: string;
  audio?: SpeechAudio;
  audioUntil: number;
  until: number;
}

/**
 * Queue v1 (2026-10-06): the recordings and results of queued speech checks,
 * in this API process's memory only. The BullMQ job carries the check id,
 * never the audio: Redis saves to disk and recordings are never stored
 * (Phase 13 D2). `takeAudio` hands a recording to one worker and forgets it;
 * anything left over expires (audio after AUDIO_TTL_MS, results after
 * RESULT_TTL_MS). One API process (UAT today): a restart loses waiting
 * checks, which then report `failed` / `expired`. Several API processes
 * would need a shared, non-persistent store instead.
 */
@Injectable()
export class SpeechCheckStore implements OnModuleDestroy {
  private readonly entries = new Map<string, Entry>();
  private readonly sweeper = setInterval(() => this.sweep(), 30_000);

  constructor() {
    this.sweeper.unref?.();
  }

  onModuleDestroy(): void {
    clearInterval(this.sweeper);
  }

  add(checkId: string, userId: string, audio: SpeechAudio, now = Date.now()): void {
    this.entries.set(checkId, {
      userId,
      status: 'queued',
      audio,
      audioUntil: now + AUDIO_TTL_MS,
      until: now + RESULT_TTL_MS,
    });
  }

  /** The recording for a worker, once; null if gone (expired, taken, unknown). */
  takeAudio(checkId: string, now = Date.now()): SpeechAudio | null {
    const e = this.entries.get(checkId);
    if (!e?.audio) return null;
    const audio = e.audio;
    e.audio = undefined;
    if (now > e.audioUntil) return null;
    e.status = 'checking';
    return audio;
  }

  done(checkId: string, result: SpeakingCheckResult | SpeakingWordCheckResult): void {
    const e = this.entries.get(checkId);
    if (e) Object.assign(e, { status: 'done', result, audio: undefined });
  }

  failed(checkId: string, reason: string): void {
    const e = this.entries.get(checkId);
    if (e) Object.assign(e, { status: 'failed', reason, audio: undefined });
  }

  /** The check as its owner sees it; null for anyone else, or once expired. */
  get(
    checkId: string,
    userId: string,
    now = Date.now(),
  ): Pick<Entry, 'status' | 'result' | 'reason'> | null {
    const e = this.entries.get(checkId);
    if (!e || e.userId !== userId || now > e.until) return null;
    if (e.status === 'queued' && now > e.audioUntil) {
      e.status = 'failed';
      e.reason = 'expired';
      e.audio = undefined;
    }
    return { status: e.status, result: e.result, reason: e.reason };
  }

  /** Drops expired audio and results. */
  sweep(now = Date.now()): void {
    for (const [id, e] of this.entries) {
      if (e.audio && now > e.audioUntil) e.audio = undefined;
      if (now > e.until) this.entries.delete(id);
    }
  }

  /** For tests and the busy check. */
  size(): number {
    return this.entries.size;
  }
}

/**
 * The scorers the worker may use (SPEECH_SCORER_URLS), one check at a time
 * each. The worker's concurrency equals `size`, so `acquire` always finds a
 * free one; round-robin start so load spreads.
 */
export class ScorerPool {
  private readonly busy = new Set<string>();
  private next = 0;

  constructor(private readonly urls: readonly string[]) {
    if (urls.length === 0) throw new Error('no speech scorer configured');
  }

  get size(): number {
    return this.urls.length;
  }

  acquire(): string {
    for (let i = 0; i < this.urls.length; i++) {
      const url = this.urls[(this.next + i) % this.urls.length];
      if (!this.busy.has(url)) {
        this.busy.add(url);
        this.next = (this.next + i + 1) % this.urls.length;
        return url;
      }
    }
    throw new Error('no free speech scorer');
  }

  release(url: string): void {
    this.busy.delete(url);
  }
}
