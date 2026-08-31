import Link from 'next/link';

/**
 * Wireframe caption: "Leeches appear as plain language at the bottom, not
 * as a concept to learn." Now a real link — `GET /quizzes/leech-drill`
 * (Module 5, Phase 3) is the "real leech-drill destination" this
 * component's own comment used to say didn't exist yet. `count` is still a
 * mock prop, though: the home page (`topics/page.tsx`) hardcodes it rather
 * than reading `GET /srs/leeches`/`srs/stats` — wiring the home page's
 * numbers to real data is a separate, still-open task (see the session
 * report's known gaps), not something this pass's Module 5 scope covers.
 */
export function LeechNudge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <Link
      href="/quiz?mode=leech"
      className="flex items-center justify-between rounded-xl border border-dashed px-3.5 py-2.5 text-sm transition-colors hover:bg-accent"
    >
      <span>
        {count} {count === 1 ? 'word keeps' : 'words keep'} tripping you up
      </span>
      <span className="font-mono text-xs text-muted-foreground">Fix →</span>
    </Link>
  );
}
