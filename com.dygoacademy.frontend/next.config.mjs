import createNextIntlPlugin from 'next-intl/plugin';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Inlined at build time (pm2's `next start` doesn't load env-profiles):
  // "on" serves the garden:diff reference pages in a production build.
  // See src/lib/garden-reference.ts. Off unless set.
  env: { GARDEN_REFERENCE_PAGES: process.env.GARDEN_REFERENCE_PAGES ?? '' },
  // NEXT_PUBLIC_API_URL points at the NestJS API (default
  // http://localhost:3001/api/v1) — see src/lib/api-client.ts.
};

// next-intl (Word Garden rebuild, UI-1): points the library at
// src/i18n/request.ts. Only the (garden) screens call it today.
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
