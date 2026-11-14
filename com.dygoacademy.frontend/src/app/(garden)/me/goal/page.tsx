import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { DailyGoalLive } from '@/components/garden/live/DailyGoalLive';

/** A8b Daily goal. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('garden.pages');
  return { title: t('goal') };
}

export default function GardenGoalPage() {
  return <DailyGoalLive />;
}
