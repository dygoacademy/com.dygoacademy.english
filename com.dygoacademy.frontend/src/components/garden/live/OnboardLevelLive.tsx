'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { GARDEN_ROUTES } from '@/constants/garden';
import { ROUTES } from '@/constants/routes';
import {
  useOnboarding,
  useUpdateOnboarding,
  type OnboardingLevel,
  type StudyGoal,
} from '@/hooks/useOnboarding';

import { OnboardLevelScreen } from '../screens/OnboardLevelScreen';
import { localTimezone } from './data';
import { DEFAULT_LEVEL, hasBand, initialBand, stepBand, STUDY_GOALS, type BandGoal } from './onboarding';

/**
 * /welcome/level: OB1 About you. Starts from what was saved (coming back
 * from OB4 or OB5's Change), else B1 and no goal; each IELTS goal keeps its
 * own target while switching. Continue saves level, goal, band (null for
 * the goals without one) and the browser's time zone in one PATCH
 * /profiles/me/onboarding (the server also picks the first bed from the
 * goal), then opens OB4. Back returns to wherever sign-up came from.
 */
export function OnboardLevelLive() {
  const router = useRouter();
  const onboarding = useOnboarding();
  const save = useUpdateOnboarding();
  const saved = onboarding.data;
  const [pickedLevel, setPickedLevel] = React.useState<OnboardingLevel | null>(null);
  const [pickedGoal, setPickedGoal] = React.useState<StudyGoal | null>(null);
  const [bands, setBands] = React.useState<Partial<Record<BandGoal, number>>>({});

  const level = pickedLevel ?? saved?.cefr_level ?? DEFAULT_LEVEL;
  const savedGoal = saved?.study_goal && STUDY_GOALS.includes(saved.study_goal) ? saved.study_goal : null;
  const goal = pickedGoal ?? savedGoal;
  const bandFor = (id: BandGoal) =>
    bands[id] ?? initialBand(id, saved?.study_goal === id ? saved.target_band : null);
  const band = hasBand(goal) ? bandFor(goal) : 0;

  return (
    <OnboardLevelScreen
      level={level}
      goal={goal}
      band={band}
      onLevelChange={setPickedLevel}
      onGoalChange={setPickedGoal}
      onBandStep={(direction) => {
        if (!hasBand(goal)) return;
        setBands((current) => ({ ...current, [goal]: stepBand(goal, bandFor(goal), direction) }));
      }}
      onContinue={() => {
        if (!goal) return;
        save.mutate(
          {
            cefr_level: level,
            study_goal: goal,
            target_band: hasBand(goal) ? band : null,
            timezone: localTimezone(),
          },
          { onSuccess: () => router.push(GARDEN_ROUTES.welcome.reminder) },
        );
      }}
      back={() => {
        if (window.history.length > 1) router.back();
        else router.push(ROUTES.register);
      }}
      saving={save.isPending}
      error={save.isError}
    />
  );
}
