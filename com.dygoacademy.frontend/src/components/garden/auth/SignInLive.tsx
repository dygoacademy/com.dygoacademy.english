'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { setGardenLocaleCookie } from '@/app/(garden)/actions';
import { ROUTES } from '@/constants/routes';
import type { AppLocale } from '@/i18n/config';
import { createClient } from '@/lib/supabase/client';

import { useGardenPreferences } from '../preferences';
import { authHrefWithNext, AUTH_HREFS, safeNextPath } from './authPaths';
import { SignInScreen, type SignInError } from './SignInScreen';

/**
 * AU1 live: the same sign-in as the classic `/login` (Supabase
 * `signInWithPassword`, then the `?next=` path or home), in the garden
 * look. Supabase's own error text is never shown: a rejected sign-in
 * reads "email and password don't match" whichever was wrong, anything
 * else asks the learner to check their connection. The language chip
 * stores `dygo_locale` and re-renders the page in that language.
 */
export function SignInLive() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { appLocale } = useGardenPreferences();
  const [error, setError] = React.useState<SignInError | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [, startRefresh] = React.useTransition();

  async function changeLanguage(locale: AppLocale) {
    await setGardenLocaleCookie(locale);
    startRefresh(() => router.refresh());
  }

  async function signIn({ email, password }: { email: string; password: string }) {
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        const status = signInError.status ?? 0;
        setError(status >= 400 && status < 500 && status !== 429 ? 'mismatch' : 'network');
        setBusy(false);
        return;
      }
    } catch {
      setError('network');
      setBusy(false);
      return;
    }
    // Same as the classic page: back to where middleware bounced from, or home.
    router.push(safeNextPath(searchParams.get('next')) ?? ROUTES.home);
    router.refresh();
  }

  return (
    <SignInScreen
      locale={appLocale}
      onLanguageChange={changeLanguage}
      onSubmit={signIn}
      error={error}
      busy={busy}
      forgotHref={AUTH_HREFS.forgotPassword}
      registerHref={authHrefWithNext(AUTH_HREFS.register, safeNextPath(searchParams.get('next')))}
    />
  );
}
