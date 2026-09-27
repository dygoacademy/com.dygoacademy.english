'use client';

import { useTimeZone } from 'next-intl';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useGroupGarden } from '@/hooks/useGroupGarden';
import { useGroups } from '@/hooks/useGroups';

import { WeeklyHarvestScreen } from '../screens/WeeklyHarvestScreen';
import { todayIn, useGardenFormat, weekDays } from '../format';

/**
 * /garden/missions: Weekly harvest (A4). Missions, streak freezes and
 * goals arrive with UI-6, so those blocks show their "coming soon" state.
 * NAV-1: the group card is the learner's first group (GET /groups, the
 * shared `['groups']` query) with its garden's totals (GET
 * /groups/:id/garden: watered today, gardeners, shared words), and links
 * to that garden. No group, or its garden not loaded (yet): no card.
 */
export function HarvestLive() {
  const timeZone = useTimeZone();
  const { weekStart } = useGardenFormat();
  const firstDay = weekDays(todayIn(timeZone), weekStart)[0];
  const groupId = useGroups().data?.[0]?.id ?? '';
  const garden = useGroupGarden(groupId, timeZone).data;
  return (
    <WeeklyHarvestScreen
      weekStart={firstDay}
      harvest={null}
      goal={null}
      freezes={null}
      group={
        groupId && garden
          ? {
              name: garden.name,
              href: GARDEN_ROUTES.group(groupId),
              watered: garden.watered_today,
              members: garden.member_count,
              sharedWords: garden.word_count,
              avatars: [],
            }
          : null
      }
    />
  );
}
