'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { AppLocale } from '@/i18n/config';

import { AuthField } from './AuthField';
import { AUTH_BUTTON_CLASSES, AuthError, AuthShell } from './AuthShell';
import { LanguageChip } from './LanguageChip';

/**
 * Where the set-new-password page is:
 * - `checking`: Supabase is still reading the link's code.
 * - `ready`: the link was good; choose a password.
 * - `expired`: no recovery session (old, used or broken link).
 */
export type ResetPasswordStage = 'checking' | 'ready' | 'expired';

/** Why saving failed. `samePassword` is Supabase's own 422 for reusing the old one. */
export type ResetPasswordError = 'samePassword' | 'failed' | 'network';

export interface ResetPasswordScreenProps {
  locale: AppLocale;
  onLanguageChange: (locale: AppLocale) => void;
  onSubmit: (password: string) => void;
  stage: ResetPasswordStage;
  error?: ResetPasswordError | null;
  busy?: boolean;
  backHref: string;
  /** "Send a new link" when the link has expired (`/forgot-password`). */
  forgotHref: string;
}

/**
 * AU4 · set a new password (`/reset-password`, where the email link
 * lands). The canvas has no frame for it; the plan asks for "the same
 * style", so it is AU4's layout: Back, language chip, 28px title, one
 * password field (Show/Hide, `new-password`, min 6) and the button.
 */
export function ResetPasswordScreen({
  locale,
  onLanguageChange,
  onSubmit,
  stage,
  error,
  busy,
  backHref,
  forgotHref,
}: ResetPasswordScreenProps) {
  const t = useTranslations('screens.auth');
  const [password, setPassword] = React.useState('');
  const expired = stage === 'expired';

  return (
    <AuthShell
      languageChip={<LanguageChip locale={locale} onChange={onLanguageChange} disabled={busy} />}
      back={{ href: backHref, label: t('back') }}
      hero={null}
      titleSize="small"
      titleGap
      title={expired ? t('reset.expired.title') : t('reset.title')}
      subtitle={expired ? t('reset.expired.subtitle') : t('reset.subtitle')}
    >
      {expired ? (
        <Link href={forgotHref} className={AUTH_BUTTON_CLASSES}>
          {t('reset.expired.newLink')}
        </Link>
      ) : (
        <form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(password);
          }}
        >
          {error ? <AuthError>{t(`reset.errors.${error}`)}</AuthError> : null}
          <AuthField
            label={t('reset.newPassword')}
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={6}
            placeholder={t('register.passwordPlaceholder')}
            value={password}
            onChange={setPassword}
          />
          <button
            type="submit"
            disabled={busy || stage === 'checking'}
            className={AUTH_BUTTON_CLASSES}
          >
            {busy ? t('reset.submitting') : t('reset.submit')}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
