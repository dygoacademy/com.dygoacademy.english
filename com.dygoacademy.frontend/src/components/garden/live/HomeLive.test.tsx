import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';
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

vi.mock('@/hooks/useSrsStats', () => ({ useSrsStats: () => query(stats.data) }));
vi.mock('@/hooks/useDailyActivity', () => ({ useDailyActivity: () => query(activity.data) }));
vi.mock('@/hooks/useCurrentUser', () => ({ useCurrentUser: () => query(null) }));
vi.mock('@/hooks/useUpcomingActivity', () => ({ useUpcomingActivity: () => query([]) }));
vi.mock('@/hooks/useNotificationSchedules', () => ({ useNotificationSchedules: () => query([]) }));
vi.mock('@/hooks/useMissions', () => ({ useTodayMissions: () => query(undefined) }));
vi.mock('@/hooks/useTopics', () => ({ useTopics: () => query([]) }));

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
