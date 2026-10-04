/**
 * Phase 13 scorer v1 (T4, handover §3): compares the learner's sentence to
 * the native clip by loudness over time. It measures rhythm, stress,
 * timing and missing words, not individual sounds, runs on the phone and
 * needs no network (works in China). Behind `PronunciationScorer` so a
 * pronunciation API can replace it later (D3).
 *
 *   1. both clips → mono 16 kHz (the caller decodes; we resample)
 *   2. trim silence (−45 dBFS gate, 150 ms hang)
 *   3. RMS envelopes at 100 fps, each normalised to its 95th percentile
 *   4. DTW (Sakoe-Chiba band ±25%) maps native words onto the learner's time
 *   5. word marks: missing / rushed / slow / stress_soft (target)
 *   6. score = 50 similarity + 20 pace + 15 coverage + 15 target stress
 *   7. stage from the score; 8. one tip
 *
 * Thresholds live in ./constants.ts.
 */
import type { SpeakingMarkReason, SpeakingStage, SpeakingTimings, SpeakingWordMark } from '@/types';

import { ENVELOPE_FPS, resample, rmsEnvelope, SPEAKING_SAMPLE_RATE } from './audio';
import {
  DTW_BAND,
  DTW_STEP_PENALTY,
  ENVELOPE_NORM_PERCENTILE,
  FUNCTION_WORDS,
  MISSING_ENERGY_RATIO,
  PACE_BEST_MAX,
  PACE_BEST_MIN,
  PACE_ZERO_MAX,
  PACE_ZERO_MIN,
  RUSHED_RATIO,
  SCORE_WEIGHTS,
  SILENCE_GATE_RMS,
  SILENCE_HANG_MS,
  SLOW_RATIO,
  stageForScore,
  STRESS_SOFT_RATIO,
  TIP_KEYS,
} from './constants';

export interface ScorerInput {
  native: Float32Array;
  nativeRate: number;
  timings: SpeakingTimings;
  user: Float32Array;
  userRate: number;
  /** Index of the target word; defaults to the word that has syllables. */
  targetIndex?: number;
}

export interface SpeakingResult {
  /** 0..100 */
  score: number;
  stage: SpeakingStage;
  wordMarks: SpeakingWordMark[];
  userDurationMs: number;
  /** Trimmed, normalised envelopes at 100 fps, for drawing. */
  envelopes: { native: number[]; user: number[] };
  tipKey: string;
  tipParams?: Record<string, string>;
}

export interface PronunciationScorer {
  score(input: ScorerInput): Promise<SpeakingResult>;
}

// ── Steps 2–3 ─────────────────────────────────────────────────────────────

/** Loud range of an envelope as frames [start, end), with the hang on both sides; null if silent. */
export function loudRange(
  env: number[],
  fps = ENVELOPE_FPS,
): { start: number; end: number } | null {
  const first = env.findIndex((v) => v >= SILENCE_GATE_RMS);
  if (first < 0) return null;
  let last = env.length - 1;
  while (last > first && env[last] < SILENCE_GATE_RMS) last--;
  const hang = Math.round((SILENCE_HANG_MS / 1000) * fps);
  return { start: Math.max(0, first - hang), end: Math.min(env.length, last + 1 + hang) };
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))];
}

/** Divides by the envelope's own 95th percentile (all zeros stays zeros). */
export function normalise(env: number[]): number[] {
  const p = percentile(env, ENVELOPE_NORM_PERCENTILE);
  return p > 0 ? env.map((v) => v / p) : env.map(() => 0);
}

// ── Step 4 ────────────────────────────────────────────────────────────────

export interface DtwResult {
  /** Mean |a − b| along the path (the step penalty isn't included). */
  cost: number;
  /** For each frame of `a`, the first and last frame of `b` it maps to. */
  first: Int32Array;
  last: Int32Array;
}

const DIAG = 0;
const UP = 1; // i − 1: several `a` frames on one `b` frame
const LEFT = 2; // j − 1: several `b` frames on one `a` frame

/**
 * DTW with a Sakoe-Chiba band of ±DTW_BAND of the longer length (at least
 * |n − m|). Non-diagonal steps cost DTW_STEP_PENALTY extra when choosing
 * the path, so a word the learner left out can't be squeezed onto one
 * frame of a neighbouring word (phase notes, decision S3-a).
 */
export function dtw(a: number[], b: number[]): DtwResult {
  const n = a.length;
  const m = b.length;
  const band = Math.max(Math.ceil(DTW_BAND * Math.max(n, m)), Math.abs(n - m));
  const acc = new Float64Array(n * m).fill(Infinity);
  const diff = new Float64Array(n * m); // sum of |a − b| along the chosen path
  const steps = new Float64Array(n * m); // path length
  const from = new Uint8Array(n * m);
  const at = (i: number, j: number) => i * m + j;
  for (let i = 0; i < n; i++) {
    const centre = m === 1 ? 0 : Math.round((i * (m - 1)) / Math.max(1, n - 1));
    const lo = Math.max(0, centre - band);
    const hi = Math.min(m - 1, centre + band);
    for (let j = lo; j <= hi; j++) {
      const d = Math.abs(a[i] - b[j]);
      const k = at(i, j);
      if (i === 0 && j === 0) {
        acc[k] = d;
        diff[k] = d;
        steps[k] = 1;
        continue;
      }
      let best = Infinity;
      let prev = -1;
      let dir = DIAG;
      const consider = (p: number, extra: number, how: number) => {
        if (acc[p] + extra < best) {
          best = acc[p] + extra;
          prev = p;
          dir = how;
        }
      };
      if (i > 0 && j > 0) consider(at(i - 1, j - 1), 0, DIAG);
      if (i > 0) consider(at(i - 1, j), DTW_STEP_PENALTY, UP);
      if (j > 0) consider(at(i, j - 1), DTW_STEP_PENALTY, LEFT);
      if (prev >= 0) {
        acc[k] = best + d;
        diff[k] = diff[prev] + d;
        steps[k] = steps[prev] + 1;
        from[k] = dir;
      }
    }
  }
  const first = new Int32Array(n).fill(m);
  const last = new Int32Array(n).fill(-1);
  let i = n - 1;
  let j = m - 1;
  const end = at(i, j);
  for (;;) {
    if (j < first[i]) first[i] = j;
    if (j > last[i]) last[i] = j;
    if (i === 0 && j === 0) break;
    const dir = from[at(i, j)];
    if (dir === DIAG) {
      i--;
      j--;
    } else if (dir === UP) i--;
    else j--;
  }
  return { cost: diff[end] / (steps[end] || 1), first, last };
}

// ── Steps 5–8 ─────────────────────────────────────────────────────────────

function mean(env: number[], from: number, to: number): number {
  let sum = 0;
  let n = 0;
  for (let k = Math.max(0, from); k < Math.min(env.length, to); k++, n++) sum += env[k];
  return n ? sum / n : 0;
}

function peak(env: number[], from: number, to: number): number {
  let p = 0;
  for (let k = Math.max(0, from); k < Math.min(env.length, to); k++) p = Math.max(p, env[k]);
  return p;
}

/** Stressed syllable's peak ÷ mean of the other syllables' peaks, or null. */
function stressRatio(peaks: number[], stressed: number): number | null {
  if (stressed < 0 || peaks.length < 2) return null;
  const others = peaks.filter((_, k) => k !== stressed);
  const avg = others.reduce((s, v) => s + v, 0) / others.length;
  return avg > 0 ? peaks[stressed] / avg : peaks[stressed] > 0 ? Infinity : null;
}

function clean(word: string): string {
  return word.toLowerCase().replace(/[^a-z']/g, '');
}

function pacePoints(ratio: number): number {
  if (ratio >= PACE_BEST_MIN && ratio <= PACE_BEST_MAX) return 1;
  if (ratio < PACE_BEST_MIN)
    return Math.max(0, (ratio - PACE_ZERO_MIN) / (PACE_BEST_MIN - PACE_ZERO_MIN));
  return Math.max(0, (PACE_ZERO_MAX - ratio) / (PACE_ZERO_MAX - PACE_BEST_MAX));
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** The scorer as a pure function (synchronous; `envelopeScorer.score` wraps it). */
export function scoreSpeaking(input: ScorerInput): SpeakingResult {
  const fps = ENVELOPE_FPS;
  const words = input.timings.words;
  const targetIndex = input.targetIndex ?? words.findIndex((w) => w.syllables.length > 0);
  const target = words[targetIndex];

  const nativeRaw = rmsEnvelope(
    resample(input.native, input.nativeRate, SPEAKING_SAMPLE_RATE),
    SPEAKING_SAMPLE_RATE,
    fps,
  );
  const userRaw = rmsEnvelope(
    resample(input.user, input.userRate, SPEAKING_SAMPLE_RATE),
    SPEAKING_SAMPLE_RATE,
    fps,
  );
  const nRange = loudRange(nativeRaw) ?? { start: 0, end: nativeRaw.length };
  const uRange = loudRange(userRaw);
  const native = normalise(nativeRaw.slice(nRange.start, nRange.end));
  const toFrame = (seconds: number) => Math.round(seconds * fps) - nRange.start;

  if (!uRange || native.length === 0) {
    // Nothing heard: every word missing.
    return {
      score: 0,
      stage: 'seed',
      wordMarks: words.map((_, index) => ({ index, ok: false, reason: 'missing' })),
      userDurationMs: 0,
      envelopes: { native, user: [] },
      tipKey: TIP_KEYS.missing,
      tipParams: { words: words.map((w) => w.text).join(' ') },
    };
  }
  const user = normalise(userRaw.slice(uRange.start, uRange.end));
  const path = dtw(native, user);
  const map = (from: number, to: number) => {
    const a = Math.min(native.length - 1, Math.max(0, from));
    const b = Math.min(native.length - 1, Math.max(a, to - 1));
    return { from: path.first[a], to: path.last[b] + 1 };
  };

  let stressScore = 1;
  let targetSoft = false;
  const wordMarks: SpeakingWordMark[] = words.map((w, index) => {
    const s = toFrame(w.start);
    const e = Math.max(s + 1, toFrame(w.end));
    const u = map(s, e);
    const nativeEnergy = mean(native, s, e);
    const userEnergy = mean(user, u.from, u.to);
    let reason: SpeakingMarkReason | null = null;
    if (nativeEnergy > 0 && userEnergy < MISSING_ENERGY_RATIO * nativeEnergy) reason = 'missing';
    if (!reason && index === targetIndex && w.syllables.length > 1) {
      const stressed = w.syllables.findIndex((x) => x.stressed);
      const nativePeaks = w.syllables.map((x) =>
        peak(native, toFrame(x.start), Math.max(toFrame(x.start) + 1, toFrame(x.end))),
      );
      const userPeaks = w.syllables.map((x) => {
        const xs = toFrame(x.start);
        const r = map(xs, Math.max(xs + 1, toFrame(x.end)));
        return peak(user, r.from, r.to);
      });
      const nr = stressRatio(nativePeaks, stressed);
      const ur = stressRatio(userPeaks, stressed);
      if (nr !== null && ur !== null && Number.isFinite(nr)) {
        stressScore = clamp01(ur / nr);
        if (ur < STRESS_SOFT_RATIO * nr) {
          reason = 'stress_soft';
          targetSoft = true;
        }
      }
    }
    if (!reason && !FUNCTION_WORDS.has(clean(w.text))) {
      const ratio = (u.to - u.from) / (e - s);
      if (ratio < RUSHED_RATIO) reason = 'rushed';
      else if (ratio > SLOW_RATIO) reason = 'slow';
    }
    return { index, ok: reason === null, reason };
  });
  if (wordMarks[targetIndex]?.reason === 'missing') stressScore = 0;

  const similarity = clamp01(1 - path.cost);
  const pace = pacePoints(user.length / native.length);
  const coverage =
    wordMarks.filter((m) => m.reason !== 'missing').length / Math.max(1, words.length);
  const score = Math.round(
    Math.min(
      100,
      Math.max(
        0,
        SCORE_WEIGHTS.similarity * similarity +
          SCORE_WEIGHTS.pace * pace +
          SCORE_WEIGHTS.coverage * coverage +
          SCORE_WEIGHTS.stress * stressScore,
      ),
    ),
  );

  const named = (reason: SpeakingMarkReason) =>
    wordMarks.filter((m) => m.reason === reason).map((m) => words[m.index].text);
  let tipKey: string = TIP_KEYS.flowed;
  let tipParams: Record<string, string> | undefined;
  if (targetSoft && target) {
    tipKey = TIP_KEYS.stress;
    tipParams = {
      word: target.text,
      syllable: String(target.syllables.findIndex((x) => x.stressed)),
    };
  } else if (named('missing').length) {
    tipKey = TIP_KEYS.missing;
    tipParams = { words: named('missing').join(', ') };
  } else if (named('rushed').length) {
    tipKey = TIP_KEYS.rushed;
    tipParams = { word: named('rushed')[0] };
  } else if (named('slow').length) {
    tipKey = TIP_KEYS.slow;
    tipParams = { word: named('slow')[0] };
  }

  return {
    score,
    stage: stageForScore(score),
    wordMarks,
    userDurationMs: Math.round(((uRange.end - uRange.start) / fps) * 1000),
    envelopes: { native, user },
    tipKey,
    tipParams,
  };
}

export const envelopeScorer: PronunciationScorer = {
  score: (input) => Promise.resolve(scoreSpeaking(input)),
};
