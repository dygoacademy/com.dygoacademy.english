import type { SpeakingSyllable } from './speaking-syllables';
import type { ScorerResult, ScorerWordResult } from './speech-checker';
import {
  POLLINATE_MIN_SCORE,
  SpeakingCheckMark,
  SpeakingCheckResult,
  SpeakingStage,
  SpeakingWordCheckResult,
} from './speaking.types';

/** < 40 seed · 40–69 sprout · 70–89 bloom · ≥ 90 fruit (handover §3, as in the app). */
export function stageForScore(score: number): SpeakingStage {
  if (score >= 90) return 'fruit';
  if (score >= 70) return 'bloom';
  if (score >= 40) return 'sprout';
  return 'seed';
}

/**
 * The scorer's reply → what SP3 shows (handover v2 §3): one mark per word
 * of the sentence, `missing` / `unclear` (+ `heard`) / fine. Stress
 * (`stress_soft`) isn't judged by the scorer; the app keeps its on-device
 * stress check for the target word. Words the scorer didn't return (it
 * shouldn't happen) count as fine rather than inventing a mistake.
 */
export function toCheckResult(raw: ScorerResult, wordCount: number): SpeakingCheckResult {
  const byIndex = new Map(raw.words.map((w) => [w.index, w]));
  const word_marks: SpeakingCheckMark[] = Array.from({ length: wordCount }, (_, index) => {
    const w = byIndex.get(index);
    if (!w || w.status === 'ok') return { index, ok: true, reason: null };
    if (w.status === 'missing') return { index, ok: false, reason: 'missing' };
    return w.heard
      ? { index, ok: false, reason: 'unclear', heard: w.heard }
      : { index, ok: false, reason: 'unclear' };
  });
  const score = Math.max(0, Math.min(100, Math.round(raw.total)));
  return {
    score,
    stage: stageForScore(score),
    word_marks,
    user_duration_ms: raw.duration_ms,
    check_ms: raw.latency_ms,
  };
}

/**
 * The scorer's word reply → what P4 shows: one syllable per stored stone
 * (`stones`), and `passed` = heard as the word at POLLINATE_MIN_SCORE or
 * more. The app works out pass / almost perfect / retry and each stone's
 * look from the scores (its pron-config.ts).
 */
export function toWordCheckResult(
  raw: ScorerWordResult,
  stones: readonly SpeakingSyllable[],
): Omit<SpeakingWordCheckResult, 'pollinated'> {
  const total = Math.max(0, Math.min(100, Math.round(raw.total)));
  return {
    kind: 'word',
    status: raw.status,
    passed: raw.status === 'ok' && total >= POLLINATE_MIN_SCORE,
    total,
    heard_text: raw.heard_text,
    syllables: raw.syllables,
    spelling: raw.syllables.length === stones.length ? stones.map((x) => ({ ...x })) : [],
    user_duration_ms: raw.duration_ms,
    check_ms: raw.latency_ms,
  };
}
