import { redirect } from 'next/navigation';

import { ROUTES } from '@/constants/routes';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Mirrors `(dashboard)/layout.tsx`'s own defense-in-depth reasoning, the
 * other direction: `constants/routes.ts` has exported an `isAuthPath` helper
 * since before this pass, but nothing ever called it — a signed-in user
 * could still land on /login or /register and see a sign-in form for an
 * account they're already in. Closed here rather than left as dead code
 * once the forms behind those routes became real (this same pass).
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(ROUTES.topics);
  }

  return <>{children}</>;
}
