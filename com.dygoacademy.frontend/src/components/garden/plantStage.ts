/**
 * Plant stages (design system §3 / §5.2): each SRS state is shown as one
 * plant. Pure helpers only (no React), so they're cheap to unit-test and
 * safe to import from server components.
 */

/** Stages a word can be in. `thirsty` is the "due now" drop, not an SRS state. */
export type PlantStage = 'seed' | 'sprout' | 'flower' | 'tree' | 'wilting' | 'thirsty';

/** The stages `stageFromSrs` can return (every stage except the due-now drop). */
export type SrsPlantStage = Exclude<PlantStage, 'thirsty'>;

/**
 * FSRS card state as the API returns it (`user_srs.fsrs_state`).
 *
 * Mirrors `FsrsState` in `types/srs.ts`, which is part of the Phase 10
 * FSRS work that is still uncommitted in the working tree. It's repeated
 * here so this helper compiles at its own commit; the two are
 * structurally identical, so either can be passed in. Swap to the shared
 * type once Phase 10 lands.
 */
export type GardenFsrsState = 'New' | 'Learning' | 'Review' | 'Relearning';

export const PLANT_STAGES: readonly PlantStage[] = [
  'seed',
  'sprout',
  'flower',
  'tree',
  'wilting',
  'thirsty',
] as const;

/**
 * Maps a word's SRS fields to its plant stage.
 *
 * Priority, highest first:
 *  1. `isLeech` → wilting. A leech needs help whatever else is true.
 *  2. `masteredAt` set → tree. Mastery is sticky (Phase 10): a mastered
 *     word that lapses into Relearning stays a tree until it's a leech.
 *  3. `fsrsState`: New → seed; Learning / Relearning → sprout;
 *     Review → flower.
 *
 * "Thirsty" (due now) is never returned: it's an overlay on top of the
 * stage (the drip / drop), decided from `next_due_at`, not from state.
 */
export function stageFromSrs(
  fsrsState: GardenFsrsState,
  masteredAt: string | Date | null | undefined,
  isLeech: boolean | null | undefined,
): SrsPlantStage {
  if (isLeech) return 'wilting';
  if (masteredAt !== null && masteredAt !== undefined && masteredAt !== '') return 'tree';
  switch (fsrsState) {
    case 'New':
      return 'seed';
    case 'Learning':
    case 'Relearning':
      return 'sprout';
    case 'Review':
      return 'flower';
    default: {
      // Exhaustiveness check: a new FSRS state must be mapped above.
      const unknownState: never = fsrsState;
      throw new Error(`stageFromSrs: unknown fsrs_state ${String(unknownState)}`);
    }
  }
}
