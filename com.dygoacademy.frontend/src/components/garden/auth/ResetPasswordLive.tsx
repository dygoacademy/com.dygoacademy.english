'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { setGardenLocaleCookie } from '@/app/(garden)/actions';
import { ROUTES } from '@/constants/routes';
import type { AppLocale } from '@/i18n/config';
import { createClient } from '@/lib/supabase/client';

import { useGardenPreferences } from '../preferences';
import { AUTH_HREFS } from './authPaths';
import {
  ResetPasswordScreen,
  type ResetPasswordError,
  type ResetPasswordStage,
} from './ResetPasswordScreen';

/**
 * AU4 live (`/reset-password`): the reset email's link lands here with a
 * `?code=`; the browser Supabase client exchanges it for a recovery
 * session while it starts up (`detectSessionInUrl`, PKCE: the verifier
 * cookie was set by `resetPasswordForEmail` on /forgot-password), so the
 * page waits for `getSession()`. With a session the learner sets a new
 * password with `updateUser({ password })` and goes home; without one
 * the link is old, used or broken and the page offers a new link.
 */
export function ResetPasswordLive() {
  const router = useRouter();
  const { appLocale } = useGardenPreferences();
  const [stage, setStage] = React.useState<ResetPasswordStage>('checking');
  const [error, setError] = React.useState<ResetPasswordError | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [, startRefresh] = React.useTransition();

  React.useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!cancelled && event === 'PASSWORD_RECOVERY' && session) setStage('ready');
    });
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!cancelled) setStage(data.session ? 'ready' : 'expired');
      })
      .catch(() => {
        if (!cancelled) setStage('expired');
      });
    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function changeLanguage(locale: AppLocale) {
    await setGardenLocaleCookie(locale);
    startRefresh(() => router.refresh());
  }

  async function save(password: string) {
    setError(null);
    setBusy(true);
    try {
      const { error: updateError } = await createClient().auth.updateUser({ password });
      if (updateError) {
        const status = updateError.status ?? 0;
        if (updateError.code === 'same_password') setError('samePassword');
        else if (status === 401 || status === 403) setStage('expired');
        else setError(status >= 400 && status < 500 ? 'failed' : 'network');
        setBusy(false);
        return;
      }
    } catch {
      setError('network');
      setBusy(false);
      return;
    }
    router.push(ROUTES.home);
    router.refresh();
  }

  return (
    <ResetPasswordScreen
      locale={appLocale}
      onLanguageChange={changeLanguage}
      onSubmit={save}
      stage={stage}
      error={error}
      busy={busy}
      backHref={AUTH_HREFS.login}
      forgotHref={AUTH_HREFS.forgotPassword}
    />
  );
}
