import { FSRSParameters, generatorParameters } from 'ts-fsrs';

/**
 * Phase 10 — FSRS-6 scheduler parameters (`phase 10 implementation plan.md`
 * §2.2). One place to tune the scheduler; everything else reads from here.
 *
 * **Target retention 0.95** (customer-experience decision, 2026-09-25): with
 * default FSRS-6 weights, a word answered GOOD every time it comes due is
 * scheduled 1 → 3 → 8 → 19 → 43 → 89 days, almost exactly FR-3.2's
 * original 1d → 3d → 7d → 16d ladder, so learners see no sudden change in
 * spacing at the SM-2 → FSRS switch and succeed on ~95% of reviews, which
 * matters for motivation with young learners. 0.90 (the FSRS default) would
 * mean fewer reviews but 2 → 11 → 46-day jumps.
 *
 * **No learning steps**: a /study session is a fixed snapshot of due cards
 * (no in-session re-show), so minute-level learning steps would only defer
 * a brand-new word to "whenever the next session happens" instead of
 * scheduling it properly. **One 10-minute relearning step** keeps FR-3.2's
 * "Again: < 10 min" behavior.
 *
 * **180-day cap**: a young learner's word should resurface at least twice a
 * year, even once it is well known.
 */
export const REQUEST_RETENTION = 0.95;
export const MAXIMUM_INTERVAL_DAYS = 180;

export function buildFsrsParams(overrides: Partial<FSRSParameters> = {}): FSRSParameters {
  return generatorParameters({
    request_retention: REQUEST_RETENTION,
    maximum_interval: MAXIMUM_INTERVAL_DAYS,
    // Spreads same-day due spikes in production; unit tests turn it off for
    // exact, deterministic intervals.
    enable_fuzz: true,
    enable_short_term: true,
    learning_steps: [],
    relearning_steps: ['10m'],
    ...overrides,
  });
}
