'use client';

import * as React from 'react';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useMarkSeedDropSeen, useSeedDrop } from '@/hooks/useBeds';

import { SeedDropScreen } from '../screens/SeedDropScreen';
import { LiveError, LiveLoading } from './LiveState';

/**
 * /topics/[id]/seeds?word=…: S1 Fruit drops seeds from GET
 * /beds/seed-drops/:droppedBy, marked seen once shown (so the next
 * session doesn't offer it again). Plant them now plants just these seeds;
 * Later and ✕ go on to `next` (the session's Mission complete), else home.
 * `next` must be an app path, never another site.
 */
export function SeedDropLive({ droppedBy, next }: { droppedBy: string; next?: string }) {
  const drop = useSeedDrop(droppedBy);
  const seen = useMarkSeedDropSeen();
  const marked = React.useRef(false);
  const shown = Boolean(drop.data);

  React.useEffect(() => {
    if (!shown || marked.current) return;
    marked.current = true;
    seen.mutate(droppedBy);
  }, [shown, droppedBy, seen]);

  if (drop.isPending) return <LiveLoading />;
  if (drop.isError || !drop.data) return <LiveError onRetry={() => void drop.refetch()} />;
  const d = drop.data;
  const after = next && next.startsWith('/') && !next.startsWith('//') ? next : GARDEN_ROUTES.home;

  return (
    <SeedDropScreen
      closeHref={after}
      laterHref={after}
      plantHref={GARDEN_ROUTES.plantSeeds(droppedBy, Math.max(1, d.seeds.length))}
      word={d.dropped_by.word}
      bed={d.bed.title}
      wordsBefore={d.bed_words_before}
      wordsAfter={d.bed_words_after}
      seeds={d.seeds.map((s) => ({
        id: s.topic_word_id,
        word: s.word,
        kind: s.kind,
        partOfSpeech: s.part_of_speech,
        meaning: s.meaning,
        audioSrc: s.audio_url,
      }))}
    />
  );
}
