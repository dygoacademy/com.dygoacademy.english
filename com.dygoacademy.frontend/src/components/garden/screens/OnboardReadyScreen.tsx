import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { OnboardingLevel, StudyGoal } from '@/hooks/useOnboarding';

import { Button } from '../Button';
import { gcn } from '../cn';
import type { ClockTime } from '../format';
import { clockLabel, formatBand, hasBand } from '../live/onboarding';
import { ONBOARDING_BUTTON, SaveError } from '../OnboardingShell';
import { SCREEN_CLASSES } from './GardenTabBar';

/**
 * OB5 · All set (board `OnboardReady`, `reference/OB5-ready.html`). Props
 * only.
 *
 * A forest header that blooms in ("All set", "Your garden is planted,
 * Minh", how many seeds of the first bed are in the ground) over a row of
 * ten seeds and sprouts, then a summary of the three choices (Level, Goal,
 * Reminder), each with Change back to its step. "Meet your first 5 words"
 * and "Look around the garden first" both finish onboarding (the live
 * wrapper) and go to the first bed's new words or the garden.
 */
export interface OnboardReadyScreenProps {
  /** First name, or null (the title then has none). */
  name: string | null;
  /** The first bed (picked from the goal) and how many seeds it plants; null = none. */
  bed: { title: string; seeds: number } | null;
  level: OnboardingLevel | null;
  goal: { goal: StudyGoal; band: number | null } | null;
  /** null = no reminder (Not now, or notifications refused). */
  reminder: ClockTime | null;
  links: { level: string; goal: string; reminder: string };
  onMeet: () => void;
  onLook: () => void;
  saving?: boolean;
  error?: boolean;
}

/** Which of the ten plants in the header are sprouts (the rest are seeds). */
const SPROUTS = new Set([1, 4, 7]);

export function OnboardReadyScreen({
  name,
  bed,
  level,
  goal,
  reminder,
  links,
  onMeet,
  onLook,
  saving = false,
  error = false,
}: OnboardReadyScreenProps) {
  const t = useTranslations('screens.onboarding');
  const none = t('ready.none');

  const goalText = goal
    ? hasBand(goal.goal) && goal.band !== null
      ? t('ready.goalWithBand', { goal: t(`goal.${goal.goal}`), band: formatBand(goal.goal, goal.band) })
      : t(`goal.${goal.goal}`)
    : none;

  const rows = [
    {
      id: 'level',
      label: t('ready.level'),
      value: level ? t('ready.levelValue', { title: t(`level.${level}.title`), tag: t(`level.${level}.tag`) }) : none,
      href: links.level,
    },
    { id: 'goal', label: t('ready.goal'), value: goalText, href: links.goal },
    {
      id: 'reminder',
      label: t('ready.reminder'),
      value: reminder ? t('ready.reminderValue', { time: clockLabel(reminder) }) : t('ready.reminderOff'),
      href: links.reminder,
    },
  ];

  return (
    <div className={gcn(SCREEN_CLASSES, 'relative gap-[14px] overflow-hidden px-5 pb-[max(24px,var(--safe-bottom))] pt-[22px]')}>
      <div className="bloom -mx-5 -mt-[22px] flex flex-col gap-2 overflow-hidden rounded-b-[32px] bg-forest px-5 pt-10 text-on-forest">
        <span className="text-[12px] font-bold uppercase tracking-[.08em] text-stage-sprout">{t('ready.eyebrow')}</span>
        <h1 className="font-display text-[32px] font-semibold leading-[1.1]">
          {name ? t('ready.title', { name }) : t('ready.titleNoName')}
        </h1>
        <p className="text-[15px] leading-[1.4] text-on-forest-muted">
          {bed ? t('ready.sub', { count: bed.seeds, bed: bed.title }) : t('ready.subNoBed')}
        </p>
        <div className="-mx-5 mt-1.5">
          <svg width="100%" viewBox="0 0 330 96" aria-hidden="true" className="block h-auto">
            <rect x="0" y="84" width="330" height="12" fill="var(--color-forest-deep)" />
            {Array.from({ length: 10 }, (_, index) => (
              <g key={index} transform={`translate(${-3.5 + index * 33},0)`}>
                {SPROUTS.has(index) ? (
                  <g className="sway">
                    <path d="M20 84 V64" stroke="var(--stage-sprout-leaf)" strokeWidth="2.5" />
                    <path d="M20 72 C13 71 9 66 11 61 C17 61 20 66 20 72 Z" fill="var(--stage-sprout-leaf)" />
                    <path d="M20 68 C27 67 31 62 29 57 C23 57 20 62 20 68 Z" fill="var(--stage-sprout)" />
                  </g>
                ) : (
                  <g>
                    <ellipse cx="20" cy="81" rx="7" ry="3.5" fill="var(--stage-seed)" />
                    <path
                      d="M20 78 C20 74 22 72 24 71"
                      stroke="var(--stage-sprout-leaf)"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                    />
                  </g>
                )}
              </g>
            ))}
          </svg>
        </div>
      </div>
      <div className="flex flex-col rounded-[20px] border border-border bg-surface px-3.5 py-1">
        {rows.map((row, index) => (
          <Link
            key={row.id}
            href={row.href}
            className={gcn(
              'box-content flex h-12 items-center gap-2.5 text-text no-underline',
              index > 0 && 'border-t border-divider',
            )}
          >
            <span className="w-[92px] text-[13px] text-muted-foreground">{row.label}</span>
            <span className="flex-grow text-[15px] font-semibold">{row.value}</span>
            <span className="text-[13px] font-semibold text-forest">{t('ready.change')}</span>
          </Link>
        ))}
      </div>
      <div className="mt-auto flex flex-col gap-1">
        {error ? <SaveError /> : null}
        <Button variant="primary" className={gcn(ONBOARDING_BUTTON, 'px-4')} onClick={onMeet} loading={saving}>
          {t('ready.meet')}
        </Button>
        <button
          type="button"
          onClick={onLook}
          disabled={saving}
          className="self-center p-2 text-[14px] font-semibold text-forest underline"
        >
          {t('ready.look')}
        </button>
      </div>
    </div>
  );
}
