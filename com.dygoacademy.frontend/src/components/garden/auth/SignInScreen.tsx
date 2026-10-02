'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { AppLocale } from '@/i18n/config';

import { AuthField } from './AuthField';
import { AUTH_LINK_CLASSES, AUTH_SUBMIT_CLASSES, AuthError, AuthShell } from './AuthShell';
import { LanguageChip } from './LanguageChip';

/** Why sign-in failed. The copy never says whether the email or the password was wrong. */
export type SignInError = 'mismatch' | 'network';

export interface SignInScreenProps {
  locale: AppLocale;
  onLanguageChange: (locale: AppLocale) => void;
  onSubmit: (values: { email: string; password: string }) => void;
  error?: SignInError | null;
  busy?: boolean;
  forgotHref: string;
  registerHref: string;
  /** Sample values for the reference page; empty in the live app. */
  initialEmail?: string;
  initialPassword?: string;
}

/**
 * AU1 · Sign in (canvas `reference/AU1-sign-in`, `AU1-sign-in-error`).
 * Props only: the live page (`SignInLive`) signs in with Supabase, the
 * reference page passes the canvas sample data.
 */
export function SignInScreen({
  locale,
  onLanguageChange,
  onSubmit,
  error,
  busy,
  forgotHref,
  registerHref,
  initialEmail = '',
  initialPassword = '',
}: SignInScreenProps) {
  const t = useTranslations('screens.auth');
  const [email, setEmail] = React.useState(initialEmail);
  const [password, setPassword] = React.useState(initialPassword);

  return (
    <AuthShell
      languageChip={<LanguageChip locale={locale} onChange={onLanguageChange} disabled={busy} />}
      title={t('signIn.title')}
      subtitle={t('signIn.subtitle')}
    >
      <form
        className="contents"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({ email, password });
        }}
      >
        {error ? <AuthError>{t(`signIn.errors.${error}`)}</AuthError> : null}
        <AuthField
          label={t('email')}
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
        />
        <AuthField
          label={t('password')}
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
        />
        <Link
          href={forgotHref}
          className={`-mt-1.5 self-end text-[14px] font-semibold ${AUTH_LINK_CLASSES}`}
        >
          {t('signIn.forgot')}
        </Link>
        <button type="submit" disabled={busy} className={AUTH_SUBMIT_CLASSES}>
          {busy ? t('signIn.submitting') : t('signIn.submit')}
        </button>
      </form>
      <p className="text-center text-[14px] text-muted-foreground">
        {t.rich('signIn.newHere', {
          link: (chunks) => (
            <Link href={registerHref} className={`font-bold ${AUTH_LINK_CLASSES}`}>
              {chunks}
            </Link>
          ),
        })}
      </p>
    </AuthShell>
  );
}
