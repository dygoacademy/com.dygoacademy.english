'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNotificationSchedules } from '@/hooks/useNotificationSchedules';
import { useOnboarding, useUpdateOnboarding } from '@/hooks/useOnboarding';
import { useTopics } from '@/hooks/useTopics';

import { parseClock } from '../format';
import { OnboardReadyScreen } from '../screens/OnboardReadyScreen';
import { displayName, earliestSchedule } from './data';
import { LiveError, LiveLoading } from './LiveState';

/** "10 Environment seeds are in the ground": at most this many from the first bed. */
export const FIRST_SEEDS = 10;
/** "Meet your first 5 words". */
export const FIRST_WORDS = 5;

/**
 * /welcome/ready: OB5 All set. Reads back what OB1 and OB4 saved (GET
 * /profiles/me/onboarding, the first bed the server picked from the goal
 * via GET /topics, the reminder from GET /notifications/schedules, shown
 * only when on) and the learner's first name. Both buttons set
 * `onboarded_at` (`complete: true`); "Meet your first 5 words" then opens
 * A2 with 5 new words from the first bed, "Look around the garden first"
 * the garden (A1). From then on /welcome sends the learner to the garden.
 */
export function OnboardReadyLive() {
  const router = useRouter();
  const onboarding = useOnboarding();
  const topics = useTopics();
  const schedules = useNotificationSchedules();
  const user = useCurrentUser();
  const save = useUpdateOnboarding();

  if (onboarding.isPending) return <LiveLoading />;
  if (onboarding.isError || !onboarding.data) {
    return <LiveError onRetry={() => void onboarding.refetch()} />;
  }

  const data = onboarding.data;
  const topic = topics.data?.find((item) => item.id === data.first_topic_id);
  const words = Number(topic?.word_count) || 0;
  const schedule = earliestSchedule(schedules.data);

  const finish = (to: string) =>
    save.mutate(
      { complete: true },
      {
        onSuccess: () => {
          router.push(to);
          router.refresh();
        },
      },
    );

  return (
    <OnboardReadyScreen
      name={displayName(user.data)}
      bed={topic && words > 0 ? { title: topic.title, seeds: Math.min(FIRST_SEEDS, words) } : null}
      level={data.cefr_level}
      goal={data.study_goal ? { goal: data.study_goal, band: data.target_band } : null}
      reminder={schedule?.is_enabled ? parseClock(schedule.reminder_time) : null}
      links={{
        level: GARDEN_ROUTES.welcome.level,
        goal: GARDEN_ROUTES.welcome.level,
        reminder: GARDEN_ROUTES.welcome.reminder,
      }}
      onMeet={() => finish(GARDEN_ROUTES.plant(FIRST_WORDS, topic?.id))}
      onLook={() => finish(GARDEN_ROUTES.home)}
      saving={save.isPending}
      error={save.isError}
    />
  );
}
