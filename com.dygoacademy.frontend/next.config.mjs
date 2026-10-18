import createNextIntlPlugin from 'next-intl/plugin';

// PWA updates (2026-10-08): one id per build, used as Next's build id and
// baked into the client as NEXT_PUBLIC_BUILD_ID, so an open copy of older
// JavaScript can compare itself with GET /api/version (src/lib/app-version.ts).
const buildId =
  process.env.DYGO_BUILD_ID || new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  generateBuildId: async () => buildId,
  env: {
    NEXT_PUBLIC_BUILD_ID: buildId,
  },
  // NEXT_PUBLIC_API_URL points at the NestJS API (default
  // http://localhost:3001/api/v1) — see src/lib/api-client.ts.
};

// next-intl (Word Garden rebuild, UI-1): points the library at
// src/i18n/request.ts. Only the (garden) screens call it today.
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
