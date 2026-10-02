import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { parseSessionResult } from '@/components/garden/live/data';
import { DoneLive } from '@/components/garden/live/DoneLive';

/** Mission complete (A3) for the session /review just finished. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('garden.pages');
  return { title: t('done') };
}

export default async function GardenReviewDonePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <DoneLive result={parseSessionResult(await searchParams)} />;
}
