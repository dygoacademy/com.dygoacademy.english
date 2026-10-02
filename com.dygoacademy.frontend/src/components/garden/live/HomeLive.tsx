'use client';

import * as React from 'react';
import { useTimeZone } from 'next-intl';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useDailyActivity } from '@/hooks/useDailyActivity';
import { useTodayMissions } from '@/hooks/useMissions';
import { useNotificationSchedules } from '@/hooks/useNotificationSchedules';
import { useSrsStats } from '@/hooks/useSrsStats';
import { useTopics } from '@/hooks/useTopics';
import { useUpcomingActivity } from '@/hooks/useUpcomingActivity';

import { addDays, hourIn, isoDay, todayIn } from '../format';
import { TodaysGardenScreen } from '../screens/TodaysGardenScreen';
import { WelcomeBackScreen } from '../screens/WelcomeBackScreen';
import {
  displayName,
  freezeStreak,
  gardenPlants,
  greetingFor,
  liveMissions,
  missedDays,
  missionQuizHref,
  ripensTomorrow,
  thirstyMission,
} from './data';
import { LiveError, LiveLoading } from './LiveState';

/**
 * /garden: Today's Garden (A1), or Welcome back (A5) when the learner has
 * missed 2+ days according to GET /srs/activity.
 *
 * Real data: GET /srs/stats (streak, words, due, mastered, leeches, and
 * U4-3's `stage_counts` for the garden plants; the `sampleGarden` estimate
 * stays as the fallback when the field is missing), GET /srs/activity
 * (last 30 days) and "ripens tomorrow" from GET /srs/activity/upcoming at
 * the learner's earliest enabled reminder time (hidden without one).
 * Missions (U6-5): GET /missions/today's 3 rows (water due words, plant
 * new words, the collocation quiz linking to the most-due bed's quiz) and
 * the Golden Bloom state. If that call fails, Missions v0 (U4-4): only
 * "Water today's thirsty words" (reviews today from GET /srs/activity +
 * `due_now`); "coming soon" when that call failed too. Not shown yet:
 * time estimates. A5's freeze card ("streak is safe" + rain barrel, U6-6)
 * shows when GET /srs/stats `freezes` covered missed days this week and
 * the streak is still alive (`freezeStreak`); hidden otherwise.
 */
export function HomeLive() {
  const timeZone = useTimeZone();
  const stats = useSrsStats();
  const activity = useDailyActivity(30);
  const user = useCurrentUser();
  const upcoming = useUpcomingActivity(2);
  const schedules = useNotificationSchedules();
  const missions = useTodayMissions();
  const topics = useTopics();

  if (stats.isPending || activity.isPending || missions.isPending) return <LiveLoading />;
  if (stats.isError || !stats.data) {
    return <LiveError onRetry={() => void stats.refetch()} />;
  }

  const now = new Date();
  const s = stats.data;
  const name = displayName(user.data);
  const today = todayIn(timeZone, now);
  const missed = activity.data ? missedDays(activity.data, isoDay(today)) : null;

  if (missed !== null && missed >= 2) {
    return (
      <WelcomeBackScreen
        date={today}
        name={name}
        garden={{
          thirsty: s.due_now,
          wilting: s.leech_count,
          ripe: s.mastered_words,
          plants: gardenPlants(s, 8),
        }}
        streak={freezeStreak(s)}
        revive={
          s.leech_count > 0
            ? { count: s.leech_count, minutes: null, href: GARDEN_ROUTES.quiz(undefined, 'leech') }
            : null
        }
        waterAll={s.due_now > 0 ? { count: s.due_now, href: GARDEN_ROUTES.review } : null}
      />
    );
  }

  return (
    <TodaysGardenScreen
      date={today}
      greeting={greetingFor(hourIn(timeZone, now))}
      name={name}
      streakDays={s.current_streak_days}
      garden={{
        growing: s.total_words,
        thirsty: s.due_now,
        ripe: s.mastered_words,
        wilting: s.leech_count,
        plants: gardenPlants(s, 9),
      }}
      missions={
        missions.data
          ? liveMissions(missions.data, missionQuizHref(topics.data))
          : activity.data
            ? [thirstyMission(activity.data, isoDay(today), s.due_now)]
            : null
      }
      goldenBloom={missions.data?.goldenBloom ?? false}
      action={
        s.due_now > 0
          ? { href: GARDEN_ROUTES.review, kind: 'start', wordsLeft: s.due_now, minutes: null }
          : null
      }
      ripens={ripensTomorrow(upcoming.data, isoDay(addDays(today, 1)), schedules.data)}
    />
  );
}
