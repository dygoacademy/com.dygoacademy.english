'use client';

import { useTranslations } from 'next-intl';

import { LOCALES, type AppLocale } from '@/i18n/config';

/**
 * UI-A · the language chip at the top right of every auth screen (globe,
 * language name, chevron). A native `<select>` sits invisibly on top, so
 * phones open their own picker. The caller stores the choice in the
 * `dygo_locale` cookie before sign-in (UI-L resolution order).
 */
export function LanguageChip({
  locale,
  onChange,
  disabled,
}: {
  locale: AppLocale;
  onChange: (locale: AppLocale) => void;
  disabled?: boolean;
}) {
  const t = useTranslations('components.language');

  return (
    <label className="relative flex h-[38px] items-center gap-1.5 rounded-[18px] border border-border bg-surface px-3 text-[13px] font-semibold text-text focus-within:border-forest">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#24463A" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12 H21" />
        <path d="M12 3 C15 6 15 18 12 21 C9 18 9 6 12 3" />
      </svg>
      <span aria-hidden="true">{t(`names.${locale}`)}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5E6A62" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 9 L12 15 L18 9" />
      </svg>
      <select
        aria-label={t('appLanguage')}
        value={locale}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as AppLocale)}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        {LOCALES.map((option) => (
          <option key={option} value={option}>
            {t(`names.${option}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
