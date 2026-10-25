import { apiClient } from '@/lib/api-client';
import type { ClipSpan } from '@/hooks/usePlayer';
import type {
  SpeakingAccent,
  SpeakingCheckQueued,
  SpeakingCheckState,
  SpeakingSessionItem,
  SpeakingSyllable,
  SpeakingTimings,
  SpeakingWordCheckResult,
} from '@/types';

import {
  CHECK_POLL_MS,
  SERVER_CHECK_TIMEOUT_MS,
  SILENCE_GATE_RMS,
  SPEECH_FLOOR_MARGIN_DB,
  SPEECH_MIN_RUN_MS,
  SPEECH_PEAK_RANGE_DB,
  SPEECH_SKIP_MS,
} from './constants';
import { withTimeout } from './check';
import { PRON } from './pron-config';
import { LEARNER_PACE, meterDead } from './session';

/**
 * Pronunciation (P1–P4, P2b; the honeycomb, docs/specs/Pronunciation-
 * honeycomb-implementation-plan.md): say one word, one cell per syllable.
 * The recording rules, the native clips and the word check live here, with
 * no React, so they're unit-tested; the screens draw (lib/pronunciation),
 * PronounceLive holds the mic.
 */

/** The recording stops by itself after this long (the ring round the mic). */
export const PRON_MAX_MS = PRON.maxMs;
/** …or this long after the voice ends. */
export const PRON_SILENCE_MS = PRON.silenceMs;
/** Less voice than this: "We couldn't hear you", nothing is sent. */
export const PRON_MIN_VOICE_MS = PRON.minVoiceMs;
/** The mic listens to the room this long before the beep (for "Too noisy"). */
export const PRON_ROOM_MS = 300;
/** A room at least this loud before the beep… */
export const PRON_NOISY_DBFS = -35;
/** …where the voice never rises this far above it is "Too noisy to hear". */
export const PRON_ONSET_DB = 10;
/** A syllable's length when the timings don't say (P2's live fill). */
export const PRON_SYLLABLE_S = 0.25;
/** "Slowly" plays the native word at this rate (a copy slowed in the browser, pitch kept). */
export const PRON_SLOW_RATE = PRON.slowRate;

// ── Syllables ──────────────────────────────────────────────────────────────

/**
 * The cells for a word: its stored syllables (pronunciation v2). Never the
 * whole word as one cell: a word without stored syllables is not offered
 * (GET /speaking/words says `blocked: no_syllables`), so this is [] for it.
 */
export function wordStones(item: Pick<SpeakingSessionItem, 'syllables'>): SpeakingSyllable[] {
  return item.syllables ?? [];
}


// ── Recording (P2) ─────────────────────────────────────────────────────────

const bars = (ms: number, barsPerSecond: number) =>
  Math.max(1, Math.ceil((ms / 1000) * barsPerSecond));

/**
 * The voice in the live mic bars (RMS, `barsPerSecond` a second, since the
 * recording started), gated the way The Pond's auto-stop is: skip the tap
 * click, gate from the room's noise and the loudest bar, and only runs of
 * SPEECH_MIN_RUN_MS count. `voicedMs`: voice so far; `quietMs`: since the
 * last voice; `peak`: the loudest bar.
 */
export function voiceIn(
  levels: readonly number[],
  barsPerSecond: number,
): { heard: boolean; voicedMs: number; quietMs: number; peak: number } {
  const msPerBar = 1000 / barsPerSecond;
  const body = levels.slice(bars(SPEECH_SKIP_MS, barsPerSecond));
  const minRun = bars(SPEECH_MIN_RUN_MS, barsPerSecond);
  const peak = body.reduce((m, v) => Math.max(m, v), 0);
  if (body.length < minRun) return { heard: false, voicedMs: 0, quietMs: 0, peak };
  const sorted = [...body].sort((a, b) => a - b);
  const gate = Math.max(
    SILENCE_GATE_RMS,
    sorted[Math.floor(0.05 * (sorted.length - 1))] * 10 ** (SPEECH_FLOOR_MARGIN_DB / 20),
    peak * 10 ** (-SPEECH_PEAK_RANGE_DB / 20),
  );
  let run = 0;
  let voiced = 0;
  let lastLoud = -1;
  body.forEach((v, i) => {
    if (v >= gate) {
      run += 1;
      if (run === minRun) voiced += minRun;
      else if (run > minRun) voiced += 1;
      if (run >= minRun) lastLoud = i;
    } else {
      run = 0;
    }
  });
  const heard = voiced > 0;
  return {
    heard,
    voicedMs: voiced * msPerBar,
    quietMs: heard ? (body.length - 1 - lastLoud) * msPerBar : 0,
    peak,
  };
}

/** True once the learner has spoken and then been quiet for PRON_SILENCE_MS. */
export function pronVoiceEnded(levels: readonly number[], barsPerSecond: number): boolean {
  const v = voiceIn(levels, barsPerSecond);
  return v.heard && v.quietMs >= PRON_SILENCE_MS;
}

/**
 * A finished take that isn't worth sending (P2b, no server call): `noisy`
 * when the room was already loud before the beep and the voice never rose
 * clearly above it; `quiet` when there was less than PRON_MIN_VOICE_MS of
 * voice. A dead meter (exact zeros: iOS with the silent switch) can't
 * judge, so the take is sent and the server decides.
 */
export function unusableTake(
  levels: readonly number[],
  roomLevels: readonly number[],
  barsPerSecond: number,
): 'quiet' | 'noisy' | null {
  if (meterDead(levels, barsPerSecond)) return null;
  const v = voiceIn(levels, barsPerSecond);
  const room = [...roomLevels].sort((a, b) => a - b)[Math.floor(roomLevels.length / 2)] ?? 0;
  if (room >= 10 ** (PRON_NOISY_DBFS / 20) && v.peak < room * 10 ** (PRON_ONSET_DB / 20)) {
    return 'noisy';
  }
  return v.voicedMs < PRON_MIN_VOICE_MS ? 'quiet' : null;
}

// ── Native audio ───────────────────────────────────────────────────────────

/** The speaking rate a sentence clip was made at (1 for older clips). */
const madeAt = (timings: SpeakingTimings | null | undefined): number =>
  timings?.speaking_rate && timings.speaking_rate > 0 ? timings.speaking_rate : 1;

/** The accent's sentence clip and timings, each falling back to the other accent. */
function clipFor(item: SpeakingSessionItem, accent: SpeakingAccent) {
  const uk = accent === 'UK';
  return {
    url: uk ? (item.audio_uk_url ?? item.audio_us_url) : (item.audio_us_url ?? item.audio_uk_url),
    timings: uk ? (item.timings_uk ?? item.timings_us) : (item.timings_us ?? item.timings_uk),
  };
}

/**
 * A native clip to play. A span of the sentence clip says the speaking rate
 * the clip was made at (`madeAt`); the word clip has none and plays like the
 * flashcard's.
 */
export interface NativeClip {
  src: string;
  span?: ClipSpan;
  madeAt?: number;
}

/**
 * The player rate for `clip` asked at `rate`: a span of the sentence clip is
 * never quicker than the learner pace, and a slow rate (PRON_SLOW_RATE) is
 * that rate of the voice's own pace, whatever pace the clip was made at.
 */
export function nativeClipRate(clip: NativeClip, rate = 1): number {
  if (clip.madeAt === undefined) return rate;
  return Math.min(1, Math.min(rate, LEARNER_PACE) / clip.madeAt);
}

/**
 * "Hear it": the word said on its own in the accent when there is a
 * recording of it (else the other accent's), else the word's part of the
 * sentence clip (its timings). Null when neither exists.
 */
export function nativeWord(item: SpeakingSessionItem, accent: SpeakingAccent): NativeClip | null {
  const word =
    accent === 'UK'
      ? (item.word_audio_url_uk ?? item.word_audio_url_us)
      : (item.word_audio_url_us ?? item.word_audio_url_uk);
  if (word) return { src: word };
  const { url, timings } = clipFor(item, accent);
  const w = timings?.words[item.target_index];
  if (!url || !w) return null;
  return { src: url, span: { start: w.start, end: w.end }, madeAt: madeAt(timings) };
}

/**
 * The native word's length in seconds at the voice's own pace (the live
 * hint), when the timings have it. A clip made slower for learners
 * (`speaking_rate`) is scaled back, so the hint doesn't ask for slow speech.
 */
export function nativeWordSeconds(item: SpeakingSessionItem, accent: SpeakingAccent): number | null {
  const { timings } = clipFor(item, accent);
  const w = timings?.words[item.target_index];
  return w && w.end > w.start ? (w.end - w.start) * madeAt(timings) : null;
}

/**
 * "Slowly": the accent's word clip at PRON_SLOW_RATE, played from a copy
 * slowed in the browser with the pitch kept (usePlayer, `slow-clip.ts`).
 * The TTS slow clip was dropped on 2026-10-25: Dylan compared the two on
 * /garden/_speaking and this sounded as good.
 */
export function slowWord(
  item: SpeakingSessionItem,
  accent: SpeakingAccent,
): { clip: NativeClip; rate: number } | null {
  const word = nativeWord(item, accent);
  return word ? { clip: word, rate: PRON_SLOW_RATE } : null;
}

// ── The P4 waveform ──────────────────────────────────────────────────────────

/**
 * The voice in `levels` (RMS bars, `barsPerSecond` a second), first to last
 * bar within SPEECH_PEAK_RANGE_DB of the loudest, for the P4 compare
 * waveforms: the take's trailing silence (auto-stop waits PRON_SILENCE_MS)
 * and a clip's quiet ends don't count. `skipMs` drops the tap click of a
 * take. Empty when there's no voice.
 */
export function voicedBars(levels: readonly number[], barsPerSecond: number, skipMs = 0): number[] {
  const body = levels.slice(skipMs > 0 ? bars(skipMs, barsPerSecond) : 0);
  const peak = body.reduce((m, v) => Math.max(m, v), 0);
  const gate = Math.max(SILENCE_GATE_RMS, peak * 10 ** (-SPEECH_PEAK_RANGE_DB / 20));
  const first = body.findIndex((v) => v >= gate);
  if (peak < SILENCE_GATE_RMS || first < 0) return [];
  let last = body.length - 1;
  while (last > first && body[last] < gate) last -= 1;
  return body.slice(first, last + 1);
}

// ── Word check (P3) ────────────────────────────────────────────────────────

/**
 * Sends the take as recorded (m4a on iPhone, webm on Chrome) to `POST
 * /speaking/check-pronunciation`, then asks `GET /speaking/check/:id` every
 * CHECK_POLL_MS until it's done. Rejects (→ P3's "Check again / Record
 * again" card) when the server is busy (503), the check fails, on any
 * other API error, or after SERVER_CHECK_TIMEOUT_MS.
 */
export async function wordCheck(
  req: { recording: Blob; topicWordId: string; accent: SpeakingAccent },
  opts: { pollMs?: number; timeoutMs?: number } = {},
): Promise<SpeakingWordCheckResult> {
  const form = new FormData();
  const ext = req.recording.type.includes('webm')
    ? 'webm'
    : req.recording.type.includes('wav')
      ? 'wav'
      : 'm4a';
  form.append('audio', req.recording, `word.${ext}`);
  form.append('topic_word_id', req.topicWordId);
  form.append('accent', req.accent);
  const pollMs = opts.pollMs ?? CHECK_POLL_MS;
  let stopped = false;
  const work = async (): Promise<SpeakingWordCheckResult> => {
    const queued = await apiClient.upload<SpeakingCheckQueued>('/speaking/check-pronunciation', form);
    while (!stopped) {
      await new Promise((resolve) => setTimeout(resolve, pollMs));
      if (stopped) break;
      const state = await apiClient.get<SpeakingCheckState<SpeakingWordCheckResult>>(
        `/speaking/check/${queued.check_id}`,
      );
      if (state.status === 'done' && state.result) return state.result;
      if (state.status === 'failed') throw new Error(`check failed: ${state.reason ?? 'unknown'}`);
    }
    throw new Error('check timed out');
  };
  return withTimeout(work(), opts.timeoutMs ?? SERVER_CHECK_TIMEOUT_MS).finally(() => {
    stopped = true;
  });
}
