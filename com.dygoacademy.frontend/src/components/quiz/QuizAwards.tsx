'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { REQUIZ_STORAGE_KEY, ROUTES } from '@/constants/routes';
import { useSrsStats } from '@/hooks/useSrsStats';

/**
 * Quiz completion screen (live-requested 2026-09-24 -- "when user finish
 * quiz please change the screen to awards users"). Replaces the bare
 * "You got N of M right." text `quiz/page.tsx`'s `done` state shipped
 * with since Module 5.
 *
 * Only rendered for a genuine completed quiz (`totalCount > 0`) --
 * `quiz/page.tsx`'s zero-item edge cases ("No leech words right now,"
 * "Not enough enriched words yet," "Those words aren't quizzable right
 * now") stay as plain text there, since there's nothing to celebrate
 * about a quiz that never had any questions.
 *
 * Score ring reuses the conic-gradient technique `MasteryRing`/
 * `TierProgressCard` already use elsewhere in the app, at hero size,
 * rather than importing `MasteryRing` directly -- its `masteredCount`/
 * `wordCount` prop names are topic-mastery-specific and would read
 * oddly bound to a quiz score, the same reasoning `TierProgressCard`'s
 * own header comment already gives for not reusing `MasteryRing` either.
 *
 * Streak pill reads `useSrsStats()` directly rather than threading a
 * prop through `quiz/page.tsx` -- the same hook Home/Analytics already
 * call, so this is very likely a cache hit (no extra network round
 * trip) rather than a new request, and it keeps this component
 * self-contained. Tier message is computed from the real score, never a
 * fabricated grade -- no message below "Keep practicing!" that reads as
 * a failure.
 *
 * "Review N missed words" reuses the exact `REQUIZ_STORAGE_KEY` handoff
 * `study/page.tsx`'s own "Quiz these N now" button already uses --
 * `quiz/page.tsx`'s `mode=requiz` branch doesn't care which screen wrote
 * the key, only that it's there when it mounts.
 */
export function QuizAwards({
  correctCount,
  totalCount,
  missedWordIds,
}: {
  correctCount: number;
  totalCount: number;
  missedWordIds: string[];
}) {
  const router = useRouter();
  const { data: stats } = useSrsStats();

  const pct = totalCount > 0 ? Math.min(1, correctCount / totalCount) : 0;
  const pctLabel = `${Math.round(pct * 100)}%`;
  const tierMessage =
    pct >= 0.9
      ? 'Excellent work!'
      : pct >= 0.7
        ? 'Nice work!'
        : pct >= 0.5
          ? 'Good effort!'
          : 'Keep practicing!';

  // Same one-shot sessionStorage handoff `study/page.tsx`'s `startRequiz`
  // already uses -- see `REQUIZ_STORAGE_KEY`'s own comment in
  // constants/routes.ts.
  function reviewMissed() {
    window.sessionStorage.setItem(REQUIZ_STORAGE_KEY, JSON.stringify(missedWordIds));
    router.push('/quiz?mode=requiz');
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
        Quiz complete
      </p>

      <div className="flex items-center justify-center gap-2">
        <LaurelIcon />
        <div
          className="relative h-32 w-32 shrink-0 rounded-full"
          style={{ background: `conic-gradient(hsl(var(--primary)) ${pct}turn, hsl(var(--muted)) 0turn)` }}
          role="img"
          aria-label={`${pctLabel} correct`}
        >
          <div className="absolute inset-3 flex items-center justify-center rounded-full bg-card">
            <span className="text-3xl font-semibold">{pctLabel}</span>
          </div>
        </div>
        <LaurelIcon mirrored />
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">{tierMessage}</h1>
        <p className="text-sm text-muted-foreground">
          You got {correctCount} of {totalCount} right.
        </p>
      </div>

      {stats && (
        <span className="rounded-full border px-2.5 py-1 text-xs">
          {stats.current_streak_days}-day streak
        </span>
      )}

      <div className="flex w-full max-w-xs flex-col gap-2.5">
        {missedWordIds.length > 0 && (
          <Button variant="outline" size="lg" onClick={reviewMissed}>
            Review {missedWordIds.length} missed word{missedWordIds.length === 1 ? '' : 's'}
          </Button>
        )}
        <Button asChild size="lg">
          <Link href={ROUTES.home}>Back to topics</Link>
        </Button>
      </div>
    </div>
  );
}

function LaurelIcon({ mirrored = false }: { mirrored?: boolean }) {
  return (
    <svg
      width="26"
      height="50"
      viewBox="0 0 34 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={mirrored ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path
        d="M30 4C22 10 14 20 10 34C7 45 8 55 12 62"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <g fill="hsl(var(--primary))">
        <ellipse cx="26" cy="10" rx="5" ry="2.6" transform="rotate(-40 26 10)" />
        <ellipse cx="19" cy="18" rx="5.5" ry="2.8" transform="rotate(-25 19 18)" />
        <ellipse cx="14" cy="28" rx="5.8" ry="3" transform="rotate(-10 14 28)" />
        <ellipse cx="11" cy="40" rx="6" ry="3" transform="rotate(5 11 40)" />
        <ellipse cx="11" cy="52" rx="6" ry="3" transform="rotate(20 11 52)" />
      </g>
    </svg>
  );
}
