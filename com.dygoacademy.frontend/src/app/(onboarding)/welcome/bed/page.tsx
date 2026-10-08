import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { OnboardBedLive } from '@/components/garden/live/OnboardBedLive';

/** Onboarding OB3 First topic. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('screens.onboarding.bed');
  return { title: t('metaTitle') };
}

export default function OnboardBedPage() {
  return <OnboardBedLive />;
}
