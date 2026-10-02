import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { JoinLive } from '@/components/garden/live/JoinLive';

/** Join a shared garden from an invite link (UI-G, GR6). */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('garden.pages');
  return { title: t('join'), robots: { index: false, follow: false } };
}

export default async function GardenJoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <JoinLive token={token} />;
}
