import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { gcn } from './cn';
import { IconButton } from './IconButton';
import { BackIcon } from './icons';
import { PlantGlyph } from './PlantGlyph';
import type { PlantStage } from './plantStage';
import { SCREEN_CLASSES } from './screens/GardenTabBar';

/**
 * Onboarding OB1–OB5 (design changelog, page "Adult · Onboarding"): the
 * shell every onboarding screen shares. Props only; no tab bar.
 *
 * Top row: Back (OB2–OB5) on the left, Skip (OB1, OB4) on the right. Under
 * it the 4-step plant progress header: one plant per step, seed → sprout →
 * flower → fruit tree; steps done and the current one are drawn, steps to
 * come are faded seeds (OB5 shows all four grown). Then the title (Fraunces
 * 28px), subtitle, the screen's own content, and the footer button pinned
 * to the bottom.
 *
 * NOT matched to the canvas yet: the OnboardLevel / OnboardGoal / OnboardBed
 * / OnboardReminder / OnboardReady boards were not in the repo when this
 * was built (2026-10-08), so sizes follow the AU2 Create account screen
 * (AuthShell) and the garden tokens. Rebuild from reference/OB*.html once
 * the boards are approved and exported (CLAUDE.md rule 13).
 */
export const ONBOARDING_STAGES: readonly PlantStage[] = ['seed', 'sprout', 'flower', 'tree'];

export interface OnboardingShellProps {
  /** 1–4 = OB1–OB4; 5 = OB5 (every plant grown). */
  step: 1 | 2 | 3 | 4 | 5;
  back?: string;
  onSkip?: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  /** false = no progress header (OB5 draws the grown plants in its own bed). */
  progress?: boolean;
}

export function OnboardingShell({
  step,
  back,
  onSkip,
  title,
  subtitle,
  children,
  footer,
  progress = true,
}: OnboardingShellProps) {
  const t = useTranslations('screens.onboarding');
  return (
    <div className={gcn(SCREEN_CLASSES, 'gap-5 px-5 pt-[22px] pb-[max(28px,var(--safe-bottom))]')}>
      <div className="flex min-h-11 items-center justify-between">
        {back ? (
          <IconButton asChild aria-label={t('back')}>
            <Link href={back}>
              <BackIcon width={20} height={20} />
            </Link>
          </IconButton>
        ) : (
          <span />
        )}
        {onSkip ? (
          <button
            type="button"
            onClick={onSkip}
            className="min-h-11 px-2 text-[15px] font-semibold text-forest underline-offset-2 hover:underline"
          >
            {t('skip')}
          </button>
        ) : null}
      </div>
      {progress ? <OnboardingProgress step={step} /> : null}
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[28px] font-semibold leading-[1.1]">{title}</h1>
        {subtitle ? <p className="text-[15px] text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="flex flex-1 flex-col gap-3">{children}</div>
      <div className="flex flex-col gap-3">{footer}</div>
    </div>
  );
}

/** The 4-step plant progress header (one stage per step). */
export function OnboardingProgress({ step }: { step: OnboardingShellProps['step'] }) {
  const t = useTranslations('screens.onboarding');
  const current = Math.min(step, 4);
  return (
    <ol
      aria-label={step === 5 ? t('progressDone') : t('progress', { step: current, total: 4 })}
      className="flex items-end justify-between gap-2 rounded-card bg-forest px-5 pb-3 pt-4"
    >
      {ONBOARDING_STAGES.map((stage, index) => {
        const reached = index + 1 <= step;
        const isCurrent = index + 1 === step;
        return (
          <li
            key={stage}
            aria-current={isCurrent ? 'step' : undefined}
            className="flex flex-1 flex-col items-center gap-2"
          >
            <span
              className={gcn(
                'flex h-12 items-end justify-center',
                reached ? 'opacity-100' : 'opacity-40',
                isCurrent && 'bloom',
              )}
            >
              <PlantGlyph stage={reached ? stage : 'seed'} variant="topic" size={reached ? 36 : 22} />
            </span>
            <span
              aria-hidden="true"
              className={gcn(
                'h-1 w-full rounded-full',
                reached ? 'bg-on-forest' : 'bg-on-forest-line',
              )}
            />
          </li>
        );
      })}
    </ol>
  );
}

/**
 * One choice in an onboarding list (OB1 levels, OB2 goals): a white card,
 * forest border + check when picked. A radio in a `role="radiogroup"`.
 */
export function OnboardingOption({
  selected,
  onSelect,
  title,
  detail,
  badge,
  icon,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  detail?: string;
  badge?: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={gcn(
        'flex min-h-[64px] w-full items-center gap-3 rounded-control border bg-surface px-4 py-3 text-left',
        'transition-colors duration-quick ease-garden',
        selected ? 'border-2 border-forest bg-card-lift-bg' : 'border-border hover:bg-surface-sunken',
      )}
    >
      {icon ? (
        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center">
          {icon}
        </span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[16px] font-semibold leading-[1.3] text-text">{title}</span>
        {detail ? <span className="text-[14px] leading-[1.35] text-muted-foreground">{detail}</span> : null}
      </span>
      {badge ? (
        <span className="shrink-0 rounded-full bg-surface-sunken px-2.5 py-1 text-[13px] font-semibold text-forest">
          {badge}
        </span>
      ) : null}
    </button>
  );
}
