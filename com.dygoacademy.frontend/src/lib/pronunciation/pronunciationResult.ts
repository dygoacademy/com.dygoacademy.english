import { stoneText } from '@/lib/speaking/ipa';
import { PRON, type ResultKind, type SyllableStatus } from '@/lib/speaking/pron-config';
import type { SpeakingWordCheckResult, StoredSyllable } from '@/types';

/**
 * Pronunciation P4, the honeycomb (docs/specs/Pronunciation-honeycomb-
 * implementation-plan.md §4): each syllable passes at PASS_MARK, is "close"
 * up to CLOSE_BAND points over it, and the word passes only when every
 * syllable does (the server pollinates by the same rule, 2026-10-25).
 * Pure, so the screen's strings and choices are unit-tested here.
 */
export const PASS_MARK = PRON.passAtLeast;
export const CLOSE_BAND = PRON.closeBand;

export type { ResultKind, SyllableStatus };

/** Under PASS_MARK = fail; PASS_MARK … PASS_MARK + CLOSE_BAND − 1 = close; else pass. */
export function syllableStatus(score: number): SyllableStatus {
  if (score < PASS_MARK) return 'fail';
  return score < PASS_MARK + CLOSE_BAND ? 'close' : 'pass';
}

/** Any fail = retry; else any close = almost perfect; else pass. */
export function resultKind(scores: readonly number[]): ResultKind {
  const statuses = scores.map(syllableStatus);
  if (statuses.includes('fail')) return 'retry';
  return statuses.includes('close') ? 'almostPerfect' : 'pass';
}

/** The scorer's word score when it gives one, else the rounded mean of the syllables. */
export function overallScore(scores: readonly number[], word?: number | null): number {
  if (word != null && Number.isFinite(word)) return Math.round(word);
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

/** The lowest-scoring syllable (the first one on a tie); -1 when there are none. */
export function weakestIndex(scores: readonly number[]): number {
  return scores.reduce((m, s, k) => (m < 0 || s < scores[m] ? k : m), -1);
}

/** "/tɪ/" from "ˈtɪ" (stress marks and slashes dropped). */
export const slashIpa = (ipa: string) => `/${ipa.replace(/[ˈˌ./]/g, '')}/`;

/**
 * What P4 needs (plan §4 "Data contract"): the word, one entry per cell,
 * the overall score, the clips and where this bee is in the round.
 */
export interface PronunciationSyllable {
  text: string;
  stressed: boolean;
  score: number;
  heardIpa?: string | null;
  targetIpa: string;
  /** Where the syllable is in the learner's take (ms), when the scorer knows. */
  startMs?: number;
  endMs?: number;
}

export interface PronunciationResult {
  word: string;
  syllables: PronunciationSyllable[];
  overallScore?: number;
  nativeAudioUrl: string;
  slowAudioUrl?: string;
  learnerAudioUrl: string;
  round: { index: number; total: number; nextWord?: string };
}

/**
 * A word check (`POST /speaking/check-pronunciation`) as the honeycomb's
 * result: the cells are the word's stored syllables, matched to the
 * scorer's by position. Null when they don't line up (P3 treats that as a
 * scoring error, "Check again / Record again").
 */
export function toPronunciationResult(input: {
  word: string;
  stones: readonly Pick<StoredSyllable, 'text' | 'stressed'>[];
  check: Pick<SpeakingWordCheckResult, 'total' | 'syllables'>;
  nativeAudioUrl: string;
  learnerAudioUrl: string;
  round: PronunciationResult['round'];
}): PronunciationResult | null {
  const { stones, check } = input;
  if (stones.length === 0 || check.syllables.length !== stones.length) return null;
  return {
    word: input.word,
    syllables: stones.map((s, k) => {
      const c = check.syllables[k];
      return {
        text: s.text,
        stressed: s.stressed,
        score: Math.max(0, Math.min(100, Math.round(c.score))),
        heardIpa: c.heard_ipa,
        targetIpa: c.ipa,
        ...(c.start_ms != null && c.end_ms != null && c.end_ms > c.start_ms
          ? { startMs: c.start_ms, endMs: c.end_ms }
          : {}),
      };
    }),
    overallScore: check.total,
    nativeAudioUrl: input.nativeAudioUrl,
    learnerAudioUrl: input.learnerAudioUrl,
    round: input.round,
  };
}

// ── P4 view model ─────────────────────────────────────────────────────────

/** A message key under `screens.pronounce` and its values. */
export interface Msg {
  key: string;
  values?: Record<string, string | number>;
}

/** What a P4 button does. */
export type P4Action = 'nextBee' | 'backToBed' | 'tryAgain' | 'sayAgain' | 'polish' | 'skip';

export interface P4Cta extends Msg {
  action: P4Action;
}

/**
 * The P4 buttons (plan §5): the big clay button and the text link.
 *
 * | kind          | not the last bee              | last bee                         |
 * | retry         | Try again · Skip to next bee  | Try again · Back to the bed      |
 * | pass          | Next bee: {next} · Say it again | Back to the bed · Say it again |
 * | almostPerfect | Next bee: {next} · Polish {syl} | Back to the bed · Polish {syl} |
 */
export function p4Ctas(
  kind: ResultKind,
  round: { last: boolean; nextWord?: string | null },
  weakSyl: string | null,
): { main: P4Cta; link: P4Cta } {
  if (kind === 'retry') {
    return {
      main: { action: 'tryAgain', key: 'p4.cta.tryAgain' },
      link: round.last
        ? { action: 'backToBed', key: 'p4.cta.backToBed' }
        : { action: 'skip', key: 'p4.cta.skip' },
    };
  }
  const main: P4Cta =
    round.last || !round.nextWord
      ? { action: 'backToBed', key: 'p4.cta.backToBed' }
      : { action: 'nextBee', key: 'p4.cta.nextBee', values: { next: round.nextWord } };
  const link: P4Cta =
    kind === 'almostPerfect' && weakSyl
      ? { action: 'polish', key: 'p4.cta.polish', values: { syl: weakSyl } }
      : { action: 'sayAgain', key: 'p4.cta.sayAgain' };
  return { main, link };
}

export interface ResultCell {
  index: number;
  /** As shown: the stressed syllable in capitals (MI · ti · gate). */
  text: string;
  stressed: boolean;
  score: number;
  status: SyllableStatus;
  /** The cell's accessible name ("ti: 56% match with native, below the pass line. Show details."). */
  aria: Msg;
}

export interface ResultDetail {
  tag: Msg;
  tone: SyllableStatus | 'all';
  text: Msg;
}

export interface ResultViewModel {
  kind: ResultKind;
  overall: number;
  passMark: number;
  cells: ResultCell[];
  /** The cell selected when P4 opens: -1 on a clean pass, else the weakest. */
  selected: number;
  /** The weakest cell (the waveform's tinted zone on retry / almost); -1 on a clean pass. */
  weak: number;
  badge: Msg;
  headline: Msg;
  /** One short line that never repeats a syllable's score (the detail strip owns that). */
  sub: Msg;
  /** Board label for screen readers. */
  boardLabel: Msg;
  cta: { main: P4Cta; link: P4Cta };
  /** The match ring: green, or amber on a retry. */
  ringTone: 'ok' | 'retry';
}

/** The detail strip for cell `index` of `vm` (-1: nothing selected, "All pass"). */
export function resultDetail(vm: Pick<ResultViewModel, 'cells' | 'passMark'>, result: PronunciationResult, index: number): ResultDetail {
  const cell = vm.cells[index];
  if (!cell) {
    return {
      tag: { key: 'p4.tag.all' },
      tone: 'all',
      text: { key: 'p4.detail.all', values: { mark: vm.passMark } },
    };
  }
  const syl = result.syllables[index];
  const base = { syl: cell.text, pct: cell.score };
  const ipa = slashIpa(syl.targetIpa);
  if (cell.status === 'pass') {
    return { tag: { key: 'p4.tag.pass' }, tone: 'pass', text: { key: 'p4.detail.ok', values: base } };
  }
  if (cell.status === 'close') {
    return {
      tag: { key: 'p4.tag.close' },
      tone: 'close',
      text: { key: 'p4.detail.close', values: { ...base, ipa } },
    };
  }
  return {
    tag: { key: 'p4.tag.fail' },
    tone: 'fail',
    text: syl.heardIpa
      ? { key: 'p4.detail.fail', values: { ...base, heard: slashIpa(syl.heardIpa), ipa } }
      : { key: 'p4.detail.cut', values: { ...base, ipa } },
  };
}

const CELL_ARIA: Record<SyllableStatus, string> = {
  pass: 'p4.cellAria.pass',
  close: 'p4.cellAria.close',
  fail: 'p4.cellAria.fail',
};

/**
 * Everything P4 shows for a result, as message keys and values: the
 * badge, headline and sub line, each cell's status, the selected cell,
 * the buttons, and the ring's tone.
 */
export function buildResultViewModel(result: PronunciationResult): ResultViewModel {
  const scores = result.syllables.map((s) => s.score);
  const kind = resultKind(scores);
  const overall = overallScore(scores, result.overallScore);
  const cells: ResultCell[] = result.syllables.map((s, index) => {
    const text = stoneText(s);
    const status = syllableStatus(s.score);
    return {
      index,
      text,
      stressed: s.stressed,
      score: s.score,
      status,
      aria: { key: CELL_ARIA[status], values: { syl: text, pct: s.score } },
    };
  });
  const n = cells.length;
  const passing = cells.filter((c) => c.status !== 'fail').length;
  const weak = kind === 'pass' ? -1 : weakestIndex(scores);
  const weakSyl = weak >= 0 ? cells[weak].text : null;
  const last = result.round.index >= result.round.total - 1;
  const word = result.word;
  return {
    kind,
    overall,
    passMark: PASS_MARK,
    cells,
    selected: weak,
    weak,
    badge:
      kind === 'retry'
        ? { key: 'p4.badge.almost', values: { k: passing, n } }
        : { key: 'p4.badge.full', values: { n } },
    headline: { key: kind === 'retry' ? 'p4.head.retry' : kind === 'almostPerfect' ? 'p4.head.almost' : 'p4.head.pass' },
    sub: {
      key: kind === 'retry' ? 'p4.sub.retry' : kind === 'almostPerfect' ? 'p4.sub.almost' : 'p4.sub.pass',
      values: { word },
    },
    boardLabel:
      kind === 'retry'
        ? {
            key: 'p4.boardRetry',
            values: { syls: cells.filter((c) => c.status === 'fail').map((c) => c.text).join(', ') },
          }
        : { key: 'p4.boardPass', values: { n } },
    cta: p4Ctas(kind, { last, nextWord: result.round.nextWord }, weakSyl),
    ringTone: kind === 'retry' ? 'retry' : 'ok',
  };
}
