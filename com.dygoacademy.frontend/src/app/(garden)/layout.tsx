import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import { ROUTES } from '@/constants/routes';
import { GARDEN_UI_COOKIE, isGardenEnabled } from '@/lib/garden-ui';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Word Garden route group (ui rebuild implementation plan.md, UI-0).
 *
 * Built next to (dashboard), not inside it, so the new screens get their
 * own layout, fonts and theme while the classic UI stays untouched.
 *
 * Two gates, both server-side:
 *  1. Flag — without NEXT_PUBLIC_GARDEN_UI=true or the `?ui=garden`
 *     cookie, every /garden URL is a plain 404, exactly as before UI-0.
 *  2. Session — same defense-in-depth check as the (dashboard) layout.
 *     /garden isn't in PROTECTED_PATH_PREFIXES yet (routes.ts is left
 *     alone until UI-8), so this layout is the only auth guard for now.
 */
export default async function GardenLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  if (!isGardenEnabled(cookieStore.get(GARDEN_UI_COOKIE)?.value)) {
    notFound();
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(ROUTES.login);
  }

  return <div data-ui="garden">{children}</div>;
}
