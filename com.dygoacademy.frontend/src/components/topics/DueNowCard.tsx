import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ROUTES } from '@/constants/routes';

/**
 * Wireframe 1d's centerpiece — "one decision on open." dueCount/etaMinutes
 * are mock props today: GET /srs/due (Phase 2, Module 3) is what will
 * feed this for real. Kept as explicit props rather than hardcoded so the
 * call site is the one place that has to be updated when that lands.
 */
export function DueNowCard({
  dueCount,
  etaMinutes,
}: {
  dueCount: number;
  etaMinutes: number;
}) {
  return (
    <Card className="border-2 border-primary">
      <CardContent className="flex flex-col gap-3 p-5">
        <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
          Due now
        </span>
        <p className="text-4xl font-semibold leading-none">{dueCount} words</p>
        <p className="text-sm text-muted-foreground">about {etaMinutes} minutes</p>
        <Button asChild size="lg" className="mt-1">
          <Link href={ROUTES.study}>Start review</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
