import { NextResponse } from 'next/server';

/**
 * Next.js Route Handler placeholder (tech spec §2: app/api/). Route
 * Handlers are for things that must run on the frontend's own origin —
 * webhook receivers, edge-cached responses. Everything else calls the
 * NestJS API directly via src/lib/api-client.ts; don't proxy it through
 * here by default.
 */
export function GET() {
  return NextResponse.json({ status: 'ok' });
}
