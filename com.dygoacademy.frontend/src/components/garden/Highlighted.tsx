import { splitMatch } from '@/lib/search/fold';

/**
 * Search result text with the first match of `query` (case- and
 * accent-insensitive) on a gold background, as on the A6b / A7c boards.
 * The rest keeps the parent's colour; the match is in the text colour.
 */
export function Highlighted({ text, query, lang }: { text: string; query: string; lang?: string }) {
  const parts = splitMatch(text, query);
  if (!parts) return <span lang={lang}>{text}</span>;
  return (
    <span lang={lang}>
      {parts[0]}
      <b className="rounded-[3px] bg-gold-light text-text">{parts[1]}</b>
      {parts[2]}
    </span>
  );
}
