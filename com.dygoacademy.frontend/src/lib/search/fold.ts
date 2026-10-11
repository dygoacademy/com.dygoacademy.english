/**
 * Case- and accent-insensitive search for the garden's searches (A7c words
 * in a topic, A6b topics; 2026-10-11): "giam" finds "giảm", "DE" finds
 * "deteriorate". Each character is folded on its own (NFD, marks
 * stripped, đ → d, lower case) so a match maps back to the original text
 * for highlighting.
 */
function foldChar(ch: string): string {
  return ch
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();
}

/** `text` folded for comparing. */
export function fold(text: string): string {
  return Array.from(text, foldChar).join('');
}

/**
 * Where `query` first occurs in `text`, as [start, end) in `text`'s own
 * UTF-16 indices; null when it doesn't (or the query is blank).
 */
export function findMatch(text: string, query: string): [number, number] | null {
  const q = fold(query.trim());
  if (!q) return null;
  let folded = '';
  /** folded index → index in `text` where that character starts. */
  const starts: number[] = [];
  let at = 0;
  for (const ch of Array.from(text)) {
    const f = foldChar(ch);
    for (let i = 0; i < f.length; i += 1) starts.push(at);
    folded += f;
    at += ch.length;
  }
  starts.push(text.length);
  const i = folded.indexOf(q);
  if (i < 0) return null;
  const end = starts[i + q.length] ?? text.length;
  return [starts[i], end];
}

/** `text` split around its first match: [before, match, after], or null. */
export function splitMatch(text: string, query: string): [string, string, string] | null {
  const m = findMatch(text, query);
  return m ? [text.slice(0, m[0]), text.slice(m[0], m[1]), text.slice(m[1])] : null;
}
