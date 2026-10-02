'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { setGardenLocaleCookie } from '@/app/(garden)/actions';
import { useGardenPreferences } from '@/components/garden/preferences';
import { ROUTES } from '@/constants/routes';
import type { AppLocale } from '@/i18n/config';

import { HomeScreen } from './HomeScreen';

/**
 * Home page HP-1 live: the public home page with the real links. The
 * language chip stores `dygo_locale` and re-renders the page in that
 * language, exactly like the auth screens' chip (SignInLive).
 */
export function HomeLive() {
  const router = useRouter();
  const { appLocale } = useGardenPreferences();
  const [pending, startRefresh] = React.useTransition();

  async function changeLanguage(locale: AppLocale) {
    await setGardenLocaleCookie(locale);
    startRefresh(() => router.refresh());
  }

  return (
    <HomeScreen
      locale={appLocale}
      onLanguageChange={changeLanguage}
      languageBusy={pending}
      registerHref={ROUTES.register}
      loginHref={ROUTES.login}
      homeHref={ROUTES.home}
    />
  );
}
