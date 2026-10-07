import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { OnboardGoalLive } from '@/components/garden/live/OnboardGoalLive';

/** Onboarding OB2 Target band. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('screens.onboarding.goal');
  return { title: t('metaTitle') };
}

export default function OnboardGoalPage() {
  return <OnboardGoalLive />;
}
