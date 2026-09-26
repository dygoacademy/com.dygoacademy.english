import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

import { avatarTone, initialOf } from './GardenerAvatar';
import { GardenerRow } from './GardenerRow';
import { GroupCard } from './GroupCard';
import { InviteSheetBody } from './InviteSheet';
import { RainDayBanner } from './RainDayBanner';
import { RoleBadge } from './RoleBadge';
import { groupFixtures } from './screens/groupFixtures';
import { TrickyPatchRow } from './TrickyPatchRow';

/** UI-G components (canvas GR1–GR7). */

const fx = groupFixtures('en');

describe('avatars', () => {
  it('gives a user the same tone every time and takes the first letter', () => {
    expect(avatarTone('user-1')).toBe(avatarTone('user-1'));
    expect(initialOf(' linh tran')).toBe('L');
    expect(initialOf(null)).toBe('?');
  });
});

describe('RoleBadge', () => {
  it('uses the plain role names (decision 11)', () => {
    renderWithIntl(
      <>
        <RoleBadge role="ADMIN" />
        <RoleBadge role="WRITE" />
        <RoleBadge role="READ" />
      </>,
    );
    expect(screen.getByText('Admin')).toBeTruthy();
    expect(screen.getByText('Editor')).toBeTruthy();
    expect(screen.getByText('Viewer')).toBeTruthy();
  });
});

describe('GroupCard', () => {
  const card = {
    href: '/garden/groups/g1',
    name: 'IELTS Sprint · Week 3',
    role: 'ADMIN' as const,
    meta: '5 gardeners · 3 shared beds · 126 words',
    plant: 'tree' as const,
    avatars: fx.list.gardens[0].avatars,
  };

  it('links to the garden and shows your due words', () => {
    renderWithIntl(<GroupCard {...card} due={5} />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/garden/groups/g1');
    expect(within(link).getByText('5 due for you')).toBeTruthy();
    expect(within(link).getByText('Admin')).toBeTruthy();
  });

  it('says "All watered" at zero and nothing when unknown', () => {
    const { rerender } = renderWithIntl(<GroupCard {...card} due={0} />);
    expect(screen.getByText('All watered')).toBeTruthy();
    rerender(<GroupCard {...card} due={null} />);
    expect(screen.queryByText('All watered')).toBeNull();
    expect(screen.queryByText(/due for you/)).toBeNull();
  });
});

describe('RainDayBanner', () => {
  it('has a Water link in both variants', () => {
    renderWithIntl(
      <>
        <RainDayBanner variant="forest" title="IELTS Sprint · water 10 words" detail="3 of 5 done" waterHref="/garden/review" />
        <RainDayBanner variant="water" title="Rain day · water 10 words" detail="you: 4 of 10" waterHref="/garden/review" />
      </>,
    );
    expect(screen.getAllByRole('link', { name: 'Water' })).toHaveLength(2);
    expect(screen.getByText('Rain day today')).toBeTruthy();
  });
});

describe('TrickyPatchRow', () => {
  it('scales the bar and clamps it to 0–100', () => {
    const { container } = renderWithIntl(
      <ul>
        <TrickyPatchRow word="mitigate" meta="11 misses · 3 gardeners" share={78.6} />
        <TrickyPatchRow word="drought" meta="9 misses" share={140} />
      </ul>,
    );
    const bars = container.querySelectorAll<HTMLDivElement>('[aria-hidden="true"] > div');
    expect(bars[0].style.width).toBe('79%');
    expect(bars[1].style.width).toBe('100%');
  });
});

describe('GardenerRow', () => {
  const row = {
    name: 'Linh Tran',
    initial: 'L',
    tone: 'flower' as const,
    joined: 'Joined 4 Sep',
    role: 'WRITE' as const,
  };

  it('changes a role through the labelled picker', () => {
    const onChange = vi.fn();
    renderWithIntl(
      <ul>
        <GardenerRow {...row} onChange={onChange} />
      </ul>,
    );
    const picker = screen.getByRole('combobox', { name: "Change Linh Tran's role" });
    fireEvent.change(picker, { target: { value: 'READ' } });
    expect(onChange).toHaveBeenCalledWith('READ');
    expect(within(picker).getByRole('option', { name: 'Remove from garden' })).toBeTruthy();
  });

  it('has no remove option on your own row, and is disabled when locked', () => {
    renderWithIntl(
      <ul>
        <GardenerRow {...row} name="Minh" isYou locked onChange={vi.fn()} />
      </ul>,
    );
    const picker = screen.getByRole('combobox', { name: "Change Minh's role" }) as HTMLSelectElement;
    expect(picker.disabled).toBe(true);
    expect(within(picker).queryByRole('option', { name: 'Remove from garden' })).toBeNull();
    expect(screen.getByText('(you)')).toBeTruthy();
  });
});

describe('InviteSheetBody', () => {
  it('is a radio group of roles with the role hint', () => {
    const onRoleChange = vi.fn();
    renderWithIntl(
      <InviteSheetBody role="READ" onRoleChange={onRoleChange} expires="In 7 days" uses="20 times" link={null} linkPlaceholder="The link is made when you copy or share it" />,
    );
    const group = screen.getByRole('radiogroup', { name: 'Role for new gardeners' });
    expect(within(group).getByRole('radio', { name: 'Viewer' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(within(group).getByRole('radio', { name: 'Editor' }));
    expect(onRoleChange).toHaveBeenCalledWith('WRITE');
    expect(screen.getByText('Waters the shared beds')).toBeTruthy();
    expect(screen.getByText('The link is made when you copy or share it')).toBeTruthy();
  });

  it('copies and shares', () => {
    const onCopy = vi.fn();
    const onShare = vi.fn();
    renderWithIntl(
      <InviteSheetBody role="ADMIN" expires="Never" uses="No limit" link="dygoacademy.com/join/x" onCopy={onCopy} onShare={onShare} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    fireEvent.click(screen.getByRole('button', { name: 'Share…' }));
    expect(onCopy).toHaveBeenCalled();
    expect(onShare).toHaveBeenCalled();
    expect(screen.getByText('dygoacademy.com/join/x')).toBeTruthy();
  });
});
