import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { OnboardReminderLive } from '@/components/garden/live/OnboardReminderLive';

/** Onboarding OB4 Reminder (step 2 of 2). */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('screens.onboarding.reminder');
  return { title: t('metaTitle') };
}

export default function OnboardReminderPage() {
  return <OnboardReminderLive />;
}
