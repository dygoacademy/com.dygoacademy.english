'use client';

import * as React from 'react';
import { useTimeZone } from 'next-intl';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useActiveBed } from '@/hooks/useBeds';
import { useDailyActivity } from '@/hooks/useDailyActivity';
import { useTodayMissions } from '@/hooks/useMissions';
import { useSrsStats } from '@/hooks/useSrsStats';
import { useTopics } from '@/hooks/useTopics';
import { useUpcomingActivity } from '@/hooks/useUpcomingActivity';

import { MissionCompleteScreen } from '../screens/MissionCompleteScreen';
import { addDays, isoDay, todayIn, useGardenFormat, weekDays } from '../format';
import {
  doneReminder,
  harvestHref,
  liveMissionsSummary,
  missionQuizHref,
  missionsSummary,
  thirstyMission,
  type SessionResult,
} from './data';
import { useReminderSwitch } from './useReminderSwitch';

/**
 * /review/done: Mission complete (A3) for the session that just
 * ended. The session's results come in the URL from /review
 * (watered, recalled %, minutes, a word that bloomed); the streak from
 * GET /srs/stats and this week's days from GET /srs/activity (a day is
 * done when it has reviews). Missions (U6-5): the Golden Bloom card counts
 * GET /missions/today's done missions, and its button opens the collocation
 * quiz (most-due bed) while that mission is open; if the call fails,
 * Missions v0 (U4-4) counts mission 1 (water today's thirsty words: done
 * when nothing is due). Reminder (U6-7b): "N words ripen tomorrow" from GET
 * /srs/activity/upcoming, the switch from the earliest schedule via
 * useReminderSwitch (shared with A8; no schedule → off, turning it on
 * creates one at the default time after the Web Push prompt). Hidden only
 * when the browser has no Web Push.
 */
export function DoneLive({ result }: { result: SessionResult }) {
  const timeZone = useTimeZone();
  const { weekStart } = useGardenFormat();
  const stats = useSrsStats();
  const activity = useDailyActivity(7);
  const todayMissions = useTodayMissions();
  const topics = useTopics();
  const activeBed = useActiveBed();
  const upcoming = useUpcomingActivity(2);
  const reminder = useReminderSwitch();

  const today = todayIn(timeZone);
  const todayIso = isoDay(today);
  const active = new Set(
    (activity.data ?? []).filter((d) => d.review_count > 0).map((d) => d.review_date.slice(0, 10)),
  );
  const week = activity.data
    ? weekDays(today, weekStart).map((day) => {
        const iso = isoDay(day);
        const done = active.has(iso) || (iso === todayIso && result.watered > 0);
        const state: 'done' | 'today' | 'empty' =
          iso === todayIso && done ? 'today' : done && iso < todayIso ? 'done' : 'empty';
        return { day, state };
      })
    : null;
  // Hidden where this browser can't get reminders; `on` only when this device will.
  const reminderRow =
    reminder.supported && !reminder.blocked
      ? doneReminder(upcoming.data, isoDay(addDays(today, 1)), reminder.schedules)
      : null;

  return (
    <MissionCompleteScreen
      // Restart the switch from the real state when the schedule loads or saves.
      key={reminder.key}
      closeHref={GARDEN_ROUTES.home}
      backHref={GARDEN_ROUTES.home}
      words={result.watered}
      bloomed={result.word ? { word: result.word, more: result.more } : null}
      stats={{
        recalledPercent: result.recalled,
        minutesToday: result.minutes,
        streak: stats.data?.current_streak_days ?? null,
      }}
      week={week}
      missions={
        todayMissions.data
          ? liveMissionsSummary(
              todayMissions.data,
              missionQuizHref(topics.data, todayMissions.data.quiz_questions),
              harvestHref(activeBed.data),
            )
          : stats.data && activity.data
            ? missionsSummary(
                thirstyMission(activity.data, todayIso, stats.data.due_now, result.watered),
              )
            : null
      }
      reminder={reminderRow && { ...reminderRow, on: reminder.on }}
      onReminderChange={(on) => void reminder.change(on)}
    />
  );
}
