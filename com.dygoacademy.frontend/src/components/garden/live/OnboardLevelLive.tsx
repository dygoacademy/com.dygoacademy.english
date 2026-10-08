'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useOnboarding, useUpdateOnboarding, type OnboardingLevel } from '@/hooks/useOnboarding';

import { OnboardLevelScreen } from '../screens/OnboardLevelScreen';
import { DEFAULT_LEVEL } from './onboarding';

/**
 * /welcome/level: OB1. Starts from the saved level (coming back from OB2);
 * Continue saves `cefr_level` (PATCH /profiles/me/onboarding) and opens
 * OB2. Skip and "Not sure?" save B1 and go on (D-7: no level check).
 */
export function OnboardLevelLive() {
  const router = useRouter();
  const onboarding = useOnboarding();
  const save = useUpdateOnboarding();
  const [picked, setPicked] = React.useState<OnboardingLevel | null>(null);
  const level = picked ?? onboarding.data?.cefr_level ?? null;

  const saveAndGo = (cefr_level: OnboardingLevel) =>
    save.mutate({ cefr_level }, { onSuccess: () => router.push(GARDEN_ROUTES.welcome.goal) });

  return (
    <OnboardLevelScreen
      level={level}
      onSelect={setPicked}
      onContinue={() => level && saveAndGo(level)}
      onSkip={() => saveAndGo(DEFAULT_LEVEL)}
      onNotSure={() => {
        setPicked(DEFAULT_LEVEL);
        saveAndGo(DEFAULT_LEVEL);
      }}
      saving={save.isPending}
      error={save.isError}
    />
  );
}
