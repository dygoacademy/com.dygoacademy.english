import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { isReferenceName } from '@/components/garden/screens/fixtures';
import { DEFAULT_LOCALE, formattingLocale, isMeaningLocale, normalizeLocale } from '@/i18n/config';
import { loadMessages } from '@/i18n/messages';
import { referencePagesAllowed } from '@/lib/garden-reference';

import { GardenRoot } from '@/app/(garden)/GardenRoot';
import { ReferenceScreen } from './ReferenceScreen';

/**
 * /garden/_reference/<name>?locale=en-US|vi-VN|zh-CN: one canvas screen with the
 * canvas sample data (screens/fixtures.ts), for `npm run garden:diff`.
 * Dev only; see the route group's layout for the gates. The tab bar sits
 * in the flow, as in the fixed-height canvas frame.
 *
 * UI-L: the language comes from `?locale=` (default English), not from the
 * learner; `-vi` references are diffed against `?locale=vi-VN` (the old
 * short codes `en` / `vi` still work). The canvas
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
  if (!referencePagesAllowed()) notFound();
  const { name } = await params;
  if (!isReferenceName(name)) notFound();
  const { locale: requested } = await searchParams;
  const locale = normalizeLocale(Array.isArray(requested) ? requested[0] : requested) ?? DEFAULT_LOCALE;

  return (
    <GardenRoot
      appLocale={locale}
      formatLocale={formattingLocale(locale)}
      timeZone={REFERENCE_TIME_ZONE}
      messages={await loadMessages(locale)}
      meaningLocale={isMeaningLocale(locale) ? locale : null}
    >
      <ReferenceScreen name={name} locale={locale} />
    </GardenRoot>
  );
}
