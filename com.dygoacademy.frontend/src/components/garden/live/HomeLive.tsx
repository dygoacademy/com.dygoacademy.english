'use client';

import * as React from 'react';
import { useFormatter } from 'next-intl';

import { GARDEN_ROUTES } from '@/constants/garden';
import { ROUTES } from '@/constants/routes';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useDailyActivity } from '@/hooks/useDailyActivity';
import { useSrsStats } from '@/hooks/useSrsStats';

import { TodaysGardenScreen } from '../screens/TodaysGardenScreen';
import { WelcomeBackScreen } from '../screens/WelcomeBackScreen';
import { displayName, greetingFor, isoDate, missedDays, sampleGarden } from './data';
import { LiveError, LiveLoading } from './LiveState';

/**
 * /garden: Today's Garden (A1), or Welcome back (A5) when the learner has
 * missed 2+ days according to GET /srs/activity.
 *
 * Real data: GET /srs/stats (streak, words, due, mastered, leeches) and
 * GET /srs/activity (last 30 days). Not available yet, so not shown:
 * daily missions (UI-6, "coming soon"), "ripens tomorrow" (needs the
 * upcoming-activity endpoint, not in the committed backend), streak
 * freezes and time estimates.
 */
export function HomeLive() {
  const format = useFormatter();
  const stats = useSrsStats();
  const activity = useDailyActivity(30);
  const user = useCurrentUser();

  if (stats.isPending || activity.isPending) return <LiveLoading />;
  if (stats.isError || !stats.data) {
    return <LiveError onRetry={() => void stats.refetch()} />;
  }

  const now = new Date();
  const s = stats.data;
  const name = displayName(user.data);
  const dateLabel = format.dateTime(now, { weekday: 'long', day: 'numeric', month: 'long' });
  const counts = {
    total: s.total_words,
    mastered: s.mastered_words,
    leeches: s.leech_count,
    due: s.due_now,
  };
  const missed = activity.data ? missedDays(activity.data, isoDate(now)) : null;

  if (missed !== null && missed >= 2) {
    return (
      <WelcomeBackScreen
        dateLabel={dateLabel}
        name={name}
        garden={{
          thirsty: s.due_now,
          wilting: s.leech_count,
          ripe: s.mastered_words,
          plants: sampleGarden(counts, 8),
        }}
        streak={null}
        revive={
          s.leech_count > 0
            ? { count: s.leech_count, minutes: null, href: `${ROUTES.quiz}?mode=leech` }
            : null
        }
        waterAll={s.due_now > 0 ? { count: s.due_now, href: GARDEN_ROUTES.review } : null}
      />
    );
  }

  return (
    <TodaysGardenScreen
      dateLabel={dateLabel}
      greeting={greetingFor(now.getHours())}
      name={name}
      streakDays={s.current_streak_days}
      garden={{
        growing: s.total_words,
        thirsty: s.due_now,
        ripe: s.mastered_words,
        wilting: s.leech_count,
        plants: sampleGarden(counts, 9),
      }}
      missions={null}
      action={
        s.due_now > 0
          ? { href: GARDEN_ROUTES.review, kind: 'start', wordsLeft: s.due_now, minutes: null }
          : null
      }
      ripens={null}
    />
  );
}
