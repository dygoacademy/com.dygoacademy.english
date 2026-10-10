'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { setGardenLocaleCookie } from '@/app/(garden)/actions';
import { useGardenPreferences } from '@/components/garden/preferences';
import { HOME_LOCALE_PATHS, ROUTES } from '@/constants/routes';
import type { AppLocale } from '@/i18n/config';

import { HomeScreen } from './HomeScreen';

/**
 * Home page HP-1 live: the public home page with the real links. The
 * language chip stores `dygo_locale` (like the auth screens' chip,
 * SignInLive) and opens that language's URL: `/`, `/vi` or `/zh`.
 */
export function HomeLive() {
  const router = useRouter();
  const { appLocale } = useGardenPreferences();
  const [pending, startRefresh] = React.useTransition();

  async function changeLanguage(locale: AppLocale) {
    await setGardenLocaleCookie(locale);
    // Each language has its own URL (SEO): go to it rather than re-render in place.
    startRefresh(() => router.push(HOME_LOCALE_PATHS[locale]));
  }

  return (
    <HomeScreen
      locale={appLocale}
      onLanguageChange={changeLanguage}
      languageBusy={pending}
      registerHref={ROUTES.register}
      loginHref={ROUTES.login}
      homeHref={HOME_LOCALE_PATHS[appLocale]}
      termsHref={ROUTES.terms}
      privacyHref={ROUTES.privacy}
    />
  );
}
