import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { GardenRoot } from '@/app/(garden)/GardenRoot';
import { RegisterLive } from '@/components/garden/auth/RegisterLive';
import { getGardenLocaleContext } from '@/i18n/garden-locale';


export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('screens.auth.register');
  return { title: t('metaTitle') };
}

/**
 * /register (UI-A A-3): AU2 Create account, or AU3 when `?next=` is an
 * invite link (`/join/<token>`), in
 * the language from `getGardenLocaleContext()`. `useSearchParams()` in
 * `RegisterLive` needs the Suspense boundary.
 */
export default async function RegisterPage() {
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
        <RegisterLive />
      </Suspense>
    </GardenRoot>
  );
}
