import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { LanguageLive } from '@/components/garden/live/LanguageLive';

/** A8f Language & accent. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('garden.pages');
  return { title: t('language') };
}

export default function GardenLanguagePage() {
  return <LanguageLive />;
}
