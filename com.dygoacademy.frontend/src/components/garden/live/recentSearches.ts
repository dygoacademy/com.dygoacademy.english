/**
 * Recent searches (A7c per bed, A6b for topics; 2026-10-11): the last 3,
 * newest first, in localStorage. Storage can be missing or full (private
 * mode), so every read and write is best effort.
 */
const MAX_RECENT = 3;

const keyFor = (scope: string) => `dygo:recent-search:${scope}`;

export function loadRecent(scope: string): string[] {
  try {
    const raw = window.localStorage.getItem(keyFor(scope));
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list)
      ? list.filter((x): x is string => typeof x === 'string').slice(0, MAX_RECENT)
      : [];
  } catch {
    return [];
  }
}

/** Adds `query` (trimmed) to the front; returns the new list. */
export function saveRecent(scope: string, query: string): string[] {
  const value = query.trim();
  const next = [value, ...loadRecent(scope).filter((q) => q.toLowerCase() !== value.toLowerCase())]
    .filter(Boolean)
    .slice(0, MAX_RECENT);
  try {
    window.localStorage.setItem(keyFor(scope), JSON.stringify(next));
  } catch {
    // Private mode / full storage: keep the list for this visit only.
  }
  return next;
}
