import type { MetadataRoute } from 'next';

import { PROTECTED_PATH_PREFIXES, ROUTES, SITE_URL } from '@/constants/routes';

/**
 * /robots.txt (SEO, 2026-10-07): crawl the public pages, skip the signed-in
 * screens (they only redirect to sign-in) and the API.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', ...PROTECTED_PATH_PREFIXES.filter((path) => path !== ROUTES.home)],
    },
    sitemap: new URL('/sitemap.xml', SITE_URL).toString(),
  };
}
