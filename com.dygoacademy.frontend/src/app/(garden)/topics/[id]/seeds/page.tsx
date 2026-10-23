import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { SeedDropLive } from '@/components/garden/live/SeedDropLive';

/** Seeds & Harvest S1: `?word=` (a fruit topic word) dropped seeds into this bed; `?next=` after. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('garden.pages');
  return { title: t('seedDrop') };
}

export default async function GardenSeedDropPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { word, next } = await searchParams;
  return (
    <SeedDropLive
      droppedBy={typeof word === 'string' ? word : ''}
      next={typeof next === 'string' ? next : undefined}
    />
  );
}
