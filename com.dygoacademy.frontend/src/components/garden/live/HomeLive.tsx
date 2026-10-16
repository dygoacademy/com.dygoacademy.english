'use client';

import * as React from 'react';
import { useTimeZone } from 'next-intl';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useDailyActivity } from '@/hooks/useDailyActivity';
import { useTodayMissions } from '@/hooks/useMissions';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useNotificationSchedules } from '@/hooks/useNotificationSchedules';
import { useSrsStats } from '@/hooks/useSrsStats';
import { useTopics } from '@/hooks/useTopics';
import { useUpcomingActivity } from '@/hooks/useUpcomingActivity';

import { addDays, hourIn, isoDay, todayIn } from '../format';
import { AllWateredScreen } from '../screens/AllWateredScreen';
import { TodaysGardenScreen } from '../screens/TodaysGardenScreen';
import { WelcomeBackScreen } from '../screens/WelcomeBackScreen';
import {
  displayName,
  comebackStart,
  EXTRA_PLANT_COUNT,
  plantAllowance,
  extraPlantBed,
  freezeStreak,
  gardenPlants,
  greetingFor,
  liveMissions,
  missedDays,
  missionQuizHref,
  nextRipening,
  ripensTomorrow,
  showAllWatered,
  showWelcomeBack,
  thirstyMission,
} from './data';
import { LiveError, LiveLoading } from './LiveState';
import { usePlantPendingSeed } from './usePlantPendingSeed';

/**
 * /garden: Today's Garden (A1), or Welcome back (A5 / A5b) when the
 * learner has missed 2+ days according to GET /srs/activity and something
 * is due or wilting (`showWelcomeBack`; its "Start small" card from
 * `comebackStart`).
 *
 * Real data: GET /srs/stats (streak, words, due, mastered, leeches, and
 * U4-3's `stage_counts` for the garden plants; the `sampleGarden` estimate
 * stays as the fallback when the field is missing), GET /srs/activity
 * (last 30 days) and "ripens tomorrow" from GET /srs/activity/upcoming at
 * the learner's earliest enabled reminder time (hidden without one).
 * Missions (U6-5): GET /missions/today's 3 rows (water due words, plant
 * new words, the collocation quiz linking to the most-due bed's quiz) and
 * the Golden Bloom state. Each open row is the way in to its activity
 * (there is no separate "Water your garden" button); the water row counts
 * the live `due_now`, the same number as the hero's "thirsty". If that
 * call fails, Missions v0 (U4-4): only "Water today's thirsty words"
 * (reviews today from GET /srs/activity + `due_now`), linking to
 * watering; "coming soon" when that call failed too. A1 doesn't show
 * time estimates yet (A5 does, `minutesFor`). A5's freeze card ("streak
 * is safe" + rain barrel, U6-6) shows when GET /srs/stats `freezes`
 * covered missed days this week and the streak is still alive
 * (`freezeStreak`); hidden otherwise.
 *
 * A1b All watered replaces A1 when nothing is due and today's missions
 * are all done (`showAllWatered`; the due count alone when the missions
 * call failed, and then without the Golden Bloom line): the Golden Bloom
 * card with the next ripening (the count stays without a reminder,
 * `nextRipening`) and three extras: plant 5 new words from the first bed
 * (from the goal) while it has seeds, else the bed with the most seeds
 * (`extraPlantBed`, hidden without seeds), The Pond, and
 * the mission quiz link.
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
  const onboarding = useOnboarding();
  usePlantPendingSeed();

  if (stats.isPending || activity.isPending || missions.isPending) return <LiveLoading />;
  if (stats.isError || !stats.data) {
    return <LiveError onRetry={() => void stats.refetch()} />;
  }

  const now = new Date();
  const s = stats.data;
  const name = displayName(user.data, s.display_name);
  const today = todayIn(timeZone, now);
  const missed = activity.data ? missedDays(activity.data, isoDay(today)) : null;

  if (showWelcomeBack(missed, s)) {
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
        start={comebackStart(s)}
      />
    );
  }

  const tomorrow = isoDay(addDays(today, 1));

  if (showAllWatered(s, missions.data)) {
    const bed = extraPlantBed(topics.data, onboarding.data?.first_topic_id);
    const plantLeft = plantAllowance(missions.data);
    return (
      <AllWateredScreen
        date={today}
        greeting={greetingFor(hourIn(timeZone, now))}
        name={name}
        streakDays={s.current_streak_days}
        plants={gardenPlants(s, 9)}
        bloom={
          missions.data
            ? {
                done: missions.data.missions.filter((m) => m.done).length,
                total: missions.data.missions.length,
              }
            : null
        }
        ripens={nextRipening(upcoming.data, tomorrow, schedules.data)}
        extras={{
          // Daily goal missions: only while today's seeds aren't all planted.
          plant:
            bed && plantLeft > 0
              ? {
                  bed: bed.title,
                  href: GARDEN_ROUTES.plant(Math.min(EXTRA_PLANT_COUNT, plantLeft), bed.id),
                }
              : null,
          speakHref: GARDEN_ROUTES.sounds,
          quizHref: missionQuizHref(topics.data, missions.data?.quiz_questions),
        }}
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
          ? liveMissions(
              missions.data,
              missionQuizHref(topics.data, missions.data.quiz_questions),
              s.due_now,
            )
          : activity.data
            ? [
                {
                  ...thirstyMission(activity.data, isoDay(today), s.due_now),
                  href: GARDEN_ROUTES.review,
                },
              ]
            : null
      }
      goldenBloom={missions.data?.goldenBloom ?? false}
      ripens={ripensTomorrow(upcoming.data, tomorrow, schedules.data)}
    />
  );
}
