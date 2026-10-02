'use client';

import type * as React from 'react';
import { useTranslations } from 'next-intl';

import { BottomSheet } from './BottomSheet';
import { gcn } from './cn';
import { SignOutIcon } from './icons';

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
}

export function AccountSheet({
  open,
  onOpenChange,
  name,
  email,
  onSignOut,
  signingOut = false,
  notice,
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
      className="bg-garden-bg"
    >
      <div className="flex flex-col gap-[14px] pb-[18px] pt-2">
        <div className="flex items-center gap-3 rounded-[18px] border border-garden-border bg-garden-surface px-[14px] py-3">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-garden-forest font-display text-[20px] font-semibold text-garden-gold-light"
          >
            {name.slice(0, 1).toUpperCase()}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[16px] font-bold">{name}</span>
            <span className="truncate text-[13px] text-garden-muted">
              {t('signedInAs', { email })}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onSignOut}
          disabled={signingOut}
          aria-busy={signingOut || undefined}
          className={gcn(
            'flex h-14 items-center justify-center gap-2 rounded-[18px] border-2 border-garden-primary text-[16px] font-bold text-garden-primary',
            'transition-[transform,background-color] duration-press ease-garden hover:bg-garden-surface active:scale-[0.98]',
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
          className="-my-3 min-h-11 text-[15px] font-semibold text-garden-forest disabled:opacity-60"
        >
          {t('cancel')}
        </button>
        {notice}
      </div>
    </BottomSheet>
  );
}
