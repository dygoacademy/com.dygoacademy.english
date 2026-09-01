/**
 * Module 8 (Phase 4), FR-8.2 — pure ranking logic for the class-wide
 * mistake heatmap. No DB access here on purpose: `AnalyticsService` owns
 * I/O (via `public.group_word_heatmap()`, see
 * `database/migrations/007_group_word_heatmap.sql` for why that function
 * exists at all), this file owns "given raw per-word counts, what's the
 * worst N words" — same split as `srs-algorithm.ts` and `quiz-generator.ts`.
 *
 * Deliberately NOT done inside the SQL function itself (no `ORDER BY` /
 * `LIMIT` there): failure-rate computation, the sort order, and the top-N
 * cap are business logic with real judgment calls baked in (see below),
 * exactly the kind of thing this codebase keeps in a unit-testable TS
 * module rather than buried in a migration nobody re-reads.
 *
 * ## Design decisions made here (none of these are pinned by the BRD)
 *
 * **Sort key.** Worst-first by `failure_rate` (FR-8.2: "words with the
 * highest failure rates"). A word attempted once and missed once (rate
 * 1.0) would otherwise outrank a word attempted 50 times and missed 40
 * (rate 0.8) despite the second being a far bigger, better-evidenced class
 * problem — so ties (and near-ties) on `failure_rate` break on `attempts`
 * descending, surfacing the higher-evidence word first. This is a
 * judgment call, not a spec requirement; a small-sample word can still
 * legitimately rank #1 if its rate is high enough to not tie.
 *
 * **Top-N cap.** Defaults to 20 (a teacher scanning a heatmap wants a
 * short worst-offenders list, not every word the class has ever touched)
 * — `DEFAULT_HEATMAP_LIMIT`, tunable by the caller via `?limit=`.
 *
 * **Zero-attempt words never appear.** `WordAttemptCounts` rows come from
 * `public.group_word_heatmap()`, which only returns words with at least
 * one `review_logs` row (an inner join, not a left join, against
 * `topic_words`) — so `attempts` is never 0 here in practice. The
 * `attempts > 0` guard below is defensive, not load-bearing.
 */

export interface WordAttemptCounts {
  topic_word_id: string;
  source_word: string;
  topic_id: string;
  topic_title: string;
  attempts: number;
  failures: number;
}

export interface HeatmapEntry extends WordAttemptCounts {
  /** `failures / attempts`, rounded to 4 decimal places (a fraction, not a percentage — the frontend formats it). */
  failure_rate: number;
}

/** FR-8.2 doesn't name a number; a short worst-offenders list is more useful to a teacher than the whole class roster of words. */
export const DEFAULT_HEATMAP_LIMIT = 20;

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

/**
 * Computes each word's failure rate, sorts worst-first (failure rate desc,
 * then attempts desc as a tiebreak — see module doc), and caps to `limit`.
 * Pure and order-preserving-stable for equal keys is not guaranteed by
 * `Array.prototype.sort` pre-ES2019 engines, but Node's V8 has used a
 * stable sort since Node 11, so ties beyond the explicit tiebreak keep
 * their input order.
 */
export function rankHeatmap(
  rows: WordAttemptCounts[],
  limit: number = DEFAULT_HEATMAP_LIMIT,
): HeatmapEntry[] {
  const withRate: HeatmapEntry[] = rows.map((row) => ({
    ...row,
    failure_rate: row.attempts > 0 ? round4(row.failures / row.attempts) : 0,
  }));

  withRate.sort((a, b) => {
    if (b.failure_rate !== a.failure_rate) return b.failure_rate - a.failure_rate;
    return b.attempts - a.attempts;
  });

  const cap = Math.max(0, Math.trunc(limit));
  return withRate.slice(0, cap);
}
