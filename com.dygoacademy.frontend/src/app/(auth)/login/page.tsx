import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { GardenRoot } from '@/app/(garden)/GardenRoot';
import { SignInLive } from '@/components/garden/auth/SignInLive';
import { getGardenLocaleContext } from '@/i18n/garden-locale';


export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('screens.auth.signIn');
  return { title: t('metaTitle') };
}

/**
 * /login. Classic users (no garden flag or cookie) get the classic form,
 * exactly as before. With the garden on (UI-A A-2) it's AU1 Sign in in
 * the garden look, in the language from `getGardenLocaleContext()`
 * (`dygo_locale` cookie → Accept-Language → English before sign-in).
 * `useSearchParams()` in both needs the Suspense boundary.
 */
export default async function LoginPage() {
  const locale = await getGardenLocaleContext();
  return (
    <GardenRoot
      appLocale={locale.appLocale}
      formatLocale={locale.formatLocale}
      timeZone={locale.timeZone}
      meaningLocale={locale.meaningLocale}
      stored={locale.stored}
    >
      <Suspense fallback={null}>
        <SignInLive />
      </Suspense>
    </GardenRoot>
  );
}
