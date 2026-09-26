import type { Viewport } from 'next';
import { getLocale } from 'next-intl/server';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

import { GARDEN_UI_COOKIE, isGardenEnabled } from '@/lib/garden-ui';

import { GardenRoot } from '../(garden)/GardenRoot';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#24463A',
};

/**
 * Canvas reference pages (UI-fidelity 4): /garden/_reference/<name>
 * renders one garden screen with the canvas sample data, for the pixel
 * diff against docs/design/garden/reference/<name>.png
 * (`npm run garden:diff`).
 *
 * Its own route group so it doesn't need a Supabase session (the diff
 * runs against `next dev` without signing in). Gates, all server-side:
 *  1. Never in production: middleware.ts rewrites these paths to the 404
 *     page when NODE_ENV is "production", and this layout and the page
 *     check again.
 *  2. The garden flag or the `?ui=garden` cookie, like every garden page.
 * The pages show only fixture data, never a user's.
 */
export default async function GardenReferenceLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const cookieStore = await cookies();
  if (!isGardenEnabled(cookieStore.get(GARDEN_UI_COOKIE)?.value)) notFound();

  const locale = await getLocale();
  return <GardenRoot locale={locale}>{children}</GardenRoot>;
}
