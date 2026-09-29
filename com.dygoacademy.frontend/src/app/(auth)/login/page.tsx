import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';
import { Suspense } from 'react';

import { GardenRoot } from '@/app/(garden)/GardenRoot';
import { SignInLive } from '@/components/garden/auth/SignInLive';
import { getGardenLocaleContext } from '@/i18n/garden-locale';
import { GARDEN_UI_COOKIE, isGardenEnabled } from '@/lib/garden-ui';

import { ClassicLogin } from './ClassicLogin';

async function gardenOn(): Promise<boolean> {
  const cookieStore = await cookies();
  return isGardenEnabled(cookieStore.get(GARDEN_UI_COOKIE)?.value);
}

export async function generateMetadata(): Promise<Metadata> {
  if (!(await gardenOn())) return {};
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
  if (!(await gardenOn())) return <ClassicLogin />;

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
