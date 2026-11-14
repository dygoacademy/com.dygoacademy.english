'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useMyProfile, useUpdateProfilePrefs } from '@/hooks/useProfile';

import { DailyGoalScreen, potFor, type GoalMinutes } from '../screens/DailyGoalScreen';

/**
 * /me/goal: A8b Daily goal (replaces DailyGoalSheet).
 *
 * Starts on the pot for the saved `daily_goal_minutes` (GET /profiles/me;
 * 20 and 30 from the old sheet show as Intense, the tier the backend
 * already plans them at, until the learner saves). "Save goal" saves with
 * PATCH /profiles/me and goes back to Me; an error stays on the screen.
 */
export function DailyGoalLive() {
  const router = useRouter();
  const profile = useMyProfile();
  const prefs = useUpdateProfilePrefs();
  const saved = potFor(profile.data?.daily_goal_minutes);
  const [picked, setPicked] = React.useState<GoalMinutes | null>(null);
  const minutes = picked ?? saved;

  return (
    <DailyGoalScreen
      backHref={GARDEN_ROUTES.me}
      minutes={minutes}
      onPick={setPicked}
      onSave={() =>
        prefs.mutate(
          { dailyGoalMinutes: minutes },
          { onSuccess: () => router.push(GARDEN_ROUTES.me) },
        )
      }
      saving={prefs.isPending}
      error={prefs.isError}
    />
  );
}
