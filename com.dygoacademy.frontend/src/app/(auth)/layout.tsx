import { redirect } from 'next/navigation';

import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { ROUTES } from '@/constants/routes';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Mirrors `(dashboard)/layout.tsx`'s own defense-in-depth reasoning, the
 * other direction: `constants/routes.ts` has exported an `isAuthPath` helper
 * since before this pass, but nothing ever called it — a signed-in user
 * could still land on /login or /register and see a sign-in form for an
 * account they're already in. Closed here rather than left as dead code
 * once the forms behind those routes became real (this same pass).
 *
 * `PublicNavbar` added here 2026-09-18 ("add dygo Nav to register and
 * login page"), the same shared guest header `/search` already uses,
 * rather than each page rendering its own copy — one shell for every
 * signed-out route, matching how `(dashboard)/layout.tsx` renders
 * `Navbar` once for every signed-in route instead of per-page. Login had
 * its own bespoke "Dygo" button here before this (calling `router.back()`
 * so /login -- reachable from several different places -- returned to
 * wherever the visitor actually came from); replaced with the standard
 * nav for consistency across all three guest-facing pages, confirmed
 * with the user given that trades away the return-to-origin behavior in
 * favor of PublicNavbar's fixed link back to `/search`. Register had no
 * header at all before this. `min-h-dvh flex-col` here, with each page's
 * own `<main>` as `flex-1`, is the same layout shape `app/search/page.tsx`
 * already uses to sit a header above a vertically-centered card.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(ROUTES.home);
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicNavbar />
      {children}
    </div>
  );
}
