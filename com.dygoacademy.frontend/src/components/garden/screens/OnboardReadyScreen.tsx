import * as React from 'react';
import { useTranslations } from 'next-intl';

import type { OnboardingLevel, StudyGoal } from '@/hooks/useOnboarding';

import { Button } from '../Button';
import type { ClockTime } from '../format';
import { useGardenFormat } from '../format';
import { WaterIcon } from '../icons';
import { formatBand, hasBand } from '../live/onboarding';
import { OnboardingShell } from '../OnboardingShell';
import { PlantGlyph } from '../PlantGlyph';
import { SaveError } from './OnboardLevelScreen';

/**
 * OB5 · Garden ready (board `OnboardReady`, not in the repo yet). Props only.
 *
 * The first seeds drop into the bed (the bloom animation, one after the
 * other; still under reduced motion), a summary of the four choices (all
 * can be changed later in Me), and "Water your first words" → A1.
 */
export interface OnboardReadyScreenProps {
  level: OnboardingLevel | null;
  goal: { goal: StudyGoal; band: number | null } | null;
  bed: string | null;
  /** null = no reminder (skipped, or notifications refused). */
  reminder: ClockTime | null;
  onWater: () => void;
  back: string;
  saving?: boolean;
  error?: boolean;
}

const SEEDS = 5;

export function OnboardReadyScreen({
  level,
  goal,
  bed,
  reminder,
  onWater,
  back,
  saving = false,
  error = false,
}: OnboardReadyScreenProps) {
  const t = useTranslations('screens.onboarding');
  const f = useGardenFormat();
  const none = t('ready.none');

  const goalText = goal
    ? hasBand(goal.goal) && goal.band !== null
      ? t('ready.goalWithBand', { goal: t(`goal.options.${goal.goal}.title`), band: formatBand(goal.goal, goal.band) })
      : t(`goal.options.${goal.goal}.title`)
    : none;

  const rows: Array<{ id: string; label: string; value: string }> = [
    { id: 'level', label: t('ready.level'), value: level ? t('ready.levelValue', { level }) : none },
    { id: 'goal', label: t('ready.goal'), value: goalText },
    { id: 'bed', label: t('ready.bed'), value: bed ?? none },
    {
      id: 'reminder',
      label: t('ready.reminder'),
      value: reminder ? f.clock(reminder) : t('ready.reminderOff'),
    },
  ];

  return (
    <OnboardingShell
      step={5}
      back={back}
      title={t('ready.title')}
      subtitle={t('ready.subtitle')}
      footer={
        <>
          {error ? <SaveError /> : null}
          <Button
            variant="primary"
            onClick={onWater}
            loading={saving}
            leadingIcon={<WaterIcon width={20} height={20} fill="currentColor" />}
          >
            {t('ready.water')}
          </Button>
        </>
      }
    >
      <div
        aria-hidden="true"
        className="flex h-[96px] items-end justify-center gap-4 rounded-card bg-forest pb-3"
      >
        {Array.from({ length: SEEDS }, (_, index) => (
          <span
            key={index}
            className="bloom"
            style={{ animationDelay: `${index * 120}ms`, animationFillMode: 'both' }}
          >
            <PlantGlyph stage={index % 2 === 0 ? 'seed' : 'sprout'} variant="topic" size={index % 2 === 0 ? 22 : 30} />
          </span>
        ))}
      </div>
      <dl className="flex flex-col divide-y divide-divider rounded-card border border-border bg-surface">
        {rows.map((row) => (
          <div key={row.id} className="flex min-h-[52px] items-center justify-between gap-3 px-4 py-2.5">
            <dt className="text-[14px] text-muted-foreground">{row.label}</dt>
            <dd className="text-right text-[15px] font-semibold text-text">{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-center text-[13px] text-muted-foreground">{t('ready.editLater')}</p>
    </OnboardingShell>
  );
}
