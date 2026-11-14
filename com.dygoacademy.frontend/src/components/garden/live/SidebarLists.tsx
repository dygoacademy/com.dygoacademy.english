'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useGroups } from '@/hooks/useGroups';
import { useSrsStats } from '@/hooks/useSrsStats';
import { useTopics } from '@/hooks/useTopics';

import { GardenSidebarList, GardenSidebarStreak } from '../GardenSidebarList';
import { sortBedsByDue, toScreenTopic, type GardenTopicSummary } from './data';

/**
 * UI-7 U7-2: the master lists of the iPad master–detail views (design
 * system §10, A6 and the shared gardens), passed to the screens'
 * `sidebar`. GardenSidebar only mounts them with the iPad nav on, and
 * they fetch only at `lg` (where the sidebar shows), so iPhones and iPad
 * portrait don't load a list they can't see. React Query shares the cache
 * with /topics and /groups.
 */
const LG_QUERY = '(min-width: 1024px)';

function useIsLg(): boolean {
  return React.useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(LG_QUERY);
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    () => window.matchMedia(LG_QUERY).matches,
    () => false,
  );
}

export function TopicBedsSidebar({ activeId = null }: { activeId?: string | null }) {
  return useIsLg() ? <TopicBedsList activeId={activeId} /> : null;
}

function TopicBedsList({ activeId }: { activeId: string | null }) {
  const t = useTranslations('screens.topics');
  const topics = useTopics();
  const beds = sortBedsByDue(
    ((topics.data ?? []) as GardenTopicSummary[]).map((topic) => toScreenTopic(topic, t('shared'))),
  );
  return (
    <GardenSidebarList
      label={t('title')}
      activeId={activeId}
      items={beds.map((bed) => ({
        id: bed.id,
        href: bed.href,
        label: bed.title,
        badge: bed.due ? t('due', { count: bed.due }) : null,
      }))}
    />
  );
}

/**
 * `heading` (iA8 Profile): the board's "Shared gardens" list, titled, each
 * garden with its letter avatar. The board's count badge has no source in
 * GET /groups yet, so it is left out.
 */
export function SharedGardensSidebar({
  activeId = null,
  heading = false,
}: {
  activeId?: string | null;
  heading?: boolean;
}) {
  return useIsLg() ? <SharedGardensList activeId={activeId} heading={heading} /> : null;
}

function SharedGardensList({ activeId, heading }: { activeId: string | null; heading: boolean }) {
  const t = useTranslations('screens.groups.list');
  const tabs = useTranslations('components.tabBar');
  const groups = useGroups();
  return (
    <GardenSidebarList
      label={heading ? tabs('sharedGardens') : t('title')}
      heading={heading}
      activeId={activeId}
      items={(groups.data ?? []).map((group) => ({
        id: group.id,
        href: GARDEN_ROUTES.group(group.id),
        label: group.name,
        avatar: heading ? group.name.trim().slice(0, 1).toUpperCase() || undefined : undefined,
      }))}
    />
  );
}

/** iA8: the streak card at the bottom of the sidebar, from GET /srs/stats (only at `lg`). */
export function StreakSidebarCard() {
  return useIsLg() ? <StreakCard /> : null;
}

function StreakCard() {
  const t = useTranslations('components.tabBar');
  const stats = useSrsStats();
  if (!stats.data) return null;
  return (
    <GardenSidebarStreak
      title={t('streak', { count: stats.data.current_streak_days })}
      detail={t('barrel', { count: stats.data.freezes?.available ?? 0 })}
    />
  );
}
