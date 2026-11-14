import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithIntl } from '@/test/render';

import { BottomTabBar } from './BottomTabBar';

const ITEMS = [
  { key: 'garden', href: '/garden', label: 'Garden', icon: null },
  { key: 'missions', href: '/missions', label: 'Missions', icon: null },
  { key: 'topics', href: '/topics', label: 'Topics', icon: null },
  { key: 'me', href: '/me', label: 'Me', icon: null },
];

describe('BottomTabBar', () => {
  it('is a labelled nav with four links, and marks only the active one', () => {
    renderWithIntl(<BottomTabBar items={ITEMS} activeKey="topics" />);
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    const links = nav.querySelectorAll('a');
    expect(links).toHaveLength(4);
    expect(screen.getByRole('link', { name: 'Topics' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Garden' }).getAttribute('aria-current')).toBeNull();
  });
});
