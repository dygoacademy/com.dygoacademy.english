import * as React from 'react';
import { useTranslations } from 'next-intl';

import type { StudyGoal } from '@/hooks/useOnboarding';

import { Button } from '../Button';
import { gcn } from '../cn';
import { HarvestFruitIcon, LeafIcon } from '../icons';
import { BAND_STEPPERS, formatBand, hasBand, STUDY_GOALS } from '../live/onboarding';
import { OnboardingOption, OnboardingShell } from '../OnboardingShell';
import { SaveError } from './OnboardLevelScreen';

/**
 * OB2 · Target band (board `OnboardGoal`, not in the repo yet). Props only.
 *
 * IELTS / PTE / Just for life. IELTS and PTE then show a target stepper
 * (IELTS 4.0–9.0 by half bands, PTE 30–90 by 5); the target decides which
 * words ripen first. Continue saves goal + target.
 */
export interface OnboardGoalScreenProps {
  goal: StudyGoal | null;
  /** The target for IELTS / PTE; ignored for LIFE. */
  band: number;
  onGoalChange: (goal: StudyGoal) => void;
  onBandStep: (direction: 1 | -1) => void;
  onContinue: () => void;
  back: string;
  saving?: boolean;
  error?: boolean;
}

export function OnboardGoalScreen({
  goal,
  band,
  onGoalChange,
  onBandStep,
  onContinue,
  back,
  saving = false,
  error = false,
}: OnboardGoalScreenProps) {
  const t = useTranslations('screens.onboarding');
  return (
    <OnboardingShell
      step={2}
      back={back}
      title={t('goal.title')}
      subtitle={t('goal.subtitle')}
      footer={
        <>
          {error ? <SaveError /> : null}
          <Button variant="primary" className="md:max-w-none" onClick={onContinue} disabled={!goal} loading={saving}>
            {t('continue')}
          </Button>
        </>
      }
    >
      <div role="radiogroup" aria-label={t('goal.title')} className="flex flex-col gap-3">
        {STUDY_GOALS.map((id) => (
          <OnboardingOption
            key={id}
            selected={goal === id}
            onSelect={() => onGoalChange(id)}
            title={t(`goal.options.${id}.title`)}
            detail={t(`goal.options.${id}.detail`)}
            icon={
              id === 'LIFE' ? (
                <LeafIcon width={24} height={24} />
              ) : (
                <HarvestFruitIcon width={24} height={24} />
              )
            }
          />
        ))}
      </div>
      {hasBand(goal) ? (
        <BandStepper
          label={t(`goal.target.${goal}`)}
          value={formatBand(goal, band)}
          canLower={band > BAND_STEPPERS[goal].min}
          canRaise={band < BAND_STEPPERS[goal].max}
          onStep={onBandStep}
        />
      ) : null}
    </OnboardingShell>
  );
}

function BandStepper({
  label,
  value,
  canLower,
  canRaise,
  onStep,
}: {
  label: string;
  value: string;
  canLower: boolean;
  canRaise: boolean;
  onStep: (direction: 1 | -1) => void;
}) {
  const t = useTranslations('screens.onboarding.goal');
  const stepClasses = gcn(
    'flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface',
    'text-[22px] font-semibold text-forest disabled:opacity-40',
  );
  return (
    <div className="rise flex items-center justify-between rounded-card border border-border bg-surface px-4 py-3">
      <span className="text-[15px] font-semibold text-text">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={stepClasses}
          onClick={() => onStep(-1)}
          disabled={!canLower}
          aria-label={t('lower')}
        >
          {'−'}
        </button>
        <output aria-live="polite" className="min-w-[48px] text-center font-display text-[26px] font-semibold text-forest">
          {value}
        </output>
        <button
          type="button"
          className={stepClasses}
          onClick={() => onStep(1)}
          disabled={!canRaise}
          aria-label={t('raise')}
        >
          {'+'}
        </button>
      </div>
    </div>
  );
}
