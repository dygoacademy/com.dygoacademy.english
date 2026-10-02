import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { isGardenIpadNavOn } from '@/constants/garden';
import { renderWithIntl } from '@/test/render';

import { GroupsTabProvider } from './groupsTab';
import { GardenTabBar } from './screens/GardenTabBar';

/** UI-3 U3-2: iPad rail / sidebar behind NEXT_PUBLIC_GARDEN_IPAD_NAV. */

describe('isGardenIpadNavOn', () => {
  it('is on only for the literal "true"', () => {
    expect(isGardenIpadNavOn('true')).toBe(true);
    expect(isGardenIpadNavOn(undefined)).toBe(false);
    expect(isGardenIpadNavOn('')).toBe(false);
    expect(isGardenIpadNavOn('1')).toBe(false);
    expect(isGardenIpadNavOn('TRUE')).toBe(false);
  });
});

describe('GardenTabBar iPad switch', () => {
  it('renders only the bottom tab bar with the flag off (unchanged)', () => {
    renderWithIntl(<GardenTabBar active="garden" ipadNav={false} />);
    const navs = screen.getAllByRole('navigation');
    expect(navs).toHaveLength(1);
    expect(navs[0].className).not.toContain('md:hidden');
    expect(document.querySelector('[data-garden-nav]')).toBeNull();
  });

  it('adds the rail and sidebar with the same tabs when on, tab bar hidden from 600px', () => {
    renderWithIntl(
      <GroupsTabProvider value>
        <GardenTabBar active="topics" ipadNav />
      </GroupsTabProvider>,
    );
    const navs = screen.getAllByRole('navigation');
    expect(navs).toHaveLength(3);
    const [tabBar, rail, sidebar] = navs;
    expect(tabBar.className).toContain('md:hidden');
    expect(rail.getAttribute('data-garden-nav')).toBe('rail');
    expect(rail.className).toContain('md:flex');
    expect(rail.className).toContain('lg:hidden');
    expect(sidebar.getAttribute('data-garden-nav')).toBe('sidebar');
    expect(sidebar.className).toContain('lg:flex');

    const hrefs = (nav: HTMLElement) =>
      Array.from(nav.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs(tabBar)).toHaveLength(5);
    expect(hrefs(rail)).toEqual(hrefs(tabBar));
    expect(hrefs(sidebar)).toEqual(hrefs(tabBar));
    for (const nav of navs) {
      const current = nav.querySelector('[aria-current="page"]');
      expect(current?.getAttribute('href')).toBe('/topics');
    }
  });
});
