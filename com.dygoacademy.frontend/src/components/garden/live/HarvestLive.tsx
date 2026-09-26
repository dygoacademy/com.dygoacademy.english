'use client';

import { useTimeZone } from 'next-intl';

import { GARDEN_ROUTES } from '@/constants/garden';

import { useGroupsTab } from '../groupsTab';
import { WeeklyHarvestScreen } from '../screens/WeeklyHarvestScreen';
import { todayIn, useGardenFormat, weekDays } from '../format';

/**
 * /garden/missions: Weekly harvest (A4). Everything on this screen is
 * built from daily missions, streak freezes, goals and groups, which
 * arrive with UI-6, so every block shows its "coming soon" state; only
 * the week heading is real. UI-G: for a learner in a shared garden the
 * group card opens /garden/groups.
 */
export function HarvestLive() {
  const timeZone = useTimeZone();
  const { weekStart } = useGardenFormat();
  const firstDay = weekDays(todayIn(timeZone), weekStart)[0];
  const inGroups = useGroupsTab();
  return (
    <WeeklyHarvestScreen
      weekStart={firstDay}
      harvest={null}
      goal={null}
      freezes={null}
      group={null}
      groupHref={inGroups ? GARDEN_ROUTES.groups : undefined}
    />
  );
}
