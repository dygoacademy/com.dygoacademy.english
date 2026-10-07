import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { OnboardLevelLive } from '@/components/garden/live/OnboardLevelLive';

/** Onboarding OB1 Your level. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('screens.onboarding.level');
  return { title: t('metaTitle') };
}

export default function OnboardLevelPage() {
  return <OnboardLevelLive />;
}
