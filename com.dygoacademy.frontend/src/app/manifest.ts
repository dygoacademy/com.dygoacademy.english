import type { MetadataRoute } from 'next';

import { GARDEN_ROUTES } from '@/constants/garden';

/**
 * PWA (2026-10-13): /manifest.webmanifest, so the app can be installed to
 * the home screen and opens full screen. Next links it from every page.
 *
 * It opens on the garden home (signed out, middleware sends it to /login
 * and back). The scope is the whole site so sign-in, onboarding and the
 * 1-tap reminder links all stay inside the installed app. Icons are the
 * brand set (docs/design/brand/favicon); `public/sw.js` uses icon-192 and
 * badge-96 (notification-badge.svg) for notifications and serves `/offline.html` when a page can't load.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: GARDEN_ROUTES.home,
    name: 'Dygo Academy',
    short_name: 'Dygo',
    description:
      'Learn English vocabulary with clear meanings, IPA, audio and real examples in your language.',
    start_url: GARDEN_ROUTES.home,
    scope: '/',
    display: 'standalone',
    background_color: '#F4F1EA',
    theme_color: '#24463A',
    categories: ['education'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
