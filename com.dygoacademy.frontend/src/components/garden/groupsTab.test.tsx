import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithIntl } from '@/test/render';

import { GroupsTabProvider } from './groupsTab';
import { GardenTabBar } from './screens/GardenTabBar';

/** UI-G, plan decision 9: the fifth tab only for people in a shared garden. */

describe('GardenTabBar', () => {
  it('keeps four tabs without a group, and adds Groups for group members', () => {
    const { rerender } = renderWithIntl(<GardenTabBar active="garden" />);
    expect(screen.getByRole('navigation').querySelectorAll('a')).toHaveLength(4);
    rerender(
      <GroupsTabProvider value>
        <GardenTabBar active="garden" />
      </GroupsTabProvider>,
    );
    const links = screen.getByRole('navigation').querySelectorAll('a');
    expect(links).toHaveLength(5);
    expect(links[3].textContent).toBe('Groups');
    expect(links[3].getAttribute('href')).toBe('/groups');
  });
});
