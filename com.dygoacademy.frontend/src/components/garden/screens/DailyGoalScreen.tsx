'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Button } from '../Button';
import { gcn } from '../cn';
import { useGardenFormat } from '../format';
import { BackIcon } from '../icons';
import { IconButton } from '../IconButton';
import { SCREEN_CLASSES } from './GardenTabBar';

/**
 * A8b · Daily goal (canvas `reference/A8b-daily-goal*`, approved
 * 2026-11-14). It replaces the old DailyGoalSheet.
 *
 * Three pots, the shipped tiers (backend missions.plan.ts GOAL_TIERS):
 * Light = 5 min, Steady = 10, Intense = 15; one to five sprouts in each.
 * "At this pace" shows the minutes a week, and a note says a rain barrel
 * keeps the streak (up to 3). No Road to Band line (Dylan, 2026-11-14).
 * "Save goal" saves and goes back.
 *
 * Props only (`live/DailyGoalLive` saves `daily_goal_minutes`).
 */
export const GOAL_POTS = [
  { id: 'light', minutes: 5, sprouts: [[32, 18, 'flower']] },
  {
    id: 'steady',
    minutes: 10,
    sprouts: [
      [18, 18, 'flower'],
      [32, 10, 'leaf'],
      [46, 18, 'flower'],
    ],
  },
  {
    id: 'intense',
    minutes: 15,
    sprouts: [
      [12, 18, 'flower'],
      [22, 10, 'leaf'],
      [32, 18, 'flower'],
      [42, 10, 'leaf'],
      [52, 18, 'flower'],
    ],
  },
] as const;

export type GoalMinutes = (typeof GOAL_POTS)[number]['minutes'];

/** The pot for a saved goal: the tier at or below it, as the backend picks (20 and 30 = Intense). */
export function potFor(minutes: number | null | undefined): GoalMinutes {
  if (minutes == null || !Number.isFinite(minutes)) return 10;
  if (minutes >= 15) return 15;
  if (minutes >= 10) return 10;
  return 5;
}

export interface DailyGoalScreenProps {
  backHref: string;
  minutes: GoalMinutes;
  onPick: (minutes: GoalMinutes) => void;
  onSave: () => void;
  saving?: boolean;
  error?: boolean;
  framed?: boolean;
}

export function DailyGoalScreen({
  backHref,
  minutes,
  onPick,
  onSave,
  saving = false,
  error = false,
  framed = false,
}: DailyGoalScreenProps) {
  const t = useTranslations('screens.goal');
  const f = useGardenFormat();

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

      <div role="radiogroup" aria-label={t('title')} className="flex flex-col gap-2">
        {GOAL_POTS.map((pot) => {
          const picked = pot.minutes === minutes;
          return (
            <button
              key={pot.id}
              type="button"
              role="radio"
              aria-checked={picked}
              disabled={saving}
              onClick={() => onPick(pot.minutes)}
              className={gcn(
                'flex min-h-[84px] items-center gap-3 rounded-[20px] border-2 py-2 pl-2 pr-[14px] text-left text-text',
                picked ? 'border-forest bg-forest-wash' : 'border-border bg-surface',
              )}
            >
              <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
                {pot.sprouts.map(([x, top, kind]) => (
                  <React.Fragment key={x}>
                    <path d={`M${x} 40 V${top}`} stroke="var(--stage-tree-canopy)" strokeWidth="2.2" />
                    <circle
                      cx={x}
                      cy={top - 3}
                      r="4.5"
                      fill={kind === 'flower' ? 'var(--stage-flower)' : 'var(--stage-sprout-leaf)'}
                    />
                  </React.Fragment>
                ))}
                <path d="M8 40 H56 L50 60 H14 Z" fill="var(--color-primary)" />
                <rect x="6" y="36" width="52" height="7" rx="3" fill="var(--color-primary-text)" />
              </svg>
              <span className="flex flex-grow flex-col gap-0.5">
                <span className="text-[17px] font-bold">{t(`tier.${pot.id}.title`)}</span>
                <span className="text-[14px] text-muted-foreground">{t(`tier.${pot.id}.sub`)}</span>
                {pot.id !== 'light' ? (
                  <span className="text-[12px] font-bold text-gold-soft-text">
                    {t(`tier.${pot.id}.note`)}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2.5 rounded-[22px] bg-forest p-4 text-on-forest">
        <span className="text-[12px] font-bold uppercase tracking-[.08em] text-stage-sprout">
          {t('pace')}
        </span>
        <span className="flex items-baseline gap-1.5">
          <span aria-live="polite" className="font-display text-[34px] font-semibold">
            {f.number(minutes * 7)}
          </span>
          <span className="text-[14px] text-on-forest-muted">{t('week')}</span>
        </span>
      </div>

      <div className="flex items-center gap-2.5 rounded-[14px] bg-water-soft px-3 py-2.5 text-[13px] text-water-text-soft">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* Shrinks with the line, as on the board (no flex-shrink: 0 there). */}
          <path d="M5 6 H19 L17.5 21 H6.5 Z" />
          <path d="M4 6 H20" />
        </svg>
        <span>{t('barrel')}</span>
      </div>

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
