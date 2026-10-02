import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { GroupsLive } from '@/components/garden/live/GroupsLive';

/** Shared gardens (UI-G, GR1). */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('garden.pages');
  return { title: t('groups') };
}

export default function GardenGroupsPage() {
  return <GroupsLive />;
}
