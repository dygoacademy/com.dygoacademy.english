'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { EnglishVariety } from '@/hooks/useProfile';
import { LOCALES, type AppLocale } from '@/i18n/config';

import { Button } from '../Button';
import { gcn } from '../cn';
import { BackIcon } from '../icons';
import { IconButton } from '../IconButton';
import { SCREEN_CLASSES } from './GardenTabBar';

/**
 * A8f · Language & accent (canvas `reference/A8f-language*`, approved
 * 2026-11-14). Opened from A8's "Language & accent" row.
 *
 * App language: each language named in itself (the same on every locale),
 * then the English accent: US or UK (spelling, IPA and audio follow it).
 * "Save" saves both and goes back to Me.
 *
 * Props only (`live/LanguageLive` saves `ui_locale` + the cookie, and
 * `english_variety`).
 */

/** Each app language in its own language, as on the board. */
export const APP_LANGUAGE_NAMES: Record<AppLocale, { name: string; lang: string }> = {
  'en-US': { name: 'English', lang: 'en' },
  'vi-VN': { name: 'Tiếng Việt', lang: 'vi' },
  'zh-CN': { name: '中文（简体）', lang: 'zh-Hans' },
};

const ACCENTS: readonly { code: EnglishVariety; key: 'us' | 'uk' }[] = [
  { code: 'en-US', key: 'us' },
  { code: 'en-GB', key: 'uk' },
];

export interface LanguageScreenProps {
  backHref: string;
  appLocale: AppLocale;
  variety: EnglishVariety;
  onAppLocale: (locale: AppLocale) => void;
  onVariety: (variety: EnglishVariety) => void;
  onSave: () => void;
  saving?: boolean;
  error?: boolean;
  framed?: boolean;
}

export function LanguageScreen({
  backHref,
  appLocale,
  variety,
  onAppLocale,
  onVariety,
  onSave,
  saving = false,
  error = false,
  framed = false,
}: LanguageScreenProps) {
  const t = useTranslations('screens.language');

  return (
    <div
      className={gcn(
        SCREEN_CLASSES,
        'relative gap-3 px-5 pb-6 pt-[22px]',
        framed && 'h-[844px] min-h-0 overflow-hidden',
      )}
    >
      <header className="flex items-center gap-3">
        <IconButton asChild aria-label={t('back')}>
          <Link href={backHref}>
            <BackIcon width={20} height={20} />
          </Link>
        </IconButton>
        <h1 className="flex-grow font-display text-[24px] font-semibold leading-[1.15]">
          {t('title')}
        </h1>
      </header>
      <p className="m-0 text-[15px] leading-[1.4] text-muted-foreground">{t('intro')}</p>

      <Group label={t('app.label')} hint={t('app.hint')}>
        {LOCALES.map((code) => (
          <Choice
            key={code}
            picked={code === appLocale}
            disabled={saving}
            onPick={() => onAppLocale(code)}
            lang={APP_LANGUAGE_NAMES[code].lang}
          >
            {APP_LANGUAGE_NAMES[code].name}
          </Choice>
        ))}
      </Group>

      <Group label={t('accent.label')} hint={t('accent.hint')}>
        {ACCENTS.map(({ code, key }) => (
          <Choice
            key={code}
            picked={code === variety}
            disabled={saving}
            onPick={() => onVariety(code)}
          >
            {t(`accent.${key}`)}
          </Choice>
        ))}
      </Group>

      <div className="mt-auto flex flex-col gap-2">
        <div role="status" aria-live="polite">
          {error ? (
            <p className="m-0 text-center text-[13px] text-primary-text">{t('error')}</p>
          ) : null}
        </div>
        <Button
          type="button"
          onClick={onSave}
          loading={saving}
          className="h-14 w-full max-w-none px-4 text-[16px] md:max-w-none"
        >
          {t('save')}
        </Button>
      </div>
    </div>
  );
}

/** A labelled radio group: 12px uppercase heading, the card, a 12px hint. */
function Group({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  const id = React.useId();
  return (
    <div className="flex flex-col gap-1.5">
      <span
        id={id}
        className="px-1 text-[12px] font-bold uppercase tracking-[.08em] text-muted-foreground"
      >
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={id}
        className="flex flex-col rounded-[20px] border border-border bg-surface px-4 [&>button+button]:border-t [&>button+button]:border-divider"
      >
        {children}
      </div>
      <span className="px-1 text-[12px] leading-[1.4] text-muted-foreground">{hint}</span>
    </div>
  );
}

function Choice({
  picked,
  disabled,
  onPick,
  lang,
  children,
}: {
  picked: boolean;
  disabled: boolean;
  onPick: () => void;
  lang?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={picked}
      disabled={disabled}
      onClick={onPick}
      lang={lang}
      className="flex min-h-[54px] items-center gap-3 bg-transparent text-left text-text"
    >
      <span className="flex-grow text-[16px] font-bold">{children}</span>
      <span
        aria-hidden="true"
        className={gcn(
          'h-[22px] w-[22px] shrink-0 rounded-[11px] border-2 border-forest shadow-[inset_0_0_0_3px_#fff]',
          picked ? 'bg-forest' : 'bg-surface',
        )}
      />
    </button>
  );
}
