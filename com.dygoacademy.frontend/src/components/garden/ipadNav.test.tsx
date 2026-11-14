import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { isGardenIpadNavOn } from '@/constants/garden';
import { renderWithIntl } from '@/test/render';

import { AccountSheet } from './AccountSheet';
import { GardenSidebarList, GardenSidebarStreak } from './GardenSidebarList';
import { GroupsTabProvider } from './groupsTab';
import { ReviewCard } from './ReviewCard';
import { BED, HOME, ME, REVIEW } from './screens/fixtures';
import { GardenTabBar, IPAD_NAV_COLUMN, SCREEN_CLASSES } from './screens/GardenTabBar';
import { MeScreen } from './screens/MeScreen';
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
    expect(IPAD_NAV_COLUMN).toContain('ipad:max-w-[720px]');
    expect(IPAD_NAV_COLUMN).toContain('ipad-lg:max-w-[960px]');
    expect(IPAD_NAV_COLUMN.split(' ').every((c) => c.startsWith('ipad'))).toBe(true);
  });

  it('Today: hero 5/8 + missions 3/8 on iPad, hero full width then 6/12 rows in landscape', () => {
    const { container } = renderWithIntl(<TodaysGardenScreen {...HOME} />);
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
    // Same labeled Add word button with the seed icon as on the phone.
    const add = screen.getByRole('button', { name: 'Add word' });
    expect(add.querySelector('svg')?.getAttribute('viewBox')).toBe('2 2 20 20');
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

/** iA8 iPad Profile (canvas `reference/iA8-me`, `-account`). */
describe('iA8 iPad Profile', () => {
  it('sidebar: the Dygo mark, titled shared gardens with avatars, the streak card at the bottom', () => {
    renderWithIntl(
      <GardenTabBar
        active="me"
        ipadNav
        sidebar={
          <GardenSidebarList
            heading
            label="Shared gardens"
            items={[
              {
                id: 'g',
                href: '/groups/g',
                label: 'IELTS Sprint',
                avatar: 'I',
                badge: '5',
              },
            ]}
          />
        }
        sidebarFooter={<GardenSidebarStreak title="23-day streak" detail="Rain barrel · 2 left" />}
      />,
    );
    const sidebar = document.querySelector('[data-garden-nav="sidebar"]')!;
    expect(sidebar.textContent).toContain('Dygo');
    expect(sidebar.className).toContain('w-[264px]');
    const section = screen.getByRole('region', { name: 'Shared gardens' });
    expect(section.querySelector('h2')?.textContent).toBe('Shared gardens');
    expect(screen.getByRole('link', { name: /IELTS Sprint/ }).textContent).toBe('IIELTS Sprint5');
    expect(sidebar.lastElementChild?.className).toContain('mt-auto');
    expect(sidebar.lastElementChild?.textContent).toBe('23-day streakRain barrel · 2 left');
    const profile = screen.getAllByRole('link', { name: 'Profile' });
    expect(profile.some((link) => link.className.includes('bg-forest'))).toBe(true);
  });

  it('Me: the grid dissolves into stats across, calendar 1.7fr beside keepsakes, settings across', () => {
    const { container } = renderWithIntl(<MeScreen {...ME} />);
    const grid = container.querySelector('.ipad-lg\\:grid-cols-\\[1\\.7fr_1fr\\]');
    expect(grid).toBeTruthy();
    const stats = grid!.querySelector('.ipad-lg\\:col-span-2');
    expect(stats?.className).toContain('grid-cols-4');
  });

  it('Me: the gear hands itself to onAccountClick, so the popover can hang under it', async () => {
    const onAccountClick = vi.fn();
    renderWithIntl(<MeScreen {...ME} onAccountClick={onAccountClick} />);
    const gear = screen.getByRole('button', { name: 'Account' });
    gear.click();
    expect(onAccountClick).toHaveBeenCalledWith(gear);
  });

  it('Account: a popover in landscape, with a caret, a clear backdrop and no Cancel', () => {
    renderWithIntl(
      <AccountSheet
        open
        onOpenChange={() => {}}
        name="Minh"
        email="minh@example.com"
        onSignOut={() => {}}
      />,
    );
    const dialog = screen.getByRole('dialog', { name: 'Account' });
    expect(dialog.className).toContain('ipad-lg:w-[340px]');
    expect(dialog.className).toContain('ipad-lg:top-[var(--account-top,100px)]');
    expect(screen.getByRole('button', { name: 'Cancel' }).className).toContain('ipad-lg:hidden');
  });
});
