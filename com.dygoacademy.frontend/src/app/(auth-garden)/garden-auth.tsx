
import { GardenRoot } from '@/app/(garden)/GardenRoot';
import { getGardenLocaleContext } from '@/i18n/garden-locale';

/**
 * UI-A A-4. `/forgot-password` and `/reset-password` live outside `(auth)`
 * so its "signed in → home" redirect doesn't bounce the reset link (it
 * arrives signed in, with a recovery session).
 */
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
