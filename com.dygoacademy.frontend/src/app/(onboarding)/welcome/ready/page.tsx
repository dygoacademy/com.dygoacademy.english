import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { OnboardReadyLive } from '@/components/garden/live/OnboardReadyLive';

/** Onboarding OB5 All set. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('screens.onboarding.ready');
  return { title: t('metaTitle') };
}

export default function OnboardReadyPage() {
  return <OnboardReadyLive />;
}
