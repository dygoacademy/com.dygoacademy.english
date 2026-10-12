import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { OnboardLevelLive } from '@/components/garden/live/OnboardLevelLive';

/** Onboarding OB1 About you (level and goal). */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('screens.onboarding.about');
  return { title: t('metaTitle') };
}

export default function OnboardLevelPage() {
  return <OnboardLevelLive />;
}
