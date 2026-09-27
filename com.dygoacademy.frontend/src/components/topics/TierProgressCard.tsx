import { Card, CardContent } from '@/components/ui/card';
import type { TierProgress } from '@/types';

/**
 * Phase 9, "Vocabulary Mastery Tier Ladder" (`phase 9 implementation
 * plan.md`) -- replaces the mockup's invented "Band trend: 6.4" /
 * "Estimated band: On track for 7.0" gauges. Deliberately shows no
 * decimal score anywhere: the ring's center is `pct` (a real, checkable
 * completion percentage within the current tier), and the copy below it
 * is "N of M words to [next tier]" -- a checkable claim ("you know these
 * words"), not an estimate of real exam performance. See
 * `srs.service.ts`'s `TierProgress` doc comment for why that distinction
 * is the whole point of this feature.
 *
 * Restyled from a linear bar to a ring 2026-09-20, live-requested
 * ("follow the UI/UX design with same with mock design with light mode
 * not dark mode") -- matches the mockup's ring-left/text-right layout
 * and its `MasteryRing`-style conic-gradient technique (no chart library,
 * same reasoning `MasteryRing`'s own comment already gives), but keeps
 * this app's existing light color tokens throughout rather than adopting
 * the mockup's dark navy palette.
 *
 * Shared by both Home (`(dashboard)/page.tsx`) and Analytics
 * (`analytics/page.tsx`) rather than each computing its own -- both read
 * the same `useTierProgress()` hook / `GET /srs/tier-progress` endpoint,
 * so they cannot disagree (same rule Phase 6 FR-9.1/9.2/9.3 already fixed
 * once for streak/due-count).
 */
export function TierProgressCard({ progress }: { progress: TierProgress }) {
  const pct =
    progress.wordsInTier > 0
      ? Math.min(1, progress.masteredInTier / progress.wordsInTier)
      : 0;
  const pctLabel = `${Math.round(pct * 100)}%`;
  const size = 72;

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div
          className="relative shrink-0 rounded-full"
          style={{
            width: size,
            height: size,
            background: `conic-gradient(hsl(var(--primary)) ${pct}turn, hsl(var(--muted)) 0turn)`,
          }}
          role="img"
          aria-label={`${progress.tierName}: ${pctLabel} of the way to ${progress.nextTierName ?? 'the top tier'}`}
        >
          <div
            className="absolute flex flex-col items-center justify-center rounded-full bg-card"
            style={{ inset: size * 0.12 }}
          >
            <span className="text-base font-semibold leading-none">{pctLabel}</span>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-semibold">{progress.tierName}</span>
            <span className="shrink-0 text-xs text-muted-foreground">Tier {progress.tier} of 4</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {progress.nextTierName
              ? `${progress.masteredInTier} of ${progress.wordsInTier} words to ${progress.nextTierName}`
              : `${progress.masteredInTier} of ${progress.wordsInTier} words mastered — top tier reached`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
