'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { ROUTES } from '@/constants/routes';
import type { AppLocale } from '@/i18n/config';

import { AuthField } from './AuthField';
import { AuthSeed, AUTH_LINK_CLASSES, AUTH_SUBMIT_CLASSES, AuthError, AuthShell } from './AuthShell';
import { LanguageChip } from './LanguageChip';
import { TileSprout } from '../groupArt';

/** Why sign-up failed. `failed` never says whether the email is already taken. */
export type RegisterError = 'failed' | 'network' | 'confirmEmail';

/** The GR6 invite preview's banner fields (AU3). */
export interface RegisterInvite {
  inviterName: string;
  groupName: string;
}

export interface RegisterScreenProps {
  locale: AppLocale;
  onLanguageChange: (locale: AppLocale) => void;
  onSubmit: (values: { name: string; email: string; password: string }) => void;
  error?: RegisterError | null;
  busy?: boolean;
  backHref: string;
  signInHref: string;
  /**
   * AU3: the learner arrived from a group invite (`?next=/join/<token>`).
   * Changes the title, button and sign-in link; `invite` adds the
   * "Minh invited you to …" banner when the preview is known.
   */
  joining?: boolean;
  invite?: RegisterInvite | null;
  /** Sample value for the reference page; empty in the live app. */
  initialName?: string;
}

/**
 * AU2 · Create account (canvas `reference/AU2-create-account`) and AU3 ·
 * Create account from an invite (`reference/AU3-create-account-invite`).
 * Props only: `RegisterLive` signs up with Supabase, the reference page
 * passes the canvas sample data.
 */
export function RegisterScreen({
  locale,
  onLanguageChange,
  onSubmit,
  error,
  busy,
  backHref,
  signInHref,
  joining = false,
  invite,
  initialName = '',
}: RegisterScreenProps) {
  const t = useTranslations('screens.auth');
  const [name, setName] = React.useState(initialName);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const initial = invite?.inviterName.trim().charAt(0).toUpperCase() ?? '';
  const hero = joining ? (
    invite ? (
      <div className="flex shrink-0 items-center gap-3 rounded-[22px] bg-forest px-4 py-3.5 text-on-forest">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-light text-[15px] font-bold text-forest"
        >
          {initial}
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="text-[13px] text-stage-sprout">
            {t('register.invite.invitedBy', { name: invite.inviterName })}
          </span>
          <span className="text-[16px] font-bold">{invite.groupName}</span>
        </div>
      </div>
    ) : null
  ) : (
    <div
      aria-hidden="true"
      className="box-border flex h-[96px] shrink-0 items-end justify-center gap-2.5 overflow-hidden rounded-hero bg-forest pb-3"
    >
      <AuthSeed width={34} height={24} />
      <TileSprout width={40} height={40} />
      <AuthSeed width={34} height={24} />
    </div>
  );

  return (
    <AuthShell
      languageChip={<LanguageChip locale={locale} onChange={onLanguageChange} disabled={busy} />}
      back={{ href: backHref, label: t('back') }}
      hero={hero}
      titleSize="small"
      title={joining ? t('register.invite.title') : t('register.title')}
      subtitle={joining ? t('register.invite.subtitle') : t('register.subtitle')}
    >
      <form
        className="contents"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({ name: name.trim(), email, password });
        }}
      >
        {error ? <AuthError>{t(`register.errors.${error}`)}</AuthError> : null}
        <AuthField
          label={t('register.name')}
          type="text"
          name="name"
          autoComplete="name"
          value={name}
          onChange={setName}
        />
        <AuthField
          label={t('email')}
          type="email"
          name="email"
          autoComplete="email"
          placeholder={t('register.emailPlaceholder')}
          value={email}
          onChange={setEmail}
        />
        <AuthField
          label={t('password')}
          type="password"
          name="password"
          autoComplete="new-password"
          minLength={6}
          placeholder={t('register.passwordPlaceholder')}
          value={password}
          onChange={setPassword}
        />
        <button type="submit" disabled={busy} className={AUTH_SUBMIT_CLASSES}>
          {busy
            ? t('register.submitting')
            : joining
              ? t('register.invite.submit')
              : t('register.submit')}
        </button>
      </form>
      {/* Terms and Privacy link to the legal pages (canvas page "Legal", 2026-10-09). */}
      <p className="text-center text-[12px] leading-[1.4] text-muted-foreground">
        {t.rich('register.terms', {
          terms: (chunks) => (
            <Link href={ROUTES.terms} className="underline">
              {chunks}
            </Link>
          ),
          privacy: (chunks) => (
            <Link href={ROUTES.privacy} className="underline">
              {chunks}
            </Link>
          ),
        })}
      </p>
      <p className="text-center text-[14px] text-muted-foreground">
        {t.rich(joining ? 'register.invite.haveAccount' : 'register.haveAccount', {
          link: (chunks) => (
            <Link href={signInHref} className={`font-bold ${AUTH_LINK_CLASSES}`}>
              {chunks}
            </Link>
          ),
        })}
      </p>
    </AuthShell>
  );
}
