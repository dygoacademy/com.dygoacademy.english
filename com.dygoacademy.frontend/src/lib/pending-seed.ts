/**
 * The word a visitor planted on the landing page (HP-9 "Save this word",
 * `/register?seed=<word>`), kept until they're signed in and then saved to
 * their My words bed (`usePlantPendingSeed`). localStorage, not
 * sessionStorage, so it survives an email-confirm link opened in a new
 * tab. Storage may be blocked: then the word just isn't kept.
 */
export const PENDING_SEED_KEY = 'dygo:pending-seed';

/** Longest word or phrase kept (the hero field's own limit is shorter). */
const MAX_LENGTH = 60;

/** The word to keep, or null for nothing usable (blank, too long, no letter). */
export function cleanSeed(raw: string | null | undefined): string | null {
  const word = raw?.trim().replace(/\s+/g, ' ') ?? '';
  if (!word || word.length > MAX_LENGTH || !/\p{L}/u.test(word)) return null;
  return word;
}

export function keepPendingSeed(raw: string | null | undefined): void {
  const word = cleanSeed(raw);
  if (!word) return;
  try {
    window.localStorage.setItem(PENDING_SEED_KEY, word);
  } catch {
    // Blocked storage: nothing is kept.
  }
}

/** The kept word, removed from storage so it is saved only once. */
export function takePendingSeed(): string | null {
  try {
    const word = cleanSeed(window.localStorage.getItem(PENDING_SEED_KEY));
    window.localStorage.removeItem(PENDING_SEED_KEY);
    return word;
  } catch {
    return null;
  }
}
