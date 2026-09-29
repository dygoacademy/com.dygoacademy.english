import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';
import { Suspense } from 'react';

import { GardenRoot } from '@/app/(garden)/GardenRoot';
import { RegisterLive } from '@/components/garden/auth/RegisterLive';
import { getGardenLocaleContext } from '@/i18n/garden-locale';
import { GARDEN_UI_COOKIE, isGardenEnabled } from '@/lib/garden-ui';

import { ClassicRegister } from './ClassicRegister';

async function gardenOn(): Promise<boolean> {
  const cookieStore = await cookies();
  return isGardenEnabled(cookieStore.get(GARDEN_UI_COOKIE)?.value);
}

export async function generateMetadata(): Promise<Metadata> {
  if (!(await gardenOn())) return {};
  const t = await getTranslations('screens.auth.register');
  return { title: t('metaTitle') };
}

/**
 * /register. Classic users (no garden flag or cookie) get the classic
 * form, exactly as before. With the garden on (UI-A A-3) it's AU2 Create
 * account, or AU3 when `?next=` is an invite link (`/join/<token>`), in
 * the language from `getGardenLocaleContext()`. `useSearchParams()` in
 * `RegisterLive` needs the Suspense boundary.
 */
export default async function RegisterPage() {
  if (!(await gardenOn())) return <ClassicRegister />;

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
