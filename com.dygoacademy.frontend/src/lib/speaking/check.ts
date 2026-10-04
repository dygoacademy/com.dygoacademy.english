import { apiClient } from '@/lib/api-client';
import type {
  SpeakingAccent,
  SpeakingCheckResult,
  SpeakingMarkReason,
  SpeakingWordMark,
} from '@/types';

import { CHECK_TIMEOUT_MS, SERVER_CHECK_TIMEOUT_MS, TIP_KEYS } from './constants';
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

/** The token without its punctuation ("change." → "change"), for tip text. */
const bareWord = (token: string) => token.replace(/^[^\p{L}']+|[^\p{L}']+$/gu, '');

/**
 * The server's marks (S17: `missing` / `unclear` + `heard`) and score, with
 * the on-device check's stress verdict on the target word (handover v2 §3:
 * stress from the service, or the client fallback; the Mac scorer doesn't
 * judge stress). Tip order: target stress → missing words → unclear words
 * → flowed well. `local` is the on-device result for the same recording
 * (its envelopes draw the waveforms).
 */
export function mergeServerResult(
  server: SpeakingCheckResult,
  local: SpeakingResult,
  tokens: readonly string[],
  targetIndex: number,
): ShownResult {
  const localTarget = local.wordMarks.find((m) => m.index === targetIndex);
  const wordMarks: ShownMark[] = server.word_marks.map((m) => {
    if (m.index === targetIndex && m.ok && localTarget?.reason === 'stress_soft') {
      return { index: m.index, ok: false, reason: 'stress_soft' };
    }
    if (m.reason === 'unclear') {
      return m.heard
        ? { index: m.index, ok: false, reason: 'unclear', heard: m.heard }
        : { index: m.index, ok: false, reason: 'unclear' };
    }
    return { index: m.index, ok: m.ok, reason: m.reason };
  });
  const words = (reason: ShownMark['reason']) =>
    wordMarks.filter((m) => m.reason === reason).map((m) => bareWord(tokens[m.index] ?? ''));
  const target = wordMarks.find((m) => m.index === targetIndex);
  let tipKey: string = TIP_KEYS.flowed;
  let tipParams: Record<string, string> | undefined;
  if (target?.reason === 'stress_soft') {
    tipKey = TIP_KEYS.stress;
    tipParams =
      local.tipKey === TIP_KEYS.stress
        ? local.tipParams
        : { word: bareWord(tokens[targetIndex] ?? '') };
  } else if (words('missing').length) {
    tipKey = TIP_KEYS.missing;
    tipParams = { words: words('missing').join(', ') };
  } else if (words('unclear').length) {
    const first = wordMarks.find((m) => m.reason === 'unclear')!;
    tipKey = TIP_KEYS.unclear;
    tipParams = { word: bareWord(tokens[first.index] ?? ''), heard: first.heard ?? 'none' };
  }
  return {
    ...local,
    score: server.score,
    stage: server.stage,
    wordMarks,
    userDurationMs: server.user_duration_ms,
    tipKey,
    tipParams,
  };
}

/**
 * S18 `server` mode: sends the recording as recorded (S15-a: m4a on
 * iPhone, webm on Chrome) to `POST /speaking/check` and merges the reply
 * with the on-device result. Rejects (→ SP3 "Couldn't check") on a network
 * error, a 4xx/5xx or after SERVER_CHECK_TIMEOUT_MS.
 */
export async function serverCheck(
  req: {
    recording: Blob;
    itemId: string;
    accent: SpeakingAccent;
    sentence: string;
    targetIndex: number;
  },
  local: SpeakingResult,
): Promise<ShownResult> {
  const form = new FormData();
  const ext = req.recording.type.includes('webm')
    ? 'webm'
    : req.recording.type.includes('wav')
      ? 'wav'
      : 'm4a';
  form.append('audio', req.recording, `recording.${ext}`);
  form.append('item_id', req.itemId);
  form.append('accent', req.accent);
  const server = await withTimeout(
    apiClient.upload<SpeakingCheckResult>('/speaking/check', form),
    SERVER_CHECK_TIMEOUT_MS,
  );
  return mergeServerResult(server, local, req.sentence.trim().split(/\s+/), req.targetIndex);
}
