import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { isReferenceName } from '@/components/garden/screens/fixtures';
import { DEFAULT_LOCALE, formattingLocale, isAppLocale } from '@/i18n/config';
import { loadMessages } from '@/i18n/messages';

import { GardenRoot } from '@/app/(garden)/GardenRoot';
import { ReferenceScreen } from './ReferenceScreen';

/**
 * /garden/_reference/<name>?locale=en|vi|zh-CN: one canvas screen with the
 * canvas sample data (screens/fixtures.ts), for `npm run garden:diff`.
 * Dev only; see the route group's layout for the gates. The tab bar sits
 * in the flow, as in the fixed-height canvas frame.
 *
 * UI-L: the language comes from `?locale=` (default English), not from the
 * learner; `-vi` references are diffed against `?locale=vi`. The canvas
 * sample data is dated in UTC, so the pages format in UTC.
 */
const REFERENCE_TIME_ZONE = 'UTC';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const { name } = await params;
  const t = await getTranslations('screens.reference');
  return { title: t('metaTitle', { name }), robots: { index: false, follow: false } };
}

export default async function GardenReferencePage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ locale?: string | string[] }>;
}) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { name } = await params;
  if (!isReferenceName(name)) notFound();
  const { locale: requested } = await searchParams;
  const locale = isAppLocale(requested) ? requested : DEFAULT_LOCALE;

  return (
    <GardenRoot
      appLocale={locale}
      formatLocale={formattingLocale(locale)}
      timeZone={REFERENCE_TIME_ZONE}
      messages={await loadMessages(locale)}
      meaningLocale={locale === 'en' ? null : locale}
    >
      <ReferenceScreen name={name} locale={locale} />
    </GardenRoot>
  );
}
