'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { AppLocale } from '@/i18n/config';

import { WaterIcon } from '../icons';
import { AuthField } from './AuthField';
import { AUTH_BUTTON_CLASSES, AuthError, AuthShell } from './AuthShell';
import { LanguageChip } from './LanguageChip';

/**
 * Why the reset email couldn't be sent. Never "no account with that
 * email": Supabase answers the same either way, and so does this copy.
 */
export type ForgotPasswordError = 'rateLimited' | 'network';

export interface ForgotPasswordScreenProps {
  locale: AppLocale;
  onLanguageChange: (locale: AppLocale) => void;
  onSubmit: (email: string) => void;
  /** "Didn't get it? Send again" on the sent card (sends to `sentTo`). */
  onResend: () => void;
  /** The address the link went to: shows the "Check your inbox" card. */
  sentTo?: string | null;
  error?: ForgotPasswordError | null;
  busy?: boolean;
  backHref: string;
  signInHref: string;
  /** Sample value for the reference page; empty in the live app. */
  initialEmail?: string;
}

/**
 * AU4 · Reset password (canvas `reference/AU4-reset-password`) and its
 * sent state (`AU4-reset-password-sent`). Props only: `ForgotPasswordLive`
 * calls Supabase `resetPasswordForEmail`, the reference page passes the
 * canvas sample data.
 */
export function ForgotPasswordScreen({
  locale,
  onLanguageChange,
  onSubmit,
  onResend,
  sentTo,
  error,
  busy,
  backHref,
  signInHref,
  initialEmail = '',
}: ForgotPasswordScreenProps) {
  const t = useTranslations('screens.auth');
  const [email, setEmail] = React.useState(initialEmail);

  return (
    <AuthShell
      languageChip={<LanguageChip locale={locale} onChange={onLanguageChange} disabled={busy} />}
      back={{ href: backHref, label: t('back') }}
      hero={null}
      titleSize="small"
      titleGap
      title={t('forgot.title')}
      subtitle={t('forgot.subtitle')}
    >
      {error ? <AuthError>{t(`forgot.errors.${error}`)}</AuthError> : null}
      {sentTo ? (
        <>
          <div
            role="status"
            className="flex flex-col items-center gap-2.5 rounded-[22px] border border-garden-border bg-garden-surface px-4 py-[18px] text-center"
          >
            <WaterIcon width={56} height={56} fill="var(--stage-due)" />
            <span className="text-[17px] font-bold">{t('forgot.sent.title')}</span>
            <span className="text-[14px] leading-[1.4] text-garden-muted">
              {t('forgot.sent.body', { email: sentTo })}
            </span>
          </div>
          <Link href={signInHref} className={AUTH_BUTTON_CLASSES}>
            {t('forgot.sent.backToSignIn')}
          </Link>
          <button
            type="button"
            onClick={onResend}
            disabled={busy}
            className="border-0 bg-transparent p-0 text-[14px] font-bold leading-[normal] text-garden-forest disabled:opacity-60"
          >
            {busy ? t('forgot.submitting') : t('forgot.sent.resend')}
          </button>
        </>
      ) : (
        <form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(email.trim());
          }}
        >
          <AuthField
            label={t('email')}
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
          />
          <button type="submit" disabled={busy} className={AUTH_BUTTON_CLASSES}>
            {busy ? t('forgot.submitting') : t('forgot.submit')}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
