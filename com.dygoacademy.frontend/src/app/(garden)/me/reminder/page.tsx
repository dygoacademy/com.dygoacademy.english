import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ReminderLive } from '@/components/garden/live/ReminderLive';

/** A8c Reminder. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('garden.pages');
  return { title: t('reminder') };
}

export default function GardenReminderPage() {
  return <ReminderLive />;
}
