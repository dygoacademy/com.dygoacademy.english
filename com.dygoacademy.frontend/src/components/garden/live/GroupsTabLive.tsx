'use client';

import { useGroups } from '@/hooks/useGroups';

import { GroupsTabProvider } from '../groupsTab';

/**
 * Plan decision 9 (UI-G): the tab bar's fifth tab, "Groups", only for a
 * learner in at least one shared garden. Wraps the live garden pages
 * (the (garden) layout) and reads `GET /groups` once through the shared
 * `['groups']` query, so the group pages reuse the same cache. While it
 * loads, or if it fails, the bar keeps four tabs.
 */
export function GroupsTabLive({ children }: { children: React.ReactNode }) {
  const groups = useGroups();
  return <GroupsTabProvider value={(groups.data?.length ?? 0) > 0}>{children}</GroupsTabProvider>;
}
