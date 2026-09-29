import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';

import { ForgotPasswordLive } from '@/components/garden/auth/ForgotPasswordLive';
import { ROUTES } from '@/constants/routes';
import { createServerSupabaseClient } from '@/lib/supabase/server';

import { GardenAuthRoot, gardenAuthOn } from '../garden-auth';

export async function generateMetadata(): Promise<Metadata> {
  if (!(await gardenAuthOn())) return {};
  const t = await getTranslations('screens.auth.forgot');
  return { title: t('metaTitle') };
}

/**
 * /forgot-password (UI-A A-4, AU4): garden only, 404 for classic users.
 * Signed-in learners go home, like `(auth)/layout.tsx` does for /login.
 */
export default async function ForgotPasswordPage() {
  if (!(await gardenAuthOn())) notFound();

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(ROUTES.home);

  return (
    <GardenAuthRoot>
      <ForgotPasswordLive />
    </GardenAuthRoot>
  );
}
