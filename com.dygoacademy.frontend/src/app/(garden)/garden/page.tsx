import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { HomeLive } from '@/components/garden/live/HomeLive';

/** Today's Garden (A1), or Welcome back (A5) after 2+ missed days. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('garden.home');
  return { title: t('title') };
}

export default function GardenHomePage() {
  return <HomeLive />;
}
