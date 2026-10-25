'use client';

import * as React from 'react';

/**
 * The learner's take for "You" (pronunciation v2): kept in memory only
 * (a Blob and its object URL, never storage), and cleared when they leave
 * P4: next bee, back to the bed, close, or try again. `clear` also revokes
 * the URL, so the recording can't be played after.
 */
export function useTake() {
  const [take, setTake] = React.useState<{ blob: Blob; url: string } | null>(null);
  const ref = React.useRef(take);
  ref.current = take;

  const keep = React.useCallback((blob: Blob) => {
    setTake((old) => {
      if (old) URL.revokeObjectURL(old.url);
      return { blob, url: URL.createObjectURL(blob) };
    });
  }, []);
  const clear = React.useCallback(() => {
    setTake((old) => {
      if (old) URL.revokeObjectURL(old.url);
      return null;
    });
  }, []);
  // Leaving the word (unmount) clears it too.
  React.useEffect(
    () => () => {
      if (ref.current) URL.revokeObjectURL(ref.current.url);
    },
    [],
  );
  return { blob: take?.blob ?? null, url: take?.url ?? null, keep, clear };
}
