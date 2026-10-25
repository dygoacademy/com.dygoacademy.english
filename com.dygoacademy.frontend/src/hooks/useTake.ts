'use client';

import * as React from 'react';

import { forgetClip } from './usePlayer';

/** Revokes the take's URL and takes it out of the player, so nothing of it can be played. */
function drop(url: string): void {
  forgetClip(url);
  URL.revokeObjectURL(url);
}

/**
 * The learner's take for "You" (pronunciation v2): kept in memory only
 * (a Blob and its object URL, never storage), and cleared when they leave
 * P4: next bee, back to the bed, close, or try again. Clearing revokes
 * the URL and empties the player if it holds it (UAT Step C, 2026-10-25:
 * a revoked URL still read while the audio element kept it).
 */
export function useTake() {
  const [take, setTake] = React.useState<{ blob: Blob; url: string } | null>(null);
  const ref = React.useRef(take);
  ref.current = take;

  const keep = React.useCallback((blob: Blob) => {
    setTake((old) => {
      if (old) drop(old.url);
      return { blob, url: URL.createObjectURL(blob) };
    });
  }, []);
  const clear = React.useCallback(() => {
    setTake((old) => {
      if (old) drop(old.url);
      return null;
    });
  }, []);
  // Leaving the word (unmount) clears it too.
  React.useEffect(
    () => () => {
      if (ref.current) drop(ref.current.url);
    },
    [],
  );
  return { blob: take?.blob ?? null, url: take?.url ?? null, keep, clear };
}
