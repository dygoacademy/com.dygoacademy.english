/** A word answered wrong in this quiz, for the result screen's "need water" list. */
export interface MissedWord {
  id: string;
  word: string;
}

/**
 * Adds a missed word once (by topic word id): a quiz can ask about the same
 * word twice (e.g. cloze and dictation) and the list shows it once, in the
 * order it was first missed.
 */
export function addMissed(list: readonly MissedWord[], id: string, word: string): MissedWord[] {
  if (list.some((w) => w.id === id)) return [...list];
  return [...list, { id, word }];
}
