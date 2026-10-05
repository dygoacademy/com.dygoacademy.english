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
  /** A word said unclearly or heard as another word (server check, S18). */
  unclear: 'speak.tip.unclear',
} as const;

// ── Sessions and offers ───────────────────────────────────────────────────

/**
 * The recording flow (handover v2 §3.2, 2026-10-04, "like PTE"): one tap
 * on the mic, a COUNTDOWN_SECONDS countdown of COUNTDOWN_STEP_MS a step
 * with the sentence on screen (tapping it skips to the beep), then a beep
 * and a vibration; audio is kept from BEEP_GUARD_MS after the beep so the
 * beep isn't in the clip. Recording stops by itself AUTO_STOP_SILENCE_MS
 * after the voice ends, or after NOT_HEARD_MS with no voice at all ("We
 * couldn't hear you"); MAX_RECORDING_MS (audio.ts) is only a safety cap.
 * The follow-along highlight runs FOLLOW_ALONG_SLOWDOWN × slower than the
 * native clip. SP2 shows the elapsed time only (no target).
 */
export const COUNTDOWN_SECONDS = 3;
export const COUNTDOWN_STEP_MS = 900;
export const BEEP_GUARD_MS = 150;
export const BEEP_HZ = 880;
export const BEEP_MS = 120;
export const VIBRATE_MS = 40;
export const AUTO_STOP_SILENCE_MS = 2000;
export const NOT_HEARD_MS = 8000;
export const FOLLOW_ALONG_SLOWDOWN = 1.5;

/**
 * SP3 checking (handover v2 §3.2): Compare opens at once, the check runs
 * in the background and fails after CHECK_TIMEOUT_MS ("Couldn't check
 * this one"). The server check (S18) gets SERVER_CHECK_TIMEOUT_MS: the
 * backend gives the scorer 8 s, plus the upload.
 */
export const CHECK_TIMEOUT_MS = 8000;
export const SERVER_CHECK_TIMEOUT_MS = 10000;

/**
 * Where SP3's check runs (S18): `local` = the on-device envelope scorer
 * (the default), `server` = `POST /speaking/check` → the speech scorer on
 * the Mac (G6). Set NEXT_PUBLIC_SPEECH_CHECK=server at build time to switch
 * (M5, after calibration). Read literally so Next inlines it.
 */
export type SpeechCheckMode = 'local' | 'server';
export function speechCheckMode(
  value: string | undefined = process.env.NEXT_PUBLIC_SPEECH_CHECK,
): SpeechCheckMode {
  return value === 'server' ? 'server' : 'local';
}

/** Sentences in one Pond session. */
export const POND_SESSION_SIZE = 5;
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
