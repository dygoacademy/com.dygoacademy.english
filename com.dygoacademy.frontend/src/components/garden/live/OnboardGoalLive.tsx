'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useOnboarding, useUpdateOnboarding, type StudyGoal } from '@/hooks/useOnboarding';

import { OnboardGoalScreen } from '../screens/OnboardGoalScreen';
import { hasBand, initialBand, stepBand, type BandGoal } from './onboarding';

/**
 * /welcome/goal: OB2. Starts from the saved goal and band; switching
 * between IELTS and PTE keeps each one's own target. Continue saves
 * `study_goal` + `target_band` (null for "just for life") and opens OB3.
 */
export function OnboardGoalLive() {
  const router = useRouter();
  const onboarding = useOnboarding();
  const save = useUpdateOnboarding();
  const saved = onboarding.data;
  const [picked, setPicked] = React.useState<StudyGoal | null>(null);
  const [bands, setBands] = React.useState<Partial<Record<BandGoal, number>>>({});
  const goal = picked ?? saved?.study_goal ?? null;

  const bandFor = (id: BandGoal) =>
    bands[id] ?? initialBand(id, saved?.study_goal === id ? saved.target_band : null);
  const band = hasBand(goal) ? bandFor(goal) : 0;

  return (
    <OnboardGoalScreen
      goal={goal}
      band={band}
      onGoalChange={setPicked}
      onBandStep={(direction) => {
        if (!hasBand(goal)) return;
        setBands((current) => ({ ...current, [goal]: stepBand(goal, bandFor(goal), direction) }));
      }}
      onContinue={() => {
        if (!goal) return;
        save.mutate(
          { study_goal: goal, target_band: hasBand(goal) ? band : null },
          { onSuccess: () => router.push(GARDEN_ROUTES.welcome.bed) },
        );
      }}
      back={GARDEN_ROUTES.welcome.level}
      saving={save.isPending}
      error={save.isError}
    />
  );
}
