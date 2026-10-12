import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { gcn } from './cn';
import { IconButton } from './IconButton';
import { BackIcon } from './icons';
import { SCREEN_CLASSES } from './screens/GardenTabBar';

/**
 * Onboarding in 2 steps (canvas page "Adult · Onboarding", boards
 * `OnboardLevel` / `OnboardReminder`, `reference/OB1-about-you.html`,
 * `reference/OB4-reminder.html`): the frame OB1 About you and OB4 Reminder
 * share. Props only; no tab bar. OB5 All set draws its own forest header.
 *
 * 22 / 20 / 24px padding, 14px between rows. Top row: Back (46px, as a
 * link) and the 2-stage plant progress (seed → sprout, 40px circles joined
 * by a 3px line). Then the title (Fraunces 30px) and subtitle (15px), the
 * screen's own rows, and the footer pinned to the bottom.
 */
export interface OnboardingShellProps {
  /** 1 = OB1 About you, 2 = OB4 Reminder. */
  step: 1 | 2;
  /** A link, or a handler (OB1 goes back to wherever sign-up came from). */
  back: string | (() => void);
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export function OnboardingShell({ step, back, title, subtitle, children, footer }: OnboardingShellProps) {
  const t = useTranslations('screens.onboarding');
  return (
    <div className={gcn(SCREEN_CLASSES, 'gap-[14px] px-5 pb-[max(24px,var(--safe-bottom))] pt-[22px]')}>
      <div className="flex items-center gap-2.5">
        {typeof back === 'string' ? (
          <IconButton asChild aria-label={t('back')}>
            <Link href={back}>
              <BackIcon width={20} height={20} />
            </Link>
          </IconButton>
        ) : (
          <IconButton aria-label={t('back')} onClick={back} className="box-content">
            <BackIcon width={20} height={20} />
          </IconButton>
        )}
        <OnboardingProgress step={step} />
      </div>
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-[30px] font-semibold leading-[1.1]">{title}</h1>
        <p className="text-[15px] leading-[1.4] text-muted-foreground">{subtitle}</p>
      </div>
      {children}
      <div className="mt-auto flex flex-col gap-1">{footer}</div>
    </div>
  );
}

/** The 2-stage plant progress: seed (OB1), sprout (OB4); the current one on forest. */
export function OnboardingProgress({ step }: { step: 1 | 2 }) {
  const t = useTranslations('screens.onboarding');
  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={2}
      aria-valuenow={step}
      aria-label={t('progress', { step, total: 2 })}
      className="flex flex-grow items-center gap-1"
    >
      <span
        className={gcn(
          'flex h-10 w-10 shrink-0 items-end justify-center overflow-hidden rounded-full',
          step === 1 ? 'bg-forest' : 'bg-on-forest-muted',
        )}
      >
        <SeedMark />
      </span>
      <span
        className={gcn(
          'h-[3px] flex-grow rounded-[2px]',
          step === 1 ? 'bg-border' : 'bg-stage-tree-canopy',
        )}
      />
      {step === 1 ? (
        <span className="h-10 w-10 shrink-0 rounded-full border-2 border-dashed border-locked-border" />
      ) : (
        <span className="flex h-10 w-10 shrink-0 items-end justify-center overflow-hidden rounded-full bg-forest">
          <SproutMark />
        </span>
      )}
    </div>
  );
}

function SeedMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 40 40" aria-hidden="true">
      <ellipse cx="20" cy="33" rx="6" ry="4" fill="var(--stage-seed)" />
      <path
        d="M20 30 C20 26 22 24 25 23"
        stroke="var(--stage-tree-canopy)"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SproutMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 40 40" aria-hidden="true">
      <path d="M20 40 V22" stroke="var(--stage-tree-canopy)" strokeWidth="2.5" />
      <path d="M20 30 C14 29 11 25 13 21 C18 21 20 25 20 30 Z" fill="var(--stage-sprout-leaf)" />
      <path d="M20 27 C26 26 29 22 27 18 C22 18 20 22 20 27 Z" fill="var(--stage-sprout)" />
    </svg>
  );
}

/** The gold "couldn't save" line above a footer button (never red). */
export function SaveError() {
  const t = useTranslations('screens.onboarding');
  return (
    <p
      role="alert"
      className="mb-2 rounded-[14px] border border-gold-border bg-gold-wash px-3 py-2.5 text-[14px] leading-[1.35] text-gold-text"
    >
      {t('saveError')}
    </p>
  );
}

/** The 56px terracotta footer button of the onboarding boards (16px bold). */
export const ONBOARDING_BUTTON = 'h-14 w-full text-[16px] md:max-w-none';
