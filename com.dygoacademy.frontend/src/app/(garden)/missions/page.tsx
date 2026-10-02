import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { HarvestLive } from '@/components/garden/live/HarvestLive';

/** Weekly harvest (A4). */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('garden.pages');
  return { title: t('missions') };
}

export default function GardenMissionsPage() {
  return <HarvestLive />;
}
