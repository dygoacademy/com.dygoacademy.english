import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ResetPasswordLive } from '@/components/garden/auth/ResetPasswordLive';

import { GardenAuthRoot } from '../garden-auth';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('screens.auth.reset');
  return { title: t('metaTitle') };
}

/**
 * /reset-password (UI-A A-4): where the reset email's link lands, to set
 * a new password. Garden only, 404 for classic users. No signed-in
 * redirect: the link itself signs the learner in (recovery session).
 */
export default async function ResetPasswordPage() {
  return (
    <GardenAuthRoot>
      <ResetPasswordLive />
    </GardenAuthRoot>
  );
}
