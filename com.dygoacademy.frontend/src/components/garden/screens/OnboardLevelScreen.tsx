import * as React from 'react';
import { useTranslations } from 'next-intl';

import type { OnboardingLevel, StudyGoal } from '@/hooks/useOnboarding';

import { Button } from '../Button';
import { gcn } from '../cn';
import { BAND_STEPPERS, formatBand, hasBand, ONBOARDING_LEVELS, STUDY_GOALS } from '../live/onboarding';
import { ONBOARDING_BUTTON, OnboardingShell, SaveError } from '../OnboardingShell';

/**
 * OB1 · About you (board `OnboardLevel`, `reference/OB1-about-you.html`;
 * `-work` without the band row). Props only.
 *
 * "Your English today" as four 60px tiles in a 2 × 2 grid (Just starting
 * A1–A2 … Advanced C1), then the goal chips (IELTS Academic, IELTS
 * General, Work, Travel, Just for me). The forest "Target band" row with
 * its −/+ stepper shows only for the IELTS goals. Continue saves all of it
 * at once (the live wrapper) and opens OB4.
 */
export interface OnboardLevelScreenProps {
  level: OnboardingLevel;
  goal: StudyGoal | null;
  /** The target for the IELTS goals; ignored for the others. */
  band: number;
  onLevelChange: (level: OnboardingLevel) => void;
  onGoalChange: (goal: StudyGoal) => void;
  onBandStep: (direction: 1 | -1) => void;
  onContinue: () => void;
  back: string | (() => void);
  saving?: boolean;
  error?: boolean;
}

const LABEL = '-mb-1.5 text-[13px] font-bold text-text';

export function OnboardLevelScreen({
  level,
  goal,
  band,
  onLevelChange,
  onGoalChange,
  onBandStep,
  onContinue,
  back,
  saving = false,
  error = false,
}: OnboardLevelScreenProps) {
  const t = useTranslations('screens.onboarding');
  return (
    <OnboardingShell
      step={1}
      back={back}
      title={t('about.title')}
      subtitle={t('about.sub')}
      footer={
        <>
          {error ? <SaveError /> : null}
          <Button
            variant="primary"
            className={ONBOARDING_BUTTON}
            onClick={onContinue}
            disabled={!goal}
            loading={saving}
          >
            {t('continue')}
          </Button>
        </>
      }
    >
      <span className={LABEL}>{t('about.levelLabel')}</span>
      <div role="radiogroup" aria-label={t('about.levelLabel')} className="grid grid-cols-2 gap-2">
        {ONBOARDING_LEVELS.map((id) => {
          const on = level === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onLevelChange(id)}
              className={gcn(
                'flex h-[60px] flex-col items-start justify-center gap-0.5 rounded-[16px] border-2 px-3 text-left text-text',
                on ? 'border-forest bg-forest-wash' : 'border-border bg-surface',
              )}
            >
              <span className="text-[15px] font-bold">{t(`level.${id}.title`)}</span>
              <span className="text-[12px] font-bold text-success">{t(`level.${id}.tag`)}</span>
            </button>
          );
        })}
      </div>
      <span className="-mt-1 text-[12px] text-muted-foreground">{t('about.notSure')}</span>
      <span className={LABEL}>{t('about.goalLabel')}</span>
      <div role="radiogroup" aria-label={t('about.goalLabel')} className="flex flex-wrap gap-2">
        {STUDY_GOALS.map((id) => {
          const on = goal === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onGoalChange(id)}
              className={gcn(
                'h-10 whitespace-nowrap rounded-[20px] border px-3.5 text-[14px] font-bold',
                on ? 'border-forest bg-forest text-white' : 'border-border bg-surface text-text',
              )}
            >
              {t(`goal.${id}`)}
            </button>
          );
        })}
      </div>
      {hasBand(goal) ? (
        <div className="rise flex items-center gap-2.5 rounded-[18px] bg-forest px-3.5 py-2.5 text-on-forest">
          <div className="flex flex-grow flex-col gap-0.5">
            <span className="text-[12px] font-bold uppercase tracking-[.08em] text-stage-sprout">
              {t('about.band')}
            </span>
            <span className="text-[12px] text-on-forest-muted">{t('about.bandNote')}</span>
          </div>
          <StepButton label={t('about.lower')} disabled={band <= BAND_STEPPERS[goal].min} onClick={() => onBandStep(-1)}>
            {'–'}
          </StepButton>
          <output aria-live="polite" className="min-w-[50px] text-center font-display text-[30px] font-semibold">
            {formatBand(goal, band)}
          </output>
          <StepButton label={t('about.raise')} disabled={band >= BAND_STEPPERS[goal].max} onClick={() => onBandStep(1)}>
            {'+'}
          </StepButton>
        </div>
      ) : null}
    </OnboardingShell>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="h-11 w-11 rounded-full border border-[#3E6B57] bg-transparent px-1.5 py-px text-[22px] text-on-forest disabled:opacity-40"
    >
      {children}
    </button>
  );
}
