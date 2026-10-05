/**
 * The Pond's flow (T6, plan §2): listen → recording → compare → (next |
 * done), as a pure reducer so it can be tested without audio. Try again
 * goes back to recording; Cancel back to listen. The screens and
 * SpeakLive hold the audio; this holds where the learner is.
 */
import type { SpeakingAccent, SpeakingSessionItem, SpeakingStage, SpeakingTimings } from '@/types';

import {
  AUTO_STOP_SILENCE_MS,
  FOLLOW_ALONG_SLOWDOWN,
  NOT_HEARD_MS,
  SILENCE_GATE_RMS,
  SPEECH_FLOOR_MARGIN_DB,
  SPEECH_MIN_RUN_MS,
  SPEECH_PEAK_RANGE_DB,
  SPEECH_SKIP_MS,
} from './constants';

export type SpeakPhase = 'listen' | 'recording' | 'compare' | 'done';

export interface SpeakState {
  phase: SpeakPhase;
  /** Sentence being practised (0-based). */
  index: number;
  total: number;
  /** Best stage reached per sentence index (for SP4). */
  best: Record<number, { stage: SpeakingStage; score: number }>;
}

export type SpeakAction =
  | { type: 'record' }
  | { type: 'cancel' }
  | { type: 'stopped' }
  | { type: 'scored'; stage: SpeakingStage; score: number }
  | { type: 'tryAgain' }
  | { type: 'next' };

export function initialSpeakState(total: number): SpeakState {
  return { phase: total > 0 ? 'listen' : 'done', index: 0, total, best: {} };
}

export function speakReducer(state: SpeakState, action: SpeakAction): SpeakState {
  switch (action.type) {
    case 'record':
      return state.phase === 'listen' || state.phase === 'compare'
        ? { ...state, phase: 'recording' }
        : state;
    case 'cancel':
      return state.phase === 'recording' || state.phase === 'compare'
        ? { ...state, phase: 'listen' }
        : state;
    case 'stopped':
      return state.phase === 'recording' ? { ...state, phase: 'compare' } : state;
    case 'scored': {
      if (state.phase !== 'compare') return state;
      const prev = state.best[state.index];
      if (prev && prev.score >= action.score) return state;
      return {
        ...state,
        best: {
          ...state.best,
          [state.index]: { stage: action.stage, score: action.score },
        },
      };
    }
    case 'tryAgain':
      return state.phase === 'compare' ? { ...state, phase: 'recording' } : state;
    case 'next': {
      if (state.phase !== 'compare' && state.phase !== 'listen') return state;
      const index = state.index + 1;
      return index >= state.total
        ? { ...state, phase: 'done' }
        : { ...state, phase: 'listen', index };
    }
    default:
      return state;
  }
}

/**
 * SP2 follow-along: index of the last word the learner has probably
 * reached, assuming native pace (words up to it are dark, the rest faded).
 * -1 before the first word starts.
 */
export function followAlongIndex(
  timings: SpeakingTimings | null | undefined,
  elapsedSeconds: number,
  slowdown = FOLLOW_ALONG_SLOWDOWN,
): number {
  if (!timings) return -1;
  elapsedSeconds /= slowdown;
  let last = -1;
  timings.words.forEach((w, i) => {
    if (w.start <= elapsedSeconds) last = i;
  });
  return last;
}

/** "0:02" from ms (whole seconds, rounded down). */
export function formatClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Where the voice is in the live mic bars (RMS, `barsPerSecond` a second,
 * since recording started). Same idea as the scorer's `speechRange`: skip
 * the tap click, gate from the room's own noise and the loudest bar, and
 * only a run of SPEECH_MIN_RUN_MS above the gate counts as voice.
 * `heard`: some voice so far; `quietBars`: bars since the last one above
 * the gate.
 */
function voiceState(levels: readonly number[], barsPerSecond: number) {
  const bars = (ms: number) => Math.max(1, Math.ceil((ms / 1000) * barsPerSecond));
  const body = levels.slice(bars(SPEECH_SKIP_MS));
  const minRun = bars(SPEECH_MIN_RUN_MS);
  if (body.length < minRun) return { heard: false, quietBars: body.length, bars };
  const sorted = [...body].sort((a, b) => a - b);
  const at = (p: number) => sorted[Math.floor(p * (sorted.length - 1))];
  const gate = Math.max(
    SILENCE_GATE_RMS,
    at(0.05) * 10 ** (SPEECH_FLOOR_MARGIN_DB / 20),
    at(1) * 10 ** (-SPEECH_PEAK_RANGE_DB / 20),
  );
  let run = 0;
  let heard = false;
  let lastLoud = -1;
  body.forEach((v, i) => {
    if (v >= gate) {
      lastLoud = i;
      run += 1;
      if (run >= minRun) heard = true;
    } else {
      run = 0;
    }
  });
  return { heard, quietBars: body.length - 1 - lastLoud, bars };
}

/**
 * What the auto-stop sees (dev page, S19): whether voice was heard, how
 * long it has been quiet against the AUTO_STOP_SILENCE_MS it waits for, the
 * gate a bar must reach to count as sound, the room's noise floor (5th
 * percentile) and the loudest bar, in dBFS; plus the longest quiet stretch
 * after voice. If `quietMs` never reaches the target while the speaker is
 * silent, background sound above `gateDb` is what keeps it recording.
 */
export function speechDiagnostics(levels: readonly number[], barsPerSecond: number) {
  const msPerBar = 1000 / barsPerSecond;
  const db = (v: number) => (v > 0 ? 20 * Math.log10(v) : -Infinity);
  const v = voiceState(levels, barsPerSecond);
  const body = levels.slice(v.bars(SPEECH_SKIP_MS));
  const sorted = [...body].sort((a, b) => a - b);
  const at = (p: number) => (sorted.length ? sorted[Math.floor(p * (sorted.length - 1))] : 0);
  const gate = Math.max(
    SILENCE_GATE_RMS,
    at(0.05) * 10 ** (SPEECH_FLOOR_MARGIN_DB / 20),
    at(1) * 10 ** (-SPEECH_PEAK_RANGE_DB / 20),
  );
  // Longest run below the gate after the first voice (a run of SPEECH_MIN_RUN_MS).
  const minRun = v.bars(SPEECH_MIN_RUN_MS);
  let run = 0;
  let voiced = false;
  let quiet = 0;
  let longest = 0;
  for (const level of body) {
    if (level >= gate) {
      run += 1;
      if (run >= minRun) voiced = true;
      quiet = 0;
    } else {
      run = 0;
      if (voiced) longest = Math.max(longest, ++quiet);
    }
  }
  return {
    meterDead: meterDead(levels, barsPerSecond),
    heard: v.heard,
    quietMs: v.heard ? v.quietBars * msPerBar : 0,
    targetMs: AUTO_STOP_SILENCE_MS,
    longestQuietMs: longest * msPerBar,
    gateDb: db(gate),
    floorDb: db(at(0.05)),
    peakDb: db(at(1)),
  };
}

/**
 * True once the learner has spoken and then been quiet for
 * AUTO_STOP_SILENCE_MS: the recording stops by itself (handover v2 §3.2).
 * Never true before any voice, so a late start just waits (see `notHeard`).
 */
export function voiceEnded(levels: readonly number[], barsPerSecond: number): boolean {
  const v = voiceState(levels, barsPerSecond);
  return v.heard && v.quietBars >= v.bars(AUTO_STOP_SILENCE_MS);
}

/**
 * True when NOT_HEARD_MS have passed since recording started and there
 * was no voice at all: SP2 stops and says "We couldn't hear you".
 */
export function notHeard(
  levels: readonly number[],
  barsPerSecond: number,
  elapsedMs: number,
): boolean {
  if (meterDead(levels, barsPerSecond)) return false; // can't judge: wait for a tap or the cap
  return elapsedMs >= NOT_HEARD_MS && !voiceState(levels, barsPerSecond).heard;
}

/**
 * True when the live levels are exact zeros for over a second: a real mic
 * always has some room noise, so the meter itself isn't getting audio (iOS
 * with the silent switch on and no Audio Session API, 2026-10-05). Then the
 * auto-stop can't judge silence: `notHeard` stays false, the recording runs
 * until a tap or MAX_RECORDING_MS, and the recording is still checked.
 */
export function meterDead(levels: readonly number[], barsPerSecond: number): boolean {
  return levels.length >= barsPerSecond && levels.every((v) => v === 0);
}

/** The accent's clip, timings and IPA, each falling back to the other accent. */
export function forAccent(
  item: SpeakingSessionItem,
  accent: SpeakingAccent,
): { url: string | null; timings: SpeakingTimings | null; ipa: string | null } {
  const uk = accent === 'UK';
  return {
    url: uk ? (item.audio_uk_url ?? item.audio_us_url) : (item.audio_us_url ?? item.audio_uk_url),
    timings: uk ? (item.timings_uk ?? item.timings_us) : (item.timings_us ?? item.timings_uk),
    ipa: uk ? (item.ipa_uk ?? item.ipa_us) : (item.ipa_us ?? item.ipa_uk),
  };
}

/** Tip keys in the handover's priority order (§3 step 8). */
const TIP_PRIORITY = [
  'speak.tip.stress',
  'speak.tip.missing',
  'speak.tip.rushed',
  'speak.tip.slow',
];

/**
 * SP4 "Pattern to watch": the tip that came up most across the session's
 * best attempts (ties by the handover's priority), with the sentence it
 * came from; null when every sentence flowed well.
 */
export function sessionPattern(
  results: Record<number, { tipKey: string; tipParams?: Record<string, string> }>,
): {
  index: number;
  tipKey: string;
  tipParams?: Record<string, string>;
} | null {
  const entries = Object.entries(results)
    .map(([i, r]) => ({ index: Number(i), ...r }))
    .filter((r) => TIP_PRIORITY.includes(r.tipKey));
  if (entries.length === 0) return null;
  const count = (key: string) => entries.filter((e) => e.tipKey === key).length;
  const best = [...TIP_PRIORITY].sort(
    (a, b) => count(b) - count(a) || TIP_PRIORITY.indexOf(a) - TIP_PRIORITY.indexOf(b),
  )[0];
  return entries.find((e) => e.tipKey === best) ?? null;
}
