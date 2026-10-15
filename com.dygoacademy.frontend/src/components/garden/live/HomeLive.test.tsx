import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';
import type { TodayMissions } from '@/hooks/useMissions';
import type { SrsStats } from '@/types';

import { isoDate } from './data';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const query = <T,>(data: T) => ({ data, isPending: false, isError: false, refetch: vi.fn() });

const stats: { data: SrsStats } = {
  data: {
    total_words: 120,
    mastered_words: 31,
    due_now: 45,
    leech_count: 0,
    current_streak_days: 0,
    display_name: 'Minh',
  },
};
const activity: { data: Array<{ review_date: string; review_count: number }> } = { data: [] };
const missions: { data: TodayMissions | undefined } = { data: undefined };
const topics: { data: Array<{ id: string; title: string; seed_count?: string; due_count?: string }> } = {
  data: [],
};
const onboarding: { data: { first_topic_id: string | null } } = { data: { first_topic_id: null } };

vi.mock('@/hooks/useSrsStats', () => ({ useSrsStats: () => query(stats.data) }));
vi.mock('@/hooks/useDailyActivity', () => ({ useDailyActivity: () => query(activity.data) }));
vi.mock('@/hooks/useCurrentUser', () => ({ useCurrentUser: () => query(null) }));
vi.mock('@/hooks/useUpcomingActivity', () => ({ useUpcomingActivity: () => query([]) }));
vi.mock('@/hooks/useNotificationSchedules', () => ({ useNotificationSchedules: () => query([]) }));
vi.mock('@/hooks/useMissions', () => ({ useTodayMissions: () => query(missions.data) }));
vi.mock('@/hooks/useTopics', () => ({ useTopics: () => query(topics.data) }));
vi.mock('@/hooks/useOnboarding', () => ({ useOnboarding: () => query(onboarding.data) }));

import { HomeLive } from './HomeLive';

/** The last review was `days` + 1 days ago, so `days` days were missed. */
function missed(days: number) {
  const last = new Date();
  last.setDate(last.getDate() - days - 1);
  activity.data = [{ review_date: isoDate(last), review_count: 8 }];
}

describe('HomeLive welcome back (A5 / A5b)', () => {
  beforeEach(() => {
    stats.data = { ...stats.data, due_now: 45, leech_count: 0 };
  });

  it('missed 3 days with 45 due → A5b Quick start', () => {
    missed(3);
    renderWithIntl(<HomeLive />);
    expect(screen.getByRole('heading', { name: 'Water the 10 thirstiest words first' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Quick start/ }).getAttribute('href')).toBe('/review?limit=10');
  });

  it("missed 3 days with nothing due or wilting → Today's Garden", () => {
    missed(3);
    stats.data = { ...stats.data, due_now: 0, leech_count: 0 };
    renderWithIntl(<HomeLive />);
    expect(screen.queryByText(/Welcome back/)).toBeNull();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Minh');
  });
});

describe('HomeLive all watered (A1b)', () => {
  const today = (done: boolean[]): TodayMissions => ({
    date: isoDate(new Date()),
    missions: (['REVIEW_DUE', 'NEW_WORDS', 'QUIZ'] as const).map((type, i) => ({
      type,
      target: 5,
      progress: done[i] ? 5 : 0,
      done: done[i]!,
    })) as TodayMissions['missions'],
    goldenBloom: done.every(Boolean),
  });

  beforeEach(() => {
    activity.data = [{ review_date: isoDate(new Date()), review_count: 8 }];
    stats.data = { ...stats.data, due_now: 0, leech_count: 0 };
    topics.data = [
      { id: 't1', title: 'Education', seed_count: '2', due_count: '0' },
      { id: 't2', title: 'Environment', seed_count: '7', due_count: '0' },
    ];
    onboarding.data = { first_topic_id: null };
  });

  it('nothing due and the Golden Bloom grown → All watered', () => {
    missions.data = today([true, true, true]);
    renderWithIntl(<HomeLive />);
    expect(screen.getByRole('heading', { name: 'All watered today' })).toBeTruthy();
    expect(screen.getByText('3 of 3 missions · Golden Bloom grown')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Plant 5 new words/ }).getAttribute('href')).toBe(
      '/review?new=5&topic=t2',
    );
    expect(screen.getByRole('link', { name: /From Environment/ })).toBeTruthy();
  });

  it('All watered plants from the goal bed while it has seeds', () => {
    missions.data = today([true, true, true]);
    onboarding.data = { first_topic_id: 't1' };
    renderWithIntl(<HomeLive />);
    expect(screen.getByRole('link', { name: /Plant 5 new words/ }).getAttribute('href')).toBe(
      '/review?new=5&topic=t1',
    );
    expect(screen.getByRole('link', { name: /From Education/ })).toBeTruthy();
  });

  it("nothing due but a mission still open → Today's Garden", () => {
    missions.data = today([true, false, true]);
    renderWithIntl(<HomeLive />);
    expect(screen.queryByRole('heading', { name: 'All watered today' })).toBeNull();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Minh');
  });
});
