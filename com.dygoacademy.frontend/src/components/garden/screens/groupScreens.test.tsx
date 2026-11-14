import { fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

import vi_messages from '../../../../messages/vi-VN.json';

import { groupFixtures } from './groupFixtures';
import { JoinGardenScreen } from './JoinGardenScreen';
import { SharedGardensScreen } from './SharedGardensScreen';
import { TendGardenScreen } from './TendGardenScreen';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

/** UI-G screens GR1, GR3/GR4 and GR6 (props only). */

const fx = groupFixtures('en-US');

describe('SharedGardensScreen', () => {
  const props = {
    gardens: fx.list.gardens.map((garden) => ({
      id: garden.id,
      href: `/groups/${garden.id}`,
      name: garden.name,
      role: garden.role,
      meta: 'meta',
      plant: garden.plant,
      avatars: garden.avatars,
      due: garden.due,
    })),
    gardeners: 25,
    rainDay: null,
    start: { onClick: vi.fn() },
    join: { onClick: vi.fn() },
  };

  it('counts gardens and gardeners and marks the Groups tab', () => {
    renderWithIntl(<SharedGardensScreen {...props} />);
    expect(screen.getByText('3 gardens · 25 gardeners')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Shared Gardens');
    expect(screen.getByRole('link', { name: 'Groups' }).getAttribute('aria-current')).toBe('page');
    fireEvent.click(screen.getByRole('button', { name: 'Create a garden' }));
    expect(props.start.onClick).toHaveBeenCalled();
  });

  it('shows the empty state', () => {
    renderWithIntl(<SharedGardensScreen {...props} gardens={[]} />);
    expect(screen.getByText('No shared gardens yet')).toBeTruthy();
  });

  it('speaks Vietnamese from vi-VN.json', () => {
    render(
      <NextIntlClientProvider locale="vi-VN" messages={vi_messages}>
        <SharedGardensScreen {...props} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText('3 vườn · 25 người làm vườn')).toBeTruthy();
    expect(screen.getByText('Tham gia bằng liên kết')).toBeTruthy();
  });
});

describe('TendGardenScreen', () => {
  const base = {
    groupName: 'IELTS Sprint · Week 3',
    backHref: '/groups/g1',
    trickyHref: '/groups/g1/manage',
    gardenersHref: '/groups/g1/manage?tab=gardeners',
  };

  it('shows totals only and picks the rain-day size', () => {
    const onSize = vi.fn();
    const onStart = vi.fn();
    renderWithIntl(
      <TendGardenScreen
        {...base}
        tab="tricky"
        tricky={{
          rows: fx.tricky.rows,
          rainDay: { members: 5, size: 10, onSize, onStart, last: null },
        }}
      />,
    );
    expect(screen.getByRole('tab', { name: 'Tricky patches' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('14 misses · 4 gardeners')).toBeTruthy();
    const sizes = screen.getByRole('group', { name: 'Words per gardener' });
    expect(within(sizes).getByRole('button', { name: '10 words' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(within(sizes).getByRole('button', { name: '20 words' }));
    expect(onSize).toHaveBeenCalledWith(20);
    fireEvent.click(screen.getByRole('button', { name: 'Start rain day · 10 words each' }));
    expect(onStart).toHaveBeenCalled();
    expect(screen.getByText('Sends a notification to 5 gardeners · tricky words come first')).toBeTruthy();
  });

  it('SE6: the Echo challenge shows totals only and trims tricky patches to 2 rows', () => {
    renderWithIntl(
      <TendGardenScreen
        {...base}
        tab="tricky"
        tricky={{
          rows: fx.tricky.rows,
          rainDay: { members: 5, size: 10, last: null },
          echo: { word: 'deteriorate', ipa: '/dɪˈtɪəriəreɪt/', done: 3, members: 5, href: '/sounds?word=w1' },
        }}
      />,
    );
    const echo = screen.getByRole('region', { name: 'Echo challenge' });
    expect(within(echo).getByText('3 of 5 gardeners done')).toBeTruthy();
    expect(within(echo).getByText('Totals only, never names.')).toBeTruthy();
    expect(within(echo).getByRole('link', { name: 'Say it' }).getAttribute('href')).toBe('/sounds?word=w1');
    const tricky = screen.getByRole('tabpanel', { name: 'Tricky patches' });
    expect(within(tricky).getAllByRole('listitem')).toHaveLength(2);
  });

  it('lists gardeners with the role legend and the invite links', () => {
    renderWithIntl(
      <TendGardenScreen
        {...base}
        tab="gardeners"
        gardeners={{
          rows: [{ id: 'u1', name: 'Minh', initial: 'M', tone: 'forest', isYou: true, joined: 'Joined 2 Sep', role: 'ADMIN' }],
          invites: { count: 2, detail: 'Viewer · 3 of 20 used · expires 3 Oct' },
          invite: { onClick: vi.fn() },
        }}
      />,
    );
    expect(screen.getByRole('tab', { name: 'Gardeners' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('2 active invite links')).toBeTruthy();
    expect(screen.getByText(/looks after members and rain days/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Invite' })).toBeTruthy();
  });
});

describe('JoinGardenScreen', () => {
  it('shows who invited you, the counts and your role, never the members', () => {
    const onClick = vi.fn();
    renderWithIntl(
      <JoinGardenScreen
        groupName={fx.join.name}
        description={fx.join.description}
        inviter={fx.join.inviter}
        counts={fx.join.counts}
        role="READ"
        closeHref="/garden"
        join={{ onClick }}
        notNowHref="/garden"
      />,
    );
    expect(screen.getByText('Minh invited you to')).toBeTruthy();
    expect(screen.getByText('126')).toBeTruthy();
    expect(screen.getByText('shared beds')).toBeTruthy();
    expect(screen.getByText('Viewer').tagName).toBe('B');
    fireEvent.click(screen.getByRole('button', { name: 'Join the garden' }));
    expect(onClick).toHaveBeenCalled();
  });
});
