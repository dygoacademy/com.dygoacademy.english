import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { GroupGardenLive } from '@/components/garden/live/GroupGardenLive';

/** One shared garden (UI-G, GR2). */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('garden.pages');
  return { title: t('group') };
}

export default async function GardenGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GroupGardenLive groupId={id} />;
}
