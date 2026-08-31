import { redirect } from 'next/navigation';

import { Navbar } from '@/components/layout/Navbar';
import { ROUTES } from '@/constants/routes';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Main authenticated portal shell (tech spec §2). Re-checks the session
 * server-side as defense in depth — src/middleware.ts already redirects
 * unauthenticated requests away from this route group, but a Server
 * Component that trusted middleware alone would render authenticated UI
 * for a split second (or fully, if the matcher in middleware.ts is ever
 * narrowed by mistake) before that redirect lands. Checking again here is
 * cheap: getUser() revalidates against Supabase, and middleware already
 * refreshed the cookie this request is reading.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(ROUTES.login);
  }

  return (
    <div className="min-h-screen">
      <Navbar userEmail={user.email ?? 'unknown'} />
      <main>{children}</main>
    </div>
  );
}
