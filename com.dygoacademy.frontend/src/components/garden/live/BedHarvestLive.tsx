'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useBedHarvest } from '@/hooks/useBeds';
import { basketLine, drawHarvestCard } from '@/lib/harvest-card';

import { useGardenFormat } from '../format';
import { BedHarvestScreen } from '../screens/BedHarvestScreen';
import { LiveError, LiveLoading } from './LiveState';

/**
 * /topics/[id]/harvest: S2 Bed harvest from GET /beds/:id/harvest. A bed
 * that still has seeds goes back to its Topic Bed (A7) instead. Share
 * sends the S7 share card image (lib/harvest-card) with a line about the
 * bed; without file sharing just the line and link, else it copies them.
 */
export function BedHarvestLive({ topicId }: { topicId: string }) {
  const t = useTranslations('screens.bedHarvest');
  const router = useRouter();
  const f = useGardenFormat();
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
      // S7: the share card image, when the browser can share files.
      try {
        const card = await drawHarvestCard({
          brand: t('card.brand'),
          overline: t('card.overline', { bed: h.title }),
          title: t('card.title', { count: h.words.length }),
          stats: [
            { value: f.number(h.words.length), label: t('card.grown') },
            { value: f.number(h.fruit), label: t('card.fruit'), tone: 'flower' },
            ...(h.days_active !== null
              ? [{ value: f.number(Math.max(1, h.days_active)), label: t('card.days') }]
              : []),
          ],
          words: basketLine(h.words.map((w) => w.word)),
          site: t('card.site'),
        });
        const file = new File([card], t('card.file'), { type: 'image/png' });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], text, url });
          return;
        }
      } catch (err) {
        // Cancelled by the learner: stop here; anything else falls back.
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
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
