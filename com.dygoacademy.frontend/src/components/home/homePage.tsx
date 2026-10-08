import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { HOME_LOCALE_PATHS, homeAlternates, SITE_URL } from '@/constants/routes';
import { LOCALES, type AppLocale } from '@/i18n/config';

import { faqJsonLd } from './HomeFaq';
import { HomeLive } from './HomeLive';

/**
 * Metadata for the home page in `locale` (SEO, 2026-10-07): title and
 * description in that language, the page as its own canonical, and every
 * language version as an hreflang alternate. Middleware has already set
 * the request language from the URL, so `getTranslations` reads `locale`.
 */
export async function homeMetadata(locale: AppLocale): Promise<Metadata> {
  const t = await getTranslations('screens.home.public');
  const title = t('metaTitle');
  // Home page v2 (HP-6): the description is the hero lead.
  const description = t('hero.lead');
  const path = HOME_LOCALE_PATHS[locale];
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: { canonical: path, languages: homeAlternates() },
    openGraph: {
      title,
      description,
      url: path,
      type: 'website',
      siteName: 'Dygo Academy',
      locale: locale.replace('-', '_'),
      alternateLocale: LOCALES.filter((other) => other !== locale).map((other) => other.replace('-', '_')),
    },
  };
}

/** The home page body: `FAQPage` structured data in the page language, then the page. */
export async function HomePageBody() {
  // HP-9: from the same messages as the FAQ section.
  const t = await getTranslations('screens.home.public.faq');
  const jsonLd = JSON.stringify(faqJsonLd(t)).replace(/</g, '\\u003c');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <HomeLive />
    </>
  );
}
