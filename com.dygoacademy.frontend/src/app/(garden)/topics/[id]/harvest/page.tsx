import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { BedHarvestLive } from '@/components/garden/live/BedHarvestLive';

/** Seeds & Harvest S2: a bed with nothing left to plant. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('garden.pages');
  return { title: t('bedHarvest') };
}

export default async function GardenBedHarvestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BedHarvestLive topicId={id} />;
}
