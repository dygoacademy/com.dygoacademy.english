import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { PrivacyLive } from '@/components/garden/live/PrivacyLive';
import { isVoiceDonationOn } from '@/lib/voice-donation';

/** A8e Privacy & data (voice donation); not there with the flag off. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('garden.pages');
  return { title: t('privacy') };
}

export default function GardenPrivacyPage() {
  if (!isVoiceDonationOn()) notFound();
  return <PrivacyLive />;
}
