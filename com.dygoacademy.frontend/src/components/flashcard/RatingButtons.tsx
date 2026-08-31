'use client';

import { useRef } from 'react';

import { Button } from '@/components/ui/button';
import type { SrsRating } from '@/types';

const HOLD_THRESHOLD_MS = 450;

/**
 * Two buttons, four ratings underneath (wireframe 1g/1h captions: "Again
 * / Hard / Good / Easy still drive the algorithm — the student just sees
 * two"). A tap on "Didn't know" is AGAIN, held past the threshold it's
 * HARD ("almost"); a tap on "Knew it" is GOOD, held it's EASY ("too
 * easy"). Pointer events (not click) so this works the same for mouse,
 * touch, and pen.
 */
export function RatingButtons({
  onRate,
  disabled,
}: {
  onRate: (rating: SrsRating) => void;
  disabled?: boolean;
}) {
  const downAt = useRef<number | null>(null);

  function press() {
    downAt.current = Date.now();
  }

  function release(kind: 'again-or-hard' | 'good-or-easy') {
    if (downAt.current === null) return;
    const held = Date.now() - downAt.current > HOLD_THRESHOLD_MS;
    downAt.current = null;
    if (kind === 'again-or-hard') {
      onRate(held ? 'HARD' : 'AGAIN');
    } else {
      onRate(held ? 'EASY' : 'GOOD');
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2.5">
        <Button
          variant="outline"
          size="lg"
          className="flex-1"
          disabled={disabled}
          onPointerDown={press}
          onPointerUp={() => release('again-or-hard')}
          onPointerLeave={() => {
            downAt.current = null;
          }}
        >
          Didn&apos;t know
        </Button>
        <Button
          size="lg"
          className="flex-1"
          disabled={disabled}
          onPointerDown={press}
          onPointerUp={() => release('good-or-easy')}
          onPointerLeave={() => {
            downAt.current = null;
          }}
        >
          Knew it
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Hold &quot;Knew it&quot; for <b>too easy</b> · hold &quot;Didn&apos;t know&quot; for{' '}
        <b>almost</b>
      </p>
    </div>
  );
}
