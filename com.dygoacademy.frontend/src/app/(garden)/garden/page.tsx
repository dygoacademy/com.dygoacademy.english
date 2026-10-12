import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { HomeLive } from '@/components/garden/live/HomeLive';
import { GARDEN_ROUTES } from '@/constants/garden';
import { needsOnboarding } from '@/i18n/garden-locale';

/** Today's Garden (A1), or Welcome back (A5) after 2+ missed days. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('garden.home');
  return { title: t('title') };
}

/**
 * A learner who hasn't finished onboarding (OB1, OB4, OB5; `onboarded_at` null)
 * starts there instead. Only the garden home checks, so an invite sign-up
 * still lands straight in their group (/join → /groups/…) and meets
 * onboarding the first time they open the Garden tab.
 */
export default async function GardenHomePage() {
  if (await needsOnboarding()) {
    redirect(GARDEN_ROUTES.welcome.level);
  }
  return <HomeLive />;
}
