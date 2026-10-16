'use client';

import * as React from 'react';

import { useCreateWord } from '@/hooks/useCreateWord';
import { ApiError } from '@/lib/api-client';
import { keepPendingSeed, takePendingSeed } from '@/lib/pending-seed';

/**
 * Saves the landing page's "Save this word" word (lib/pending-seed.ts) to
 * the learner's My words bed once they're signed in: on the first
 * onboarding screen, or on Home for anyone who skipped onboarding (an
 * invite). Their own words are planted first, so it's among the first 5.
 * Already in My words (409) counts as saved; any other failure keeps the
 * word for the next screen that calls this.
 */
export function usePlantPendingSeed(): void {
  const create = useCreateWord(null);
  const { mutate } = create;
  const started = React.useRef(false);

  React.useEffect(() => {
    if (started.current) return;
    started.current = true;
    const word = takePendingSeed();
    if (!word) return;
    mutate(
      { word },
      {
        onError: (error) => {
          if (error instanceof ApiError && error.status === 409) return;
          keepPendingSeed(word);
        },
      },
    );
  }, [mutate]);
}
