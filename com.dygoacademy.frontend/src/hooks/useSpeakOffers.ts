'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTimeZone } from 'next-intl';

import { apiClient } from '@/lib/api-client';
import { micPermission, speakingSupport } from '@/lib/speaking/audio';
import { pickSpeakOffers } from '@/lib/speaking/offers';
import type { DueCard, SpeakingWordItem, SpeakingWordLookup } from '@/types';

/**
 * "Say this one?" offers for a review session (rule T9-a): one
 * `GET /speaking/words?topic_word_ids=…` when the cards load, then
 * pickSpeakOffers once. No offers at all when this browser can't record or
 * the mic was denied before; `hide()` ("Skip speaking") turns the rest off.
 */
export function useSpeakOffers(cards: readonly DueCard[] | null): {
  offers: ReadonlySet<string>;
  hide: () => void;
} {
  const timeZone = useTimeZone();
  const [possible, setPossible] = useState(false);
  const [offers, setOffers] = useState<ReadonlySet<string> | null>(null);
  const [hidden, setHidden] = useState(false);
  const ids = useMemo(() => (cards ?? []).map((c) => c.topic_word_id), [cards]);

  useEffect(() => {
    if (speakingSupport().recorder === null) return;
    void micPermission().then((p) => setPossible(p !== 'denied'));
  }, []);

  const lookup = useQuery({
    queryKey: ['speaking', 'lookup', ids.join(',')],
    queryFn: () =>
      apiClient.get<SpeakingWordLookup[]>(
        `/speaking/words?topic_word_ids=${ids.map(encodeURIComponent).join(',')}` +
          (timeZone ? `&tz=${encodeURIComponent(timeZone)}` : ''),
      ),
    enabled: possible && ids.length > 0,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  if (offers === null && cards && lookup.data) {
    setOffers(new Set(pickSpeakOffers(cards, lookup.data)));
  }

  return {
    offers: hidden || !possible || !offers ? EMPTY : offers,
    hide: () => setHidden(true),
  };
}

const EMPTY: ReadonlySet<string> = new Set();

/** The speaking item for one card (`GET /speaking/words/:topicWordId`), for the sheet. */
export function useSpeakingWord(topicWordId: string | null) {
  return useQuery({
    queryKey: ['speaking', 'word', topicWordId],
    queryFn: () =>
      apiClient.get<SpeakingWordItem>(`/speaking/words/${encodeURIComponent(topicWordId ?? '')}`),
    enabled: Boolean(topicWordId),
    refetchOnWindowFocus: false,
  });
}
