import { fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

import messages from '../../../../messages/en-US.json';

import {
  BED,
  HARVEST,
  HOME,
  ME,
  REFERENCE_NAMES,
  REVIEW,
  TOPICS,
  TOPICS_ACADEMIC_FILTER,
  TOPICS_LOCKED_PACK,
  isReferenceName,
} from './fixtures';
import { MeScreen } from './MeScreen';
import { ReviewScreen } from './ReviewScreen';
import { TodaysGardenScreen } from './TodaysGardenScreen';
import { TopicBedScreen } from './TopicBedScreen';
import { TopicsScreen } from './TopicsScreen';
import { WeeklyHarvestScreen } from './WeeklyHarvestScreen';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

describe('reference fixtures', () => {
  it('lists the 20 canvas references (11 adult screens, 7 group screens, 2 sign-in)', () => {
    expect(REFERENCE_NAMES).toHaveLength(20);
    expect(isReferenceName('AU1-sign-in-error')).toBe(true);
    expect(isReferenceName('GR5-invite')).toBe(true);
    expect(isReferenceName('A7-topic-bed-filter-sprouts')).toBe(true);
    expect(isReferenceName('A9-nope')).toBe(false);
  });
});

describe('TodaysGardenScreen', () => {
  it('renders the canvas copy from the fixture', () => {
    renderWithIntl(
      <TodaysGardenScreen {...HOME} action={{ ...HOME.action, href: '/garden/review' }} />,
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Good evening, Minh');
    expect(screen.getByText('412 words growing')).toBeTruthy();
    expect(screen.getByText('1 of 3 done')).toBeTruthy();
    expect(screen.getByText('Water 18 due words')).toBeTruthy();
    expect(screen.getByText('3 words left · about 1 min')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Garden' }).getAttribute('aria-current')).toBe('page');
  });

  it('shows "coming soon" instead of mission numbers when missions are unknown', () => {
    renderWithIntl(<TodaysGardenScreen {...HOME} missions={null} action={null} ripens={null} />);
    expect(screen.getByText(/Daily missions are coming soon/)).toBeTruthy();
    expect(screen.queryByText('1 of 3 done')).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});

describe('ReviewScreen', () => {
  const props = {
    missionTitle: 'Water 18 words',
    done: REVIEW.done,
    total: REVIEW.total,
    closeHref: '/garden',
    card: REVIEW.card,
    intervals: REVIEW.intervals,
    bloomHref: '/garden/review/done',
  };

  it('flips to the answer and the rating bar on "Show answer"', () => {
    renderWithIntl(<ReviewScreen {...props} state="question" />);
    expect(screen.queryByText(REVIEW.card.meaning)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show answer' }));
    expect(screen.getByText(REVIEW.card.meaning)).toBeTruthy();
    expect(screen.getByRole('group', { name: 'How well did you remember it?' })).toBeTruthy();
  });

  it('passes the rating up', () => {
    const onRate = vi.fn();
    renderWithIntl(<ReviewScreen {...props} state="answer" onRate={onRate} />);
    fireEvent.click(screen.getByRole('button', { name: /Good/ }));
    expect(onRate).toHaveBeenCalledWith('good');
  });

  it('shows the finished state', () => {
    renderWithIntl(<ReviewScreen {...props} state="finished" done={18} />);
    expect(screen.getByRole('heading', { name: 'All 18 watered' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'See your garden bloom' })).toBeTruthy();
  });
});

describe('WeeklyHarvestScreen', () => {
  const base = HARVEST;

  it("links the group card to that group's garden", () => {
    renderWithIntl(
      <WeeklyHarvestScreen {...base} group={{ ...HARVEST.group, href: '/garden/groups/g1' }} />,
    );
    const card = screen.getByRole('link', { name: /IELTS Sprint group/ });
    expect(card.getAttribute('href')).toBe('/garden/groups/g1');
    expect(card.textContent).toContain('4 of 5 watered today · 126 shared words');
  });

  it('has no group card without a group', () => {
    renderWithIntl(<WeeklyHarvestScreen {...base} group={null} />);
    expect(screen.queryByText(/watered today/)).toBeNull();
    expect(screen.queryByText('IELTS Sprint group')).toBeNull();
  });
});

describe('TopicsScreen', () => {
  function renderTopics() {
    return renderWithIntl(
      <TopicsScreen
        topics={TOPICS}
        filters={[
          TOPICS_ACADEMIC_FILTER,
          { id: 'mine', label: 'Mine' },
        ]}
        lockedPack={TOPICS_LOCKED_PACK}
        searchHref="/search"
        newBedHref="/topics/new"
      />,
    );
  }

  it('filters the beds with the chips', () => {
    renderTopics();
    expect(screen.getByText('5 beds · 196 words')).toBeTruthy();
    expect(screen.getByText('Environment')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Mine' }));
    expect(screen.getByRole('button', { name: 'Mine' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByText('Environment')).toBeNull();
    expect(screen.getByText('Work & careers')).toBeTruthy();
    // The locked pack only belongs to All and IELTS Academic.
    expect(screen.queryByText('Academic Word List')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'IELTS Academic' }));
    expect(screen.getByText('Academic Word List')).toBeTruthy();
    expect(screen.queryByText('Work & careers')).toBeNull();
  });

  it('opens search', () => {
    renderTopics();
    fireEvent.click(screen.getByRole('button', { name: 'Search words and topics' }));
    expect(push).toHaveBeenCalledWith('/search');
  });
});

describe('TopicBedScreen', () => {
  const props = {
    ...BED,
    backHref: '/garden/topics',
    water: { count: 6, href: '/garden/review' },
    quizHref: '/quiz',
    addWordHref: '/add',
  };

  it('filters the words by stage, and a second tap clears it', () => {
    renderWithIntl(<TopicBedScreen {...props} />);
    expect(screen.getByRole('heading', { name: 'All words' })).toBeTruthy();
    const sprouts = screen.getByRole('button', { name: /11\s*Sprouts/ });
    fireEvent.click(sprouts);
    expect(sprouts.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('heading', { name: 'Sprouts in this bed' })).toBeTruthy();
    const list = screen.getAllByRole('list').at(-1)!;
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    fireEvent.click(sprouts);
    expect(screen.getByRole('heading', { name: 'All words' })).toBeTruthy();
  });

  it("can't filter when stage counts are unknown", () => {
    renderWithIntl(<TopicBedScreen {...props} stageCounts={null} />);
    const seeds = screen.getByRole('button', { name: /Seeds/ }) as HTMLButtonElement;
    expect(seeds.disabled).toBe(true);
    expect(seeds.textContent).toContain('—');
  });
});

describe('MeScreen', () => {
  it('toggles the ripening reminder', () => {
    const onReminderChange = vi.fn();
    renderWithIntl(
      <MeScreen
        {...ME}
        dailyGoal={{ ...ME.dailyGoal, href: '/garden/missions' }}
        family={{ ...ME.family, href: '/' }}
        onReminderChange={onReminderChange}
      />,
    );
    const toggle = screen.getByRole('switch', { name: 'Ripening reminder' });
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(onReminderChange).toHaveBeenCalledWith(false);
  });

  it('shows dashes, not numbers, for unknown stats', () => {
    renderWithIntl(
      <MeScreen
        {...ME}
        stats={{ fruiting: null, bestStreak: 5, hours: null, goldenBlooms: null }}
        calendar={null}
        keepsakes={null}
        dailyGoal={null}
        reminder={null}
        family={null}
      />,
    );
    expect(screen.getAllByText('—')).toHaveLength(3);
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('always writes the IELTS band with one decimal point, never a locale comma', () => {
    // vi-VN formats numbers with a comma decimal separator ("7,0"), but a
    // band score is written "7.0" in every language (it's a score, not a
    // quantity formatted for the reader's locale).
    render(
      <NextIntlClientProvider locale="vi" messages={messages}>
        <MeScreen {...ME} dailyGoal={null} reminder={null} family={null} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText('IELTS Academic · target band 7.0')).toBeTruthy();
  });
});
