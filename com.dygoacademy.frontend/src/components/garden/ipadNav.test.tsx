import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { isGardenIpadNavOn } from '@/constants/garden';
import { renderWithIntl } from '@/test/render';

import { GardenSidebarList } from './GardenSidebarList';
import { GroupsTabProvider } from './groupsTab';
import { ReviewCard } from './ReviewCard';
import { BED, HOME, REVIEW } from './screens/fixtures';
import { GardenTabBar, IPAD_NAV_COLUMN, SCREEN_CLASSES } from './screens/GardenTabBar';
import { TodaysGardenScreen } from './screens/TodaysGardenScreen';
import { TopicBedScreen } from './screens/TopicBedScreen';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

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

/**
 * UI-7 U7-2: the iPad layouts (design system §10) use the `ipad:` /
 * `ipad-lg:` variants, which only apply under GardenRoot's
 * data-garden-ipad; the phone classes stay as they were.
 */
describe('iPad layouts', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('keeps the phone column and adds room for the rail / sidebar only on nav screens', () => {
    expect(SCREEN_CLASSES).toBe(
      'mx-auto flex min-h-screen-dvh w-full max-w-[560px] flex-col bg-bg text-text',
    );
    expect(IPAD_NAV_COLUMN).toContain('ipad:pl-20');
    expect(IPAD_NAV_COLUMN).toContain('ipad-lg:pl-60');
    expect(IPAD_NAV_COLUMN.split(' ').every((c) => c.startsWith('ipad'))).toBe(true);
  });

  it('Today: hero 5/8 + missions 3/8 on iPad, hero full width then 6/12 rows in landscape', () => {
    const { container } = renderWithIntl(
      <TodaysGardenScreen {...HOME} action={{ ...HOME.action, href: '/review' }} />,
    );
    const grid = container.querySelector('.ipad\\:grid-cols-8');
    expect(grid?.className).toContain('contents');
    expect(grid?.className).toContain('ipad-lg:grid-cols-12');
    const missions = container.querySelector('section.ipad-lg\\:col-span-6');
    expect(missions?.querySelector('ul')).toBeTruthy();
    expect(missions?.parentElement?.className).toContain('ipad:col-span-3');
  });

  it('Review card: two panes in landscape, answer on the right, same reading order', () => {
    const { container } = renderWithIntl(<ReviewCard {...REVIEW.card} revealed />);
    const card = container.querySelector('article')!;
    expect(card.className).toContain('ipad-lg:grid-cols-12');
    const answer = screen.getByText(REVIEW.card.meaning).closest('.rise');
    expect(answer?.className).toContain('ipad-lg:col-span-7');
    // Word before meaning in the DOM (VoiceOver order).
    const word = screen.getByText(REVIEW.card.word);
    expect(word.compareDocumentPosition(answer!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('Topic bed: no nav with the flag off; rail + sidebar (no tab bar) with it on', () => {
    const props = {
      ...BED,
      backHref: '/topics',
      water: null,
      quizHref: '/quiz',
      addWordHref: '/add',
      sidebar: <GardenSidebarList label="Topics" items={[]} />,
    };
    const off = renderWithIntl(<TopicBedScreen {...props} />);
    expect(off.container.querySelector('[data-garden-nav]')).toBeNull();
    expect(off.container.querySelector('ul.ipad\\:grid-cols-2')).toBeTruthy();
    off.unmount();

    vi.stubEnv('NEXT_PUBLIC_GARDEN_IPAD_NAV', 'true');
    const on = renderWithIntl(<TopicBedScreen {...props} />);
    const navs = Array.from(on.container.querySelectorAll('[data-garden-nav]'));
    expect(navs.map((nav) => nav.getAttribute('data-garden-nav'))).toEqual(['rail', 'sidebar']);
    expect(screen.getAllByRole('navigation')).toHaveLength(2);
  });

  it('sidebar master list: the open item is current; empty renders nothing', () => {
    renderWithIntl(
      <GardenTabBar
        active="topics"
        ipadNav
        bar={false}
        sidebar={
          <GardenSidebarList
            label="Beds"
            activeId="b"
            items={[
              { id: 'a', href: '/topics/a', label: 'Travel', badge: '3 due' },
              { id: 'b', href: '/topics/b', label: 'Work' },
            ]}
          />
        }
      />,
    );
    const list = screen.getByRole('list', { name: 'Beds' });
    expect(list.closest('[data-garden-nav]')?.getAttribute('data-garden-nav')).toBe('sidebar');
    expect(screen.getByRole('link', { name: 'Work' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: /Travel/ }).getAttribute('aria-current')).toBeNull();
    expect(screen.getByText('3 due')).toBeTruthy();

    const { container } = renderWithIntl(<GardenSidebarList label="None" items={[]} />);
    expect(container.innerHTML).toBe('');
  });
});
