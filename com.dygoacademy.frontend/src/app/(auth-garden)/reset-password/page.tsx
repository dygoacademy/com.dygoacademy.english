import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { ResetPasswordLive } from '@/components/garden/auth/ResetPasswordLive';

import { GardenAuthRoot, gardenAuthOn } from '../garden-auth';

export async function generateMetadata(): Promise<Metadata> {
  if (!(await gardenAuthOn())) return {};
  const t = await getTranslations('screens.auth.reset');
  return { title: t('metaTitle') };
}

/**
 * /reset-password (UI-A A-4): where the reset email's link lands, to set
 * a new password. Garden only, 404 for classic users. No signed-in
 * redirect: the link itself signs the learner in (recovery session).
 */
export default async function ResetPasswordPage() {
  if (!(await gardenAuthOn())) notFound();

  return (
    <GardenAuthRoot>
      <ResetPasswordLive />
    </GardenAuthRoot>
  );
}
