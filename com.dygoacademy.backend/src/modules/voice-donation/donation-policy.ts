/**
 * Which recordings are worth keeping ("docs/plans/Voice donation quality plan.md",
 * 2026-10-12). GOPT learns from clips a teacher has marked, not from volume, so
 * the speech-check worker keeps a recording only when it can be labelled and is
 * likely to teach the model something. Pure functions; VoiceDonationService
 * adds the counts from the database.
 *
 * The dataset tools (com.dydoacademy.gopt/dataset, common.py) apply the same
 * rules to recordings kept before this change: keep the two in step.
 */

export interface DonationPolicy {
  /** Kept recordings per donor per prompt (word or sentence), ever. */
  maxPerPrompt: number;
  /** Kept recordings per donor per day (Vietnam time). */
  maxPerDay: number;
  /** Share of the clear passes and clear fails that is kept. */
  sampleRate: number;
  /** Kept recordings per prompt per region before only flagged / disagree ones are kept. */
  promptRegionQuota: number;
}

export const DEFAULT_DONATION_POLICY: DonationPolicy = {
  maxPerPrompt: 2,
  maxPerDay: 20,
  sampleRate: 0.2,
  promptRegionQuota: 30,
};

/** Why a recording was kept (voice_donations.kept_reason). */
export type KeptReason = 'flagged' | 'disagree' | 'uncertain' | 'hard_sound' | 'sample';

/** Why a recording was not kept (logged as daily counts only). */
export type DropReason =
  | 'not_heard'
  | 'too_quiet'
  | 'too_short'
  | 'too_long'
  | 'wrong_prompt'
  | 'repeat_attempt'
  | 'daily_cap'
  | 'not_sampled'
  | 'region_quota';

export const MIN_DURATION_MS = 500;
export const MAX_DURATION_MS = 20_000;
export const MIN_VOICED_MS = 500;
/** Sentences: over this word error rate, the learner read something else (a mispronounced word is kept). */
export const MAX_PROMPT_WER = 0.7;
/** A total in this range means the scorer isn't sure: a teacher's mark teaches the most. */
export const UNCERTAIN_RANGE = [40, 85] as const;
/** GOPT's utterance total and the sentence total this far apart: one of them is wrong. */
export const DISAGREE_POINTS = 20;

/** The words of a text, lower case, punctuation removed (common.py words_of). */
export function wordsOf(text: string): string[] {
  return (text ?? '')
    .toLowerCase()
    .replace(/’/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.replace(/'/g, '') !== '');
}

/** voice_donations.text_norm. */
export function normalizeText(text: string): string {
  return wordsOf(text).join(' ');
}

/** Word error rate of `hyp` against `ref` (common.py wer). */
export function wer(ref: string, hyp: string): number {
  const r = wordsOf(ref);
  const h = wordsOf(hyp);
  if (r.length === 0) return h.length === 0 ? 0 : 1;
  let d = Array.from({ length: h.length + 1 }, (_, j) => j);
  for (let i = 1; i <= r.length; i++) {
    const next = [i];
    for (let j = 1; j <= h.length; j++) {
      next[j] = Math.min(d[j] + 1, next[j - 1] + 1, d[j - 1] + (r[i - 1] === h[j - 1] ? 0 : 1));
    }
    d = next;
  }
  return d[h.length] / r.length;
}

/** The scorer's reply, as far as these rules read it (sentence or word check). */
interface Scores {
  status?: string;
  total?: number;
  heard_text?: string;
  duration_ms?: number;
  voiced_ms?: number;
  gopt?: { total?: number | null } | null;
  words?: { status?: string }[];
  syllables?: { wobbly?: boolean }[];
}

function asScores(scores: unknown): Scores {
  return scores && typeof scores === 'object' ? scores : {};
}

const num = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/** A recording that can't be labelled (null = it can). Needs no database. */
export function qualityGate(
  kind: 'sentence' | 'word',
  text: string,
  raw: unknown,
): DropReason | null {
  const s = asScores(raw);
  if (kind === 'word' && s.status === 'not_heard') return 'not_heard';
  if (kind === 'word' && s.status === 'other_word') return 'wrong_prompt';
  if (num(s.duration_ms) && s.duration_ms < MIN_DURATION_MS) return 'too_short';
  if (num(s.duration_ms) && s.duration_ms > MAX_DURATION_MS) return 'too_long';
  if (kind === 'sentence') {
    if ((num(s.voiced_ms) && s.voiced_ms < MIN_VOICED_MS) || !(s.heard_text ?? '').trim()) {
      return 'too_quiet';
    }
    if (wer(text, s.heard_text ?? '') > MAX_PROMPT_WER) return 'wrong_prompt';
  }
  return null;
}

const HARD_IPA = /[θðʃʒ]/;
const IPA_VOWELS = new Set([...'aeiouyæɑɒɔəɚɛɜɝɪʊʌɐɘɵøœɤɯ']);

/**
 * Word checks only: the word has a sound Vietnamese learners find hard
 * (/θ ð ʃ ʒ/) or ends in a consonant cluster. Sentences nearly always have
 * one, so for them the scorer's own doubt decides.
 */
export function hasHardSound(targetIpa: string | null): boolean {
  if (!targetIpa) return false;
  const ipa = targetIpa.replace(/[/[\]ˈˌ.ː\s]/g, '');
  if (HARD_IPA.test(ipa)) return true;
  const chars = [...ipa];
  const last2 = chars.slice(-2);
  return last2.length === 2 && last2.every((c) => !IPA_VOWELS.has(c));
}

/**
 * Why this recording is worth a teacher's time, or null for a clear pass or
 * a clear fail (kept only as a random sample). Most useful first: flagged and
 * disagree also bypass the region quota.
 */
export function usefulReason(
  kind: 'sentence' | 'word',
  targetIpa: string | null,
  raw: unknown,
): KeptReason | null {
  const s = asScores(raw);
  if (kind === 'sentence' && (s.words ?? []).some((w) => w?.status && w.status !== 'ok')) {
    return 'flagged';
  }
  if (kind === 'word' && (s.syllables ?? []).some((sy) => sy?.wobbly)) return 'flagged';
  if (kind === 'sentence' && num(s.total) && num(s.gopt?.total)) {
    if (Math.abs(s.total - s.gopt.total) >= DISAGREE_POINTS) return 'disagree';
  }
  if (num(s.total) && s.total >= UNCERTAIN_RANGE[0] && s.total <= UNCERTAIN_RANGE[1]) {
    return 'uncertain';
  }
  if (kind === 'word' && hasHardSound(targetIpa)) return 'hard_sound';
  return null;
}

/** flagged / disagree recordings are kept even past the region quota. */
export function bypassesQuota(reason: KeptReason): boolean {
  return reason === 'flagged' || reason === 'disagree';
}
