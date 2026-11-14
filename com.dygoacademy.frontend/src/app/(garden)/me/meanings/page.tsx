import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { MeaningsLive } from '@/components/garden/live/MeaningsLive';

/** A8d Meanings in. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('garden.pages');
  return { title: t('meanings') };
}

export default function GardenMeaningsPage() {
  return <MeaningsLive />;
}
