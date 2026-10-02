import { redirect } from 'next/navigation';

import { ROUTES } from '@/constants/routes';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Signed-out shell for /login and /register. A signed-in user who lands
 * here goes home instead of seeing a sign-in form for an account they're
 * already in. The pages draw their own garden shell (language chip,
 * hero), so this layout only redirects (UI-8 U8-3 removed the classic
 * navbar along with the classic forms).
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(ROUTES.home);
  }

  return <>{children}</>;
}
