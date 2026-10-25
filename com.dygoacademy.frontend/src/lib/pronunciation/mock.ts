import type { SpeakingSyllable, SpeakingWordCheckResult } from '@/types';

import type { ResultKind } from './pronunciationResult';

/**
 * A pretend scorer for building and screenshotting the honeycomb (plan §4),
 * on with `NEXT_PUBLIC_PRON_MOCK=1`. The real GOPT scorer rarely gives a
 * retry or an almost (pron-v2 Step C), so the mock walks through them: the
 * first try of a word is a retry, the second almost perfect, then a pass.
 */
export const PRON_MOCK = process.env.NEXT_PUBLIC_PRON_MOCK === '1';

interface MockWord {
  ipa: string[];
  pass: number[];
  weak: number;
  /** Retry score of the weak syllable and what it sounded like (null: cut short). */
  retry: number;
  heard: string | null;
}

/** The plan's table (§4). */
export const MOCK_WORDS: Record<string, MockWord> = {
  mitigate: { ipa: ['ˈmɪ', 'tɪ', 'ɡeɪt'], pass: [95, 91, 94], weak: 1, retry: 56, heard: 'taɪ' },
  compensation: {
    ipa: ['kɒm', 'pen', 'ˈseɪ', 'ʃən'],
    pass: [93, 90, 92, 95],
    weak: 2,
    retry: 56,
    heard: 'sæ',
  },
  cloudy: { ipa: ['ˈklaʊ', 'di'], pass: [96, 93], weak: 1, retry: 41, heard: null },
  sunny: { ipa: ['ˈsʌ', 'ni'], pass: [94, 92], weak: 1, retry: 56, heard: 'naɪ' },
};

/** The almost-perfect score of the weak syllable. */
export const MOCK_CLOSE = 82;

/** Which result the `attempt`-th try (0-based) of a word gets. */
export function mockKind(attempt: number): ResultKind {
  return attempt <= 0 ? 'retry' : attempt === 1 ? 'almostPerfect' : 'pass';
}

/**
 * A word check result for `word` as `kind`. Words outside the table get
 * 92 / 90 / … with the last unstressed syllable as the weak one.
 */
export function mockWordCheck(
  word: string,
  stones: readonly SpeakingSyllable[],
  kind: ResultKind,
): SpeakingWordCheckResult {
  const known = MOCK_WORDS[word.toLowerCase()];
  const n = stones.length;
  const d: MockWord =
    known && known.pass.length === n
      ? known
      : {
          ipa: stones.map((s) => s.text),
          pass: stones.map((_, k) => 92 - (k % 3)),
          weak: Math.max(0, stones.map((s) => s.stressed).lastIndexOf(false)),
          retry: 56,
          heard: null,
        };
  const scores = [...d.pass];
  if (kind === 'retry') scores[d.weak] = d.retry;
  if (kind === 'almostPerfect') scores[d.weak] = MOCK_CLOSE;
  const total = Math.round(scores.reduce((a, b) => a + b, 0) / Math.max(1, n));
  return {
    kind: 'word',
    status: 'ok',
    passed: kind !== 'retry',
    pollinated: kind !== 'retry',
    total,
    heard_text: word,
    syllables: stones.map((s, k) => ({
      ipa: d.ipa[k] ?? s.text,
      text: s.text,
      score: scores[k],
      wobbly: scores[k] < 60,
      heard_ipa: kind === 'retry' && k === d.weak ? d.heard : null,
      start_ms: null,
      end_ms: null,
    })),
    spelling: stones.map((s) => ({ ...s })),
    user_duration_ms: 900,
    check_ms: 600,
  };
}
