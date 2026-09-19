import Link from 'next/link';

import { ROUTES } from '@/constants/routes';

/**
 * Wireframe caption: "Leeches appear as plain language at the bottom, not
 * as a concept to learn." `count` used to be a mock prop (the home page
 * hardcoded it) and "Fix →" pointed at `/quiz?mode=leech`
 * (`GET /quizzes/leech-drill`) -- a *different* query than the one that
 * would eventually supply the count. Phase 2 FR-9.3 (live-audited
 * 2026-09-19) named exactly this as a real bug once both halves went
 * live: "2 words keep tripping you up · Fix →" led to a leech-drill page
 * that could independently read "No leech words right now," because
 * `leech-drill` and `srs/leeches` are two separately-computed lists that
 * are not guaranteed to agree.
 *
 * Fixed by pointing "Fix →" at the Progress page's own leech section
 * instead (`#leech-words`, added there the same pass) -- that section
 * renders `useLeeches()` directly, the exact same query this component's
 * `count` prop is now sourced from (see `(dashboard)/page.tsx`), so the
 * nudge and its destination can no longer disagree; the FR's acceptance
 * bar is "opens a page listing exactly those N words," which this now
 * literally is. The separate leech-drill *practice* flow still exists at
 * `/quiz?mode=leech` for whoever wants to review them, just no longer as
 * what this specific nudge promises.
 */
export function LeechNudge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <Link
      href={`${ROUTES.analytics}#leech-words`}
      className="flex items-center justify-between rounded-xl border border-dashed px-3.5 py-2.5 text-sm transition-colors hover:bg-accent"
    >
      <span>
        {count} {count === 1 ? 'word keeps' : 'words keep'} tripping you up
      </span>
      <span className="font-mono text-xs text-muted-foreground">Fix →</span>
    </Link>
  );
}
