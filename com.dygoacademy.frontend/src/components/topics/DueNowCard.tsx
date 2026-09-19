import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ROUTES } from '@/constants/routes';

/**
 * Wireframe 1d's centerpiece — "one decision on open." `dueCount` used to
 * be a mock prop (`GET /srs/due` didn't have a frontend caller); the
 * dashboard now passes `useSrsStats()`'s real `due_now` (Phase 2 FR-9.2,
 * live-audited 2026-09-19: this exact number disagreed with the Progress
 * page's "DUE NOW" tile because Home was still on a hardcoded literal).
 *
 * `etaMinutes` was also a mock prop (a flat "about 4 minutes" regardless
 * of `dueCount`) with no backing computation anywhere in the schema --
 * `SrsStats` has no per-card timing data, and inventing a seconds-per-card
 * constant here would just be a second, differently-shaped version of the
 * same "number the user can't trust" problem Phase 2 exists to close, not
 * a fix for it. Made optional and only rendered when a caller actually has
 * a real value to pass -- today, nothing does, so the estimate line is
 * gone rather than replaced with a fabricated one.
 */
export function DueNowCard({
  dueCount,
  etaMinutes,
}: {
  dueCount: number;
  etaMinutes?: number;
}) {
  return (
    <Card className="border-2 border-primary">
      <CardContent className="flex flex-col gap-3 p-5">
        <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
          Due now
        </span>
        <p className="text-4xl font-semibold leading-none">{dueCount} words</p>
        {etaMinutes !== undefined && (
          <p className="text-sm text-muted-foreground">about {etaMinutes} minutes</p>
        )}
        <Button asChild size="lg" className="mt-1">
          <Link href={ROUTES.study}>Start review</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
