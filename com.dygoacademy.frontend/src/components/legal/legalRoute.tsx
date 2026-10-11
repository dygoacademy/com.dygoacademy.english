import type { Metadata } from 'next';
import { headers } from 'next/headers';

import { HOME_LOCALE_PATHS, ROUTES, SITE_URL } from '@/constants/routes';
import { legalContent, legalRegionFor, type LegalKind } from '@/content/legal';
import { getGardenLocaleContext } from '@/i18n/garden-locale';

import { LegalPage } from './LegalPage';

const PATHS: Record<LegalKind, string> = { terms: ROUTES.terms, privacy: ROUTES.privacy };

/**
 * `/terms` and `/privacy` (canvas page "Legal", 2026-10-09): public, in the
 * visitor's language (profile → `dygo_locale` cookie → Accept-Language →
 * English, like the auth screens).
 */
export async function legalMetadata(kind: LegalKind): Promise<Metadata> {
  const { appLocale } = await getGardenLocaleContext();
  const doc = legalContent(appLocale)[kind];
  return {
    metadataBase: new URL(SITE_URL),
    title: `${doc.title} | Dygo Academy`,
    description: doc.description,
    alternates: { canonical: PATHS[kind] },
    openGraph: { title: doc.title, description: doc.description, url: PATHS[kind], type: 'article', siteName: 'Dygo Academy' },
  };
}

export async function LegalRoute({ kind }: { kind: LegalKind }) {
  const { appLocale } = await getGardenLocaleContext();
  const content = legalContent(appLocale);
  const other: LegalKind = kind === 'terms' ? 'privacy' : 'terms';
  const label = (k: LegalKind) => (k === 'terms' ? content.ui.termsLabel : content.ui.privacyLabel);
  const country = (await headers()).get('cf-ipcountry');
  return (
    <LegalPage
      doc={content[kind]}
      ui={content.ui}
      initialRegion={legalRegionFor(country)}
      selfLabel={label(kind)}
      selfHref={PATHS[kind]}
      otherLabel={label(other)}
      otherHref={PATHS[other]}
      homeHref={HOME_LOCALE_PATHS[appLocale]}
    />
  );
}
