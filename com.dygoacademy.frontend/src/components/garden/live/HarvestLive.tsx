'use client';

import { useTimeZone } from 'next-intl';

import { useWeeklyMissions } from '@/hooks/useMissions';

import { WeeklyHarvestScreen } from '../screens/WeeklyHarvestScreen';
import { todayIn, weekDays } from '../format';
import { weeklyRows } from './data';

/**
 * /missions: This week (A4, 2026-10-17). The 3 weekly missions come from
 * GET /missions/weekly (Monday to Sunday in the learner's time zone, so
 * the page's week starts on Monday in every language); each row links to
 * the screen where the practice happens (`weeklyRows`). The call failing
 * (or loading) leaves the card out. No seed packs exist yet, and the
 * vocabulary goal stays "coming soon": no target band exists yet.
 */
export function HarvestLive() {
  const timeZone = useTimeZone();
  const today = todayIn(timeZone);
  const days = weekDays(today, 1);
  const weekly = useWeeklyMissions(timeZone).data;
  return (
    <WeeklyHarvestScreen
      weekStart={days[0]}
      daysLeft={weekly?.daysLeft ?? 6 - Math.round((today.getTime() - days[0].getTime()) / 86_400_000)}
      weekly={
        weekly
          ? {
              missions: weeklyRows(weekly),
              wilting: weekly.wilting,
              sound: weekly.sound,
              rewardEarned: weekly.rewardEarned,
            }
          : null
      }
      seedPack={null}
      goal={null}
    />
  );
}
