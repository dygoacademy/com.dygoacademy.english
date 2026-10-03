'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { GARDEN_ROUTES } from '@/constants/garden';
import { useGroups } from '@/hooks/useGroups';
import { useTopics } from '@/hooks/useTopics';

import { GardenSidebarList } from '../GardenSidebarList';
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
    ((topics.data ?? []) as GardenTopicSummary[]).map((topic) =>
      toScreenTopic(topic, t('library'), t('shared')),
    ),
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

export function SharedGardensSidebar({ activeId = null }: { activeId?: string | null }) {
  return useIsLg() ? <SharedGardensList activeId={activeId} /> : null;
}

function SharedGardensList({ activeId }: { activeId: string | null }) {
  const t = useTranslations('screens.groups.list');
  const groups = useGroups();
  return (
    <GardenSidebarList
      label={t('title')}
      activeId={activeId}
      items={(groups.data ?? []).map((group) => ({
        id: group.id,
        href: GARDEN_ROUTES.group(group.id),
        label: group.name,
      }))}
    />
  );
}
