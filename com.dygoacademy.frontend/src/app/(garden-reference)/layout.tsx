import type { Viewport } from 'next';
import { notFound } from 'next/navigation';

import { referencePagesAllowed } from '@/lib/garden-reference';

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
 *  1. Not in production, unless the build set GARDEN_REFERENCE_PAGES=on
 *     (`referencePagesAllowed`, for diffing UAT): middleware.ts rewrites
 *     these paths to the 404 page, and this layout and the page check again.
 * The pages show only fixture data, never a user's.
 *
 * UI-L: each page wraps itself in `GardenRoot` with the language from
 * `?locale=en-US|vi-VN|zh-CN` (not the learner's), so this layout only gates.
 */
export default async function GardenReferenceLayout({ children }: { children: React.ReactNode }) {
  if (!referencePagesAllowed()) notFound();

  return children;
}
