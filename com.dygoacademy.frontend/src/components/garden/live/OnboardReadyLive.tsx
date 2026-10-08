'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useNotificationSchedules } from '@/hooks/useNotificationSchedules';
import { useOnboarding, useUpdateOnboarding } from '@/hooks/useOnboarding';
import { useTopics } from '@/hooks/useTopics';

import { parseClock } from '../format';
import { OnboardReadyScreen } from '../screens/OnboardReadyScreen';
import { earliestSchedule } from './data';
import { LiveError, LiveLoading } from './LiveState';

/**
 * /welcome/ready: OB5. The summary reads back what OB1–OB4 saved (GET
 * /profiles/me/onboarding, the first bed's title from GET /topics, the
 * reminder from GET /notifications/schedules, shown only when it is on).
 * "Water your first words" sets `onboarded_at` (`complete: true`) and
 * opens the garden (A1); from then on /welcome sends the learner there.
 */
export function OnboardReadyLive() {
  const router = useRouter();
  const onboarding = useOnboarding();
  const topics = useTopics();
  const schedules = useNotificationSchedules();
  const save = useUpdateOnboarding();

  if (onboarding.isPending) return <LiveLoading />;
  if (onboarding.isError || !onboarding.data) {
    return <LiveError onRetry={() => void onboarding.refetch()} />;
  }

  const data = onboarding.data;
  const bed = topics.data?.find((topic) => topic.id === data.first_topic_id)?.title ?? null;
  const schedule = earliestSchedule(schedules.data);

  return (
    <OnboardReadyScreen
      level={data.cefr_level}
      goal={data.study_goal ? { goal: data.study_goal, band: data.target_band } : null}
      bed={bed}
      reminder={schedule?.is_enabled ? parseClock(schedule.reminder_time) : null}
      onWater={() =>
        save.mutate(
          { complete: true },
          {
            onSuccess: () => {
              router.push(GARDEN_ROUTES.home);
              router.refresh();
            },
          },
        )
      }
      back={GARDEN_ROUTES.welcome.reminder}
      saving={save.isPending}
      error={save.isError}
    />
  );
}
