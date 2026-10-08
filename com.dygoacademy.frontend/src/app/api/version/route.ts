import { NextResponse } from 'next/server';

import { BUILD_ID } from '@/lib/app-version';

export const dynamic = 'force-dynamic';

/**
 * GET /api/version (PWA updates, 2026-10-08): the build that is deployed
 * now, so an open copy of older JavaScript can tell it is out of date
 * (`lib/app-version.ts`). Never cached, by the browser or Cloudflare.
 */
export function GET() {
  return NextResponse.json(
    { build_id: BUILD_ID },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  );
}
