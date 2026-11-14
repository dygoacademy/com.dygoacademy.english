'use client';

import type * as React from 'react';
import { useTranslations } from 'next-intl';

import { BottomSheet } from './BottomSheet';
import { gcn } from './cn';
import { ChevronRightIcon, SignOutIcon, TranslateIcon } from './icons';

/**
 * The Account sheet (SO-1, canvas `reference/A8-me-account`), opened
 * from the A8 gear: who's signed in (avatar, name, email), an outlined
 * terracotta Sign out and a Cancel. Props only; the caller signs out
 * (`live/AccountSheetLive`). While `signingOut`, both buttons are
 * disabled and Sign out reads "Signing out…".
 */
export interface AccountSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  email: string;
  onSignOut: () => void;
  signingOut?: boolean;
  /**
   * Shown under Cancel, inside the dialog (e.g. the sign-out error
   * Toast): content outside a modal sheet is hidden from VoiceOver.
   */
  notice?: React.ReactNode;
  /**
   * A8d moved "Meanings in" to its own screen, so the app language and
   * US/UK English open from here (a row under the account card).
   */
  onLanguageClick?: () => void;
}

export function AccountSheet({
  open,
  onOpenChange,
  name,
  email,
  onSignOut,
  signingOut = false,
  notice,
  onLanguageClick,
}: AccountSheetProps) {
  const t = useTranslations('components.account');

  return (
    <BottomSheet
      open={open}
      onOpenChange={(next) => {
        // Don't let a tap outside or Escape drop the sheet mid sign-out.
        if (!next && signingOut) return;
        onOpenChange(next);
      }}
      title={t('title')}
      closeButton={false}
      // A8-me-account canvas (phone): 28px top corners ([&&] beats the shared rounded-t-hero), a 40px grabber and 4px more
      // between grabber and title than the shared sheet header.
      className="bg-bg [&&]:rounded-t-[28px] md:[&&]:rounded-t-hero [&_[data-testid=sheet-grabber]>span]:w-10 [&_[data-testid=sheet-grabber]]:mb-1"
    >
      <div className="flex flex-col gap-[14px] pb-[18px] pt-2">
        <div className="flex items-center gap-3 rounded-[18px] border border-border bg-surface px-[14px] py-3">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-forest font-display text-[20px] font-semibold text-gold-light"
          >
            {name.slice(0, 1).toUpperCase()}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[16px] font-bold">{name}</span>
            <span className="truncate text-[13px] text-muted-foreground">
              {t('signedInAs', { email })}
            </span>
          </div>
        </div>

        {onLanguageClick ? (
          <button
            type="button"
            onClick={onLanguageClick}
            disabled={signingOut}
            aria-haspopup="dialog"
            className="flex h-[52px] items-center gap-3 rounded-[18px] border border-border bg-surface px-[14px] text-left text-text disabled:opacity-60"
          >
            <TranslateIcon width={20} height={20} stroke="var(--color-forest)" />
            <span className="flex-grow text-[15px] font-semibold">{t('language')}</span>
            <ChevronRightIcon width={16} height={16} stroke="var(--color-text-muted)" />
          </button>
        ) : null}

        <button
          type="button"
          onClick={onSignOut}
          disabled={signingOut}
          aria-busy={signingOut || undefined}
          className={gcn(
            'flex h-14 items-center justify-center gap-2 rounded-[18px] border-2 border-primary text-[16px] font-bold text-primary',
            'transition-[transform,background-color] duration-press ease-garden hover:bg-surface active:scale-[0.98]',
            'disabled:cursor-default disabled:opacity-60 disabled:active:scale-100',
          )}
        >
          <SignOutIcon width={20} height={20} />
          {signingOut ? t('signingOut') : t('signOut')}
        </button>

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          disabled={signingOut}
          className="-my-3 min-h-11 text-[15px] font-semibold text-forest disabled:opacity-60"
        >
          {t('cancel')}
        </button>
        {notice}
      </div>
    </BottomSheet>
  );
}
