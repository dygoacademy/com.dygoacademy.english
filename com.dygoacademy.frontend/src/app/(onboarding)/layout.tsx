import { redirect } from 'next/navigation';

import { GardenRoot } from '@/app/(garden)/GardenRoot';
import { GARDEN_ROUTES } from '@/constants/garden';
import { ROUTES } from '@/constants/routes';
import { getGardenLocaleContext, getGardenUser, needsOnboarding } from '@/i18n/garden-locale';

// Same garden viewport (viewport-fit=cover, iOS focus-zoom fix) as the garden screens.
export { generateViewport } from '@/app/(garden)/layout';

/**
 * Onboarding OB1, OB4, OB5 (/welcome/…): garden look, no tab bar. Signed in only
 * (middleware.ts bounces signed-out visitors; re-checked here). A learner
 * who has already finished (or any existing learner, backfilled by
 * 20261008_onboarding.sql) is sent to the garden: onboarding is never
 * forced on, or repeated by, someone who has done it.
 */
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getGardenUser();
  if (!user) {
    redirect(ROUTES.login);
  }
  if (!(await needsOnboarding())) {
    redirect(GARDEN_ROUTES.home);
  }

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
