/**
 * Phase 13 scoring and speaking constants, in one place (handover §3; plan
 * §5). Change thresholds here only: the scorer, the screens and the tests
 * read them from this file.
 */
import type { SpeakingStage } from '@/types';

// ── Signal (handover §3 steps 1–3) ─────────────────────────────────────────

/** Silence gate for trimming the learner's clip: −45 dBFS as linear RMS. */
export const SILENCE_GATE_DBFS = -45;
export const SILENCE_GATE_RMS = 10 ** (SILENCE_GATE_DBFS / 20);
/** Keep this much after the last loud frame (and before the first). */
export const SILENCE_HANG_MS = 150;
/**
 * Finding the learner's voice in a recording (decision G3-a, 2026-10-04):
 * a late start, the mic-tap click, a breath or room noise mustn't count as
 * speech. Skip the first SPEECH_SKIP_MS (tap click, mic warm-up); the gate
 * is the highest of SILENCE_GATE_RMS, the clip's own noise floor (5th
 * percentile) + SPEECH_FLOOR_MARGIN_DB, and its peak (99th percentile) −
 * SPEECH_PEAK_RANGE_DB; voice starts and ends with at least SPEECH_MIN_RUN_MS
 * above the gate, so clicks don't count. The native clip keeps the plain gate.
 */
export const SPEECH_SKIP_MS = 150;
export const SPEECH_FLOOR_MARGIN_DB = 10;
export const SPEECH_PEAK_RANGE_DB = 30;
export const SPEECH_MIN_RUN_MS = 120;
/** Envelopes are normalised to this percentile of their own values. */
export const ENVELOPE_NORM_PERCENTILE = 0.95;
/** Sakoe-Chiba band for DTW, as a share of the longer envelope. */
export const DTW_BAND = 0.25;
/**
 * Extra cost of a non-diagonal DTW step when picking the path (not in the
 * handover; decision S3-a). Without it a left-out word is squeezed onto one
 * frame of its neighbour and never shows as `missing`.
 */
export const DTW_STEP_PENALTY = 0.5;

// ── Word marks (step 5) ───────────────────────────────────────────────────

/** `missing`: the learner's segment has under this share of the native word's mean energy. */
export const MISSING_ENERGY_RATIO = 0.25;
/** `rushed` below / `slow` above this duration ratio (content words only). */
export const RUSHED_RATIO = 0.55;
export const SLOW_RATIO = 1.8;
/** `stress_soft`: learner's stress ratio under this share of the native one. */
export const STRESS_SOFT_RATIO = 0.75;

/** Function words never get `rushed` / `slow` (they're meant to be short). */
export const FUNCTION_WORDS: ReadonlySet<string> = new Set(
  (
    'a an the of to in on at for and or but nor so yet is are was were be been being am ' +
    'it its as by with from into onto that this these those can could will would shall should ' +
    'may might must do does did has have had not if than then there their they them we us our ' +
    'you your he him his she her i me my mine who whom which what when where how all some any no'
  ).split(' '),
);

// ── Score (step 6) ────────────────────────────────────────────────────────

export const SCORE_WEIGHTS = {
  similarity: 50,
  pace: 20,
  coverage: 15,
  stress: 15,
} as const;
/** Overall duration ratio (learner ÷ native) that gets the full pace points. */
export const PACE_BEST_MIN = 0.85;
export const PACE_BEST_MAX = 1.2;
/** Pace points fall linearly to 0 at these ratios. */
export const PACE_ZERO_MIN = 0.4;
export const PACE_ZERO_MAX = 2.0;

// ── Stage (step 7) ────────────────────────────────────────────────────────

/** Lowest score for each stage: < 40 seed · 40–69 sprout · 70–89 bloom · ≥ 90 fruit. */
export const STAGE_MIN_SCORE: Record<SpeakingStage, number> = {
  seed: 0,
  sprout: 40,
  bloom: 70,
  fruit: 90,
};

export function stageForScore(score: number): SpeakingStage {
  if (score >= STAGE_MIN_SCORE.fruit) return 'fruit';
  if (score >= STAGE_MIN_SCORE.bloom) return 'bloom';
  if (score >= STAGE_MIN_SCORE.sprout) return 'sprout';
  return 'seed';
}

// ── Tips (step 8), keys under `speak.tip.*` (S6 adds the copy) ─────────────

export const TIP_KEYS = {
  stress: 'speak.tip.stress',
  missing: 'speak.tip.missing',
  rushed: 'speak.tip.rushed',
  slow: 'speak.tip.slow',
  flowed: 'speak.tip.flowed',
} as const;

// ── Sessions and offers ───────────────────────────────────────────────────

/**
 * The recording flow (decision G3-b, 2026-10-04, "like PTE"): one tap on
 * the mic, a COUNTDOWN_SECONDS countdown with the sentence on screen, then
 * recording, which stops by itself AUTO_STOP_SILENCE_MS after the voice
 * ends. The follow-along highlight runs FOLLOW_ALONG_SLOWDOWN × slower than
 * the native clip, and the timer's target is the native length ×
 * RECORDING_TARGET_FACTOR (at most MAX_RECORDING_MS).
 */
export const COUNTDOWN_SECONDS = 3;
export const AUTO_STOP_SILENCE_MS = 1500;
export const FOLLOW_ALONG_SLOWDOWN = 1.5;
export const RECORDING_TARGET_FACTOR = 2;

/** Sentences in one Pond session. */
export const POND_SESSION_SIZE = 5;
/** The Sound Garden card shows from this many items (Q2 default). */
export const SOUND_GARDEN_MIN_ITEMS = 5;
// ── Extra states (T7, plan §2) ────────────────────────────────────────────

/** Under this much voice the attempt is "too short" (plan §2: < 0.8 s). */
export const MIN_VOICE_MS = 800;
/** The T7 states shown on SP1 (also the `/sounds?state=` dev toggle). */
export const SPEAK_NOTICES = [
  'mic',
  'denied',
  'quiet',
  'short',
  'unsupported',
  'audioFailed',
] as const;
export type SpeakNoticeKind = (typeof SPEAK_NOTICES)[number];

/** localStorage flag: the mic explainer was shown and accepted once. */
export const MIC_EXPLAINED_KEY = 'dygo:speak-mic-explained';

/** "Say this one?" offers per review session (T9-a). */
export const SPEAK_OFFERS_PER_SESSION = 3;
