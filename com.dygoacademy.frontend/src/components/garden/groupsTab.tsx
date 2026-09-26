'use client';

import * as React from 'react';

/**
 * Whether the learner is in at least one shared garden, for the tab bar.
 * The live garden layout provides it (`GroupsTabLive`); without a provider
 * it's false, so reference pages and tests keep the canvas's four tabs.
 */
const GroupsTabContext = React.createContext(false);

export function GroupsTabProvider({
  value,
  children,
}: {
  value: boolean;
  children: React.ReactNode;
}) {
  return <GroupsTabContext.Provider value={value}>{children}</GroupsTabContext.Provider>;
}

export function useGroupsTab(): boolean {
  return React.useContext(GroupsTabContext);
}
