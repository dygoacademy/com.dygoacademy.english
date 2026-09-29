'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { setGardenLocaleCookie } from '@/app/(garden)/actions';
import type { AppLocale } from '@/i18n/config';
import { createClient } from '@/lib/supabase/client';

import { useGardenPreferences } from '../preferences';
import { AUTH_HREFS } from './authPaths';
import { ForgotPasswordScreen, type ForgotPasswordError } from './ForgotPasswordScreen';

/**
 * AU4 live (`/forgot-password`): Supabase `resetPasswordForEmail` with a
 * redirect to `/reset-password`, where the learner sets the new password.
 * Supabase answers the same whether or not the address has an account,
 * so the page always moves on to "Check your inbox"; only a rate limit
 * (429) or a failed request shows an error. `/reset-password` must be in
 * the Supabase project's Redirect URLs for the link to land there.
 */
export function ForgotPasswordLive() {
  const router = useRouter();
  const { appLocale } = useGardenPreferences();
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const [error, setError] = React.useState<ForgotPasswordError | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [, startRefresh] = React.useTransition();

  async function changeLanguage(locale: AppLocale) {
    await setGardenLocaleCookie(locale);
    startRefresh(() => router.refresh());
  }

  async function send(email: string) {
    if (!email) return;
    setError(null);
    setBusy(true);
    try {
      const { error: sendError } = await createClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${AUTH_HREFS.resetPassword}`,
      });
      if (sendError) {
        setError(sendError.status === 429 ? 'rateLimited' : 'network');
      } else {
        setSentTo(email);
      }
    } catch {
      setError('network');
    }
    setBusy(false);
  }

  return (
    <ForgotPasswordScreen
      locale={appLocale}
      onLanguageChange={changeLanguage}
      onSubmit={send}
      onResend={() => {
        if (sentTo) void send(sentTo);
      }}
      sentTo={sentTo}
      error={error}
      busy={busy}
      backHref={AUTH_HREFS.login}
      signInHref={AUTH_HREFS.login}
    />
  );
}
