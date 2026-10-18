import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { ForgotPasswordLive } from '@/components/garden/auth/ForgotPasswordLive';
import { ROUTES } from '@/constants/routes';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/supabase/session-user';

import { GardenAuthRoot } from '../garden-auth';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('screens.auth.forgot');
  return { title: t('metaTitle') };
}

/**
 * /forgot-password (UI-A A-4, AU4).
 * Signed-in learners go home, like `(auth)/layout.tsx` does for /login.
 */
export default async function ForgotPasswordPage() {
  const supabase = await createServerSupabaseClient();
  const user = await getSessionUser(supabase);
  if (user) redirect(ROUTES.home);

  return (
    <GardenAuthRoot>
      <ForgotPasswordLive />
    </GardenAuthRoot>
  );
}
