import * as React from 'react';
import { useTranslations } from 'next-intl';

import type { OnboardingLevel } from '@/hooks/useOnboarding';

import { Button } from '../Button';
import { ONBOARDING_LEVELS } from '../live/onboarding';
import { OnboardingOption, OnboardingShell } from '../OnboardingShell';
import { PlantGlyph } from '../PlantGlyph';
import type { PlantStage } from '../plantStage';

/**
 * OB1 · Your level (board `OnboardLevel`, not in the repo yet). Props only.
 *
 * Four "I can…" sentences, one per CEFR level A2–C1 (the letters only as a
 * small badge). Continue saves the pick. Skip, and the "Not sure?" link,
 * start at B1 (D-7 undecided: no level check is built).
 */
export interface OnboardLevelScreenProps {
  level: OnboardingLevel | null;
  onSelect: (level: OnboardingLevel) => void;
  onContinue: () => void;
  onSkip: () => void;
  onNotSure: () => void;
  saving?: boolean;
  error?: boolean;
}

const LEVEL_PLANT: Record<OnboardingLevel, PlantStage> = {
  A2: 'seed',
  B1: 'sprout',
  B2: 'flower',
  C1: 'tree',
};

export function OnboardLevelScreen({
  level,
  onSelect,
  onContinue,
  onSkip,
  onNotSure,
  saving = false,
  error = false,
}: OnboardLevelScreenProps) {
  const t = useTranslations('screens.onboarding');
  return (
    <OnboardingShell
      step={1}
      onSkip={onSkip}
      title={t('level.title')}
      subtitle={t('level.subtitle')}
      footer={
        <>
          {error ? <SaveError /> : null}
          <Button variant="primary" onClick={onContinue} disabled={!level} loading={saving}>
            {t('continue')}
          </Button>
        </>
      }
    >
      <div role="radiogroup" aria-label={t('level.title')} className="flex flex-col gap-3">
        {ONBOARDING_LEVELS.map((id) => (
          <OnboardingOption
            key={id}
            selected={level === id}
            onSelect={() => onSelect(id)}
            title={t(`level.options.${id}`)}
            badge={id}
            icon={<PlantGlyph stage={LEVEL_PLANT[id]} variant="tile" size={32} />}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={onNotSure}
        className="min-h-11 self-center text-[15px] font-semibold text-forest underline"
      >
        {t('level.notSure')}
      </button>
    </OnboardingShell>
  );
}

/** The gold "couldn't save" line above a footer button (never red). */
export function SaveError() {
  const t = useTranslations('screens.onboarding');
  return (
    <p
      role="alert"
      className="rounded-[14px] border border-gold-border bg-gold-wash px-3 py-2.5 text-[14px] leading-[1.35] text-gold-text"
    >
      {t('saveError')}
    </p>
  );
}
