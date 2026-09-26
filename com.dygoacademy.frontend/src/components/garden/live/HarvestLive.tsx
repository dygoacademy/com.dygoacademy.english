'use client';

import { useTimeZone } from 'next-intl';

import { WeeklyHarvestScreen } from '../screens/WeeklyHarvestScreen';
import { todayIn, useGardenFormat, weekDays } from '../format';

/**
 * /garden/missions: Weekly harvest (A4). Everything on this screen is
 * built from daily missions, streak freezes, goals and groups, which
 * arrive with UI-6, so every block shows its "coming soon" state; only
 * the week heading is real.
 */
export function HarvestLive() {
  const timeZone = useTimeZone();
  const { weekStart } = useGardenFormat();
  const firstDay = weekDays(todayIn(timeZone), weekStart)[0];
  return (
    <WeeklyHarvestScreen
      weekStart={firstDay}
      harvest={null}
      goal={null}
      freezes={null}
      group={null}
    />
  );
}
