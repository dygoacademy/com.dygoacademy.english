import type { Viewport } from 'next';
import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import { GroupsTabLive } from '@/components/garden/live/GroupsTabLive';
import { ROUTES } from '@/constants/routes';
import { getGardenLocaleContext, getGardenUser } from '@/i18n/garden-locale';
import { GARDEN_UI_COOKIE, isGardenEnabled } from '@/lib/garden-ui';

import { GardenRoot } from './GardenRoot';

/**
 * Word Garden viewport (design system §3). Overrides the root layout's
 * viewport for garden screens only: `viewport-fit=cover` lets the page
 * draw under the notch / home indicator and pad back with the safe-area
 * helpers in globals.css. Classic screens keep the root viewport, since
 * they have no safe-area padding and would slide under the notch.
 */
export async function generateViewport(): Promise<Viewport> {
  const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    themeColor: '#24463A',
  };
  // iOS (Safari and Chrome, both WebKit) zooms the page while a text field
  // has focus and can leave it zoomed after tapping out of the field (quiz
  // "Fill in the blank", iPhone 17 Pro Max, 2026-10-02). maximum-scale=1
  // stops those automatic zooms; iOS still lets people pinch-zoom (it
  // ignores maximum-scale for user gestures since iOS 10). Android would
  // block pinch-zoom with it, so it is set for iPhone/iPad only.
  const ua = (await headers()).get('user-agent') ?? '';
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && /Mobile\//.test(ua))) {
    viewport.maximumScale = 1;
  }
  return viewport;
}

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
 *
 * UI-L: the language, formatting locale and time zone come from
 * `getGardenLocaleContext()` (profile → `dygo_locale` cookie →
 * Accept-Language → English), the same cached lookup `src/i18n/request.ts`
 * uses, so the session and profile are read once per request.
 */
export default async function GardenLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  if (!isGardenEnabled(cookieStore.get(GARDEN_UI_COOKIE)?.value)) {
    notFound();
  }

  const { user } = await getGardenUser();

  if (!user) {
    redirect(ROUTES.login);
  }

  const locale = await getGardenLocaleContext();

  return (
    <GardenRoot
      appLocale={locale.appLocale}
      formatLocale={locale.formatLocale}
      timeZone={locale.timeZone}
      meaningLocale={locale.meaningLocale}
      stored={locale.stored}
    >
      <GroupsTabLive>{children}</GroupsTabLive>
    </GardenRoot>
  );
}
