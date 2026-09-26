import type { Viewport } from 'next';
import { getLocale } from 'next-intl/server';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import { ROUTES } from '@/constants/routes';
import { GARDEN_UI_COOKIE, isGardenEnabled } from '@/lib/garden-ui';
import { createServerSupabaseClient } from '@/lib/supabase/server';

import { GardenRoot } from './GardenRoot';

/**
 * Word Garden viewport (design system §3). Overrides the root layout's
 * viewport for garden screens only: `viewport-fit=cover` lets the page
 * draw under the notch / home indicator and pad back with the safe-area
 * helpers in globals.css. Classic screens keep the root viewport, since
 * they have no safe-area padding and would slide under the notch.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#24463A',
};

/**
 * Word Garden route group (ui rebuild implementation plan.md, UI-0/UI-1).
 *
 * Built next to (dashboard), not inside it, so the new screens get their
 * own layout, fonts and theme while the classic UI stays untouched.
 *
 * Gates, both server-side:
 *  1. Flag — middleware.ts already 404s unflagged /garden requests; this
 *     re-check is defense in depth, like the session check below.
 *  2. Session — same check as the (dashboard) layout. /garden isn't in
 *     PROTECTED_PATH_PREFIXES yet (routes.ts is left alone until UI-8).
 *
 * GardenRoot sets `data-ui="garden"` (the garden tokens in globals.css),
 * the font variables and the next-intl provider.
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

  const locale = await getLocale();

  return <GardenRoot locale={locale}>{children}</GardenRoot>;
}
