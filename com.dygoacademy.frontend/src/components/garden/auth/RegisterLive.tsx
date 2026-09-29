'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { setGardenLocaleCookie } from '@/app/(garden)/actions';
import { ROUTES } from '@/constants/routes';
import type { AppLocale } from '@/i18n/config';
import { apiClient } from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';

import { useGardenPreferences } from '../preferences';
import { authHrefWithNext, AUTH_HREFS, inviteTokenFromNext, safeNextPath } from './authPaths';
import { RegisterScreen, type RegisterError } from './RegisterScreen';

/**
 * AU2 / AU3 live: the same sign-up as the classic `/register` (Supabase
 * `signUp`), in the garden look, plus what UI-A adds:
 * - "Your name" goes to `profiles.display_name` (the column exists; the
 *   sign-up trigger doesn't read it, so it's written right after, under
 *   `profiles_update_self`). Also kept in the auth user's metadata.
 * - The language on the chip is saved to `profiles.ui_locale`
 *   (`PATCH /profiles/me`, like the language sheet).
 * - `?next=` is followed after sign-up (same-site paths only), so an
 *   invite link (`/register?next=/join/<token>`) lands on the join page.
 *   With an invite `next` the page reads as AU3.
 * Both profile writes are best effort: a failure never blocks the
 * redirect (the Me screen can fix either later).
 *
 * AU3's "Minh invited you to …" banner is not shown live yet: the GR6
 * preview (`GET /invites/:token/preview`, `group_invite_preview()`) only
 * answers signed-in callers, and this page is signed out. See the
 * 2026-09-29 UI-A report entry.
 */
export function RegisterLive() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { appLocale } = useGardenPreferences();
  const [error, setError] = React.useState<RegisterError | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [, startRefresh] = React.useTransition();

  const next = safeNextPath(searchParams.get('next'));
  const joining = inviteTokenFromNext(next) !== null;

  async function changeLanguage(locale: AppLocale) {
    await setGardenLocaleCookie(locale);
    startRefresh(() => router.refresh());
  }

  async function register({ name, email, password }: { name: string; email: string; password: string }) {
    setError(null);
    setBusy(true);
    const supabase = createClient();
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: name ? { data: { display_name: name } } : undefined,
      });
      if (signUpError) {
        const status = signUpError.status ?? 0;
        setError(status >= 400 && status < 500 && status !== 429 ? 'failed' : 'network');
        setBusy(false);
        return;
      }
      if (!data.session || !data.user) {
        // Only when email confirmation is on (not the local default), as on the classic page.
        setError('confirmEmail');
        setBusy(false);
        return;
      }
      const userId = data.user.id;
      await Promise.allSettled([
        name
          ? supabase.from('profiles').update({ display_name: name }).eq('id', userId)
          : Promise.resolve(),
        apiClient.patch('/profiles/me', { uiLocale: appLocale }),
      ]);
    } catch {
      setError('network');
      setBusy(false);
      return;
    }
    router.push(next ?? ROUTES.home);
    router.refresh();
  }

  return (
    <RegisterScreen
      locale={appLocale}
      onLanguageChange={changeLanguage}
      onSubmit={register}
      error={error}
      busy={busy}
      backHref={authHrefWithNext(AUTH_HREFS.login, next)}
      signInHref={authHrefWithNext(AUTH_HREFS.login, next)}
      joining={joining}
      invite={null}
    />
  );
}
