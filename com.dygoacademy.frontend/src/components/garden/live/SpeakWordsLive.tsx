'use client';

import * as React from 'react';
import { useQueries } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { apiClient } from '@/lib/api-client';
import type { SpeakNoticeKind } from '@/lib/speaking/constants';
import type { SpeakingAccent, SpeakingSessionItem, SpeakingWordItem } from '@/types';

import { LiveError, LiveLoading } from './LiveState';
import { SpeakFlow } from './SpeakLive';

/**
 * /sounds?words=a,b,c: "Say all" on "Bees are waiting" (A7, 2026-10-11).
 * Each word's sentence (GET /speaking/words/:id, the same query as one
 * word's mic), then The Pond's flow over them in order, in harvest mode
 * when asked. A word that fails to load is skipped; none loading is an
 * error.
 */
export function SpeakWordsLive({
  wordIds,
  harvest,
  closeHref,
  forceNotice,
}: {
  wordIds: readonly string[];
  harvest: boolean;
  closeHref: string;
  forceNotice?: SpeakNoticeKind;
}) {
  const router = useRouter();
  const words = useQueries({
    queries: wordIds.map((id) => ({
      queryKey: ['speaking', 'word', id],
      queryFn: () =>
        apiClient.get<SpeakingWordItem>(`/speaking/words/${encodeURIComponent(id)}`),
      refetchOnWindowFocus: false,
    })),
  });
  // Taken once, like The Pond: a refetch mustn't swap sentences mid-flow.
  const [taken, setTaken] = React.useState<{
    items: SpeakingSessionItem[];
    accent: SpeakingAccent;
  } | null>(null);
  if (taken === null && words.every((w) => !w.isPending)) {
    const loaded = words.flatMap((w) => (w.data ? [w.data] : []));
    setTaken({ items: loaded.map((w) => w.item), accent: loaded[0]?.default_accent ?? 'US' });
  }

  if (!taken) return <LiveLoading />;
  if (taken.items.length === 0) return <LiveError />;
  return (
    <SpeakFlow
      items={taken.items}
      defaultAccent={taken.accent}
      closeHref={closeHref}
      harvest={harvest}
      onSkipSpeaking={() => router.push(closeHref)}
      forceNotice={forceNotice}
    />
  );
}
