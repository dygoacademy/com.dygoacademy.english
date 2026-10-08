import type { MetadataRoute } from 'next';

import { HOME_LOCALE_PATHS, homeAlternates, SITE_URL } from '@/constants/routes';
import { LOCALES } from '@/i18n/config';

const absolute = (path: string) => new URL(path, SITE_URL).toString();

/**
 * /sitemap.xml (SEO, 2026-10-07): the public home page in each language,
 * each listing the others as hreflang alternates. Everything else needs a
 * sign-in, so it isn't listed.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(
    Object.entries(homeAlternates()).map(([lang, path]) => [lang, absolute(path)]),
  );
  return LOCALES.map((locale) => ({
    url: absolute(HOME_LOCALE_PATHS[locale]),
    changeFrequency: 'weekly',
    priority: 1,
    alternates: { languages },
  }));
}
