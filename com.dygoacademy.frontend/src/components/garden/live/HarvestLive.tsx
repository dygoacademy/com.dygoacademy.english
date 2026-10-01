'use client';

import { useTimeZone } from 'next-intl';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useGroupGarden } from '@/hooks/useGroupGarden';
import { useGroups } from '@/hooks/useGroups';
import { useWeekMissions } from '@/hooks/useMissions';
import { useSrsStats } from '@/hooks/useSrsStats';

import { WeeklyHarvestScreen } from '../screens/WeeklyHarvestScreen';
import { todayIn, useGardenFormat, weekDays } from '../format';
import { weekHarvest } from './data';

/**
 * /garden/missions: Weekly harvest (A4). U6-6: the harvest is the calendar
 * week's missions per day from GET /missions/week (Golden Blooms = 3/3
 * days); the rain barrel shows `freezes.available` from GET /srs/stats.
 * Either call failing (or loading) keeps that block's "coming soon" state.
 * The vocabulary goal stays "coming soon": no target band exists yet.
 * NAV-1: the group card is the learner's first group (GET /groups, the
 * shared `['groups']` query) with its garden's totals (GET
 * /groups/:id/garden: watered today, gardeners, shared words), and links
 * to that garden. No group, or its garden not loaded (yet): no card.
 */
export function HarvestLive() {
  const timeZone = useTimeZone();
  const { weekStart } = useGardenFormat();
  const today = todayIn(timeZone);
  const days = weekDays(today, weekStart);
  const week = useWeekMissions(timeZone).data;
  const freezes = useSrsStats().data?.freezes;
  const groupId = useGroups().data?.[0]?.id ?? '';
  const garden = useGroupGarden(groupId, timeZone).data;
  return (
    <WeeklyHarvestScreen
      weekStart={days[0]}
      harvest={week ? weekHarvest(week, days, today) : null}
      goal={null}
      freezes={freezes ? freezes.available : null}
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
