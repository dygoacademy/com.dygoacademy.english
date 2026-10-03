import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { faqJsonLd } from '@/components/home/HomeFaq';
import { HomeLive } from '@/components/home/HomeLive';
import { getGardenLocaleContext } from '@/i18n/garden-locale';

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([
    getTranslations('screens.home.public'),
    getGardenLocaleContext(),
  ]);
  const title = t('metaTitle');
  // Home page v2 (HP-6): the description is the hero lead.
  const description = t('hero.lead');
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'Dygo Academy',
      locale: locale.appLocale.replace('-', '_'),
    },
  };
}

/**
 * `/` for signed-out visitors (Home page HP-1): the public home page,
 * canvas page "Home page" (`reference/H1-home-phone`, `H2-home-desktop`).
 * Signed in, middleware sends `/` to /garden before this renders.
 */
export default async function HomePage() {
  // HP-9: `FAQPage` structured data in the page language, from the same messages as the FAQ section.
  const t = await getTranslations('screens.home.public.faq');
  const jsonLd = JSON.stringify(faqJsonLd(t)).replace(/</g, '\\u003c');
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <HomeLive />
    </>
  );
}
