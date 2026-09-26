import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { MeLive } from '@/components/garden/live/MeLive';

/** Me (A8). */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('garden.pages');
  return { title: t('me') };
}

export default function GardenMePage() {
  return <MeLive />;
}
