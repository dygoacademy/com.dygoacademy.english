import type { SpeakingMarkReason, SpeakingWordMark } from '@/types';

import { CHECK_TIMEOUT_MS, TIP_KEYS } from './constants';
import { envelopeScorer, type ScorerInput, type SpeakingResult } from './envelopeScorer';

/**
 * SP3's result area (handover v2 §1): Compare opens at once in `checking`,
 * then shows the marks (`done`) or "Couldn't check this one" (`failed`).
 */
export type CheckStatus = 'checking' | 'done' | 'failed';

/**
 * Checks one recording against the reference sentence. Handover v2 moves
 * this to a server speech service (D3, picked at G6, built in S20). Until
 * then the on-device envelope scorer is the only checker, so live scores
 * stay real and the recording never leaves the phone.
 */
export interface SpeechCheck {
  check(input: ScorerInput): Promise<SpeakingResult>;
}

export const localCheck: SpeechCheck = {
  check: (input) => envelopeScorer.score(input),
};

/** Rejects with a timeout after `ms` (SP3 → `failed` after CHECK_TIMEOUT_MS). */
export function withTimeout<T>(promise: Promise<T>, ms: number = CHECK_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('check timed out')), ms);
    promise.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(id);
        reject(e instanceof Error ? e : new Error(String(e)));
      },
    );
  });
}

/**
 * A word mark as SP3 shows it. Adds the speech service's `unclear` mark,
 * with what it `heard` ("heard “affects”", handover v2 §3); the backend's
 * stored marks gain these with the server check (S17). The on-device
 * check never reports them.
 */
export type ShownMark = Omit<SpeakingWordMark, 'reason'> & {
  reason: SpeakingMarkReason | 'unclear' | null;
  /** What the service recognised instead (`unclear` only). */
  heard?: string;
  /** The word's IPA, for "say effects /ɪˈfekts/" in the tip (`unclear` only). */
  ipa?: string;
};

export type ShownResult = Omit<SpeakingResult, 'wordMarks'> & { wordMarks: ShownMark[] };

/**
 * The result as SP3 v2 shows it. Handover v2 drops the `rushed` / `slow`
 * marks (a speech service finds the words itself, so pace per word isn't
 * judged), so the on-device scorer's rushed / slow words show as fine, and
 * a rushed / slow tip becomes "flowed well" (stress and missing words
 * already come first in its tip order). The saved attempt keeps the
 * scorer's own marks.
 */
export function forDisplay(result: SpeakingResult): ShownResult {
  const dropped = (m: SpeakingWordMark) => m.reason === 'rushed' || m.reason === 'slow';
  const paceTip = result.tipKey === TIP_KEYS.rushed || result.tipKey === TIP_KEYS.slow;
  return {
    ...result,
    wordMarks: result.wordMarks.map((m) => (dropped(m) ? { ...m, ok: true, reason: null } : m)),
    ...(paceTip ? { tipKey: TIP_KEYS.flowed, tipParams: undefined } : {}),
  };
}

/**
 * Words that need work (not fine) as spans of the native clip, for SP3's
 * amber bands: the target word strong, the others light (canvas: opacity
 * .32 and .18).
 */
export function needsWorkIndexes(marks: readonly ShownMark[]): number[] {
  return marks.filter((m) => !m.ok).map((m) => m.index);
}
