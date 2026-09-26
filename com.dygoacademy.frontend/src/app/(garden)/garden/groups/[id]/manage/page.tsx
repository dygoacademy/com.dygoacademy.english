import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { TendGardenLive } from '@/components/garden/live/TendGardenLive';

/** Tend the garden (UI-G, GR3 tricky patches / GR4 gardeners with ?tab=gardeners), admins only. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('garden.pages');
  return { title: t('manage') };
}

export default async function GardenGroupManagePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  return <TendGardenLive groupId={id} tab={tab === 'gardeners' ? 'gardeners' : 'tricky'} />;
}
