import { cookies } from 'next/headers';

import { GardenRoot } from '@/app/(garden)/GardenRoot';
import { getGardenLocaleContext } from '@/i18n/garden-locale';
import { GARDEN_UI_COOKIE, isGardenEnabled } from '@/lib/garden-ui';

/**
 * UI-A A-4. `/forgot-password` and `/reset-password` are new, garden-only
 * pages: they live outside `(auth)` so its classic navbar never wraps
 * them, and `(auth)`'s "signed in → home" redirect doesn't bounce the
 * reset link (it arrives signed in, with a recovery session). Without
 * the garden flag or cookie both answer 404, as they did before.
 */
export async function gardenAuthOn(): Promise<boolean> {
  const cookieStore = await cookies();
  return isGardenEnabled(cookieStore.get(GARDEN_UI_COOKIE)?.value);
}

/** The garden providers in the learner's language (`getGardenLocaleContext()`). */
export async function GardenAuthRoot({ children }: { children: React.ReactNode }) {
  const locale = await getGardenLocaleContext();
  return (
    <GardenRoot
      appLocale={locale.appLocale}
      formatLocale={locale.formatLocale}
      timeZone={locale.timeZone}
      meaningLocale={locale.meaningLocale}
      stored={locale.stored}
    >
      {children}
    </GardenRoot>
  );
}
