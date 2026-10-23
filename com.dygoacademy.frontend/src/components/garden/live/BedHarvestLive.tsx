'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useBedHarvest } from '@/hooks/useBeds';

import { BedHarvestScreen } from '../screens/BedHarvestScreen';
import { LiveError, LiveLoading } from './LiveState';

/**
 * /topics/[id]/harvest: S2 Bed harvest from GET /beds/:id/harvest. A bed
 * that still has seeds goes back to its Topic Bed (A7) instead. Share
 * uses the Web Share API with a line about the bed, else copies it.
 */
export function BedHarvestLive({ topicId }: { topicId: string }) {
  const t = useTranslations('screens.bedHarvest');
  const router = useRouter();
  const harvest = useBedHarvest(topicId);
  const [copied, setCopied] = React.useState(false);
  const notReady = harvest.data ? !harvest.data.harvest_ready : false;

  React.useEffect(() => {
    if (notReady) router.replace(GARDEN_ROUTES.topic(topicId));
  }, [notReady, router, topicId]);

  if (harvest.isPending || notReady) return <LiveLoading />;
  if (harvest.isError || !harvest.data) return <LiveError onRetry={() => void harvest.refetch()} />;
  const h = harvest.data;

  async function share() {
    const text = t('shareText', { count: h.words.length, bed: h.title });
    const url = window.location.origin;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ text, url });
        return;
      } catch {
        // Cancelled or unavailable: fall back to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // No clipboard either: nothing to do.
    }
  }

  return (
    <BedHarvestScreen
      closeHref={GARDEN_ROUTES.home}
      packetsHref={GARDEN_ROUTES.seedPackets(topicId)}
      bed={h.title}
      firstHarvest={h.first_harvest}
      fruit={h.fruit}
      stillGrowing={h.ripe + h.growing}
      words={h.words.map((w) => ({
        id: w.topic_word_id,
        word: w.word,
        stage: w.stage,
      }))}
      onShare={() => void share()}
      copied={copied}
    />
  );
}
