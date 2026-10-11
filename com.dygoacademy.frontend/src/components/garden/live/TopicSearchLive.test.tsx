import { fireEvent, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

const row = (id: string, title: string, extra: Record<string, unknown> = {}) => ({
  id,
  group_id: 'g',
  title,
  description: null,
  is_public: false,
  word_count: '40',
  mastered_count: '0',
  focus_word_count: '0',
  created_at: '2026-01-01',
  sprout_count: '0',
  flower_count: '0',
  seed_count: '40',
  due_count: '0',
  min_level: 'B2',
  max_level: 'B2',
  ...extra,
});
const topics = [
  row('env', 'Environment', { kind: 'library', collection_title: 'IELTS Academic', sprout_count: '4', due_count: '6' }),
  row('energy', 'Energy & resources', { kind: 'library', collection_title: 'IELTS Academic' }),
];

vi.mock('@/hooks/useTopics', () => ({
  useTopics: () => ({ data: topics, isPending: false, isError: false, refetch: vi.fn() }),
}));

import { TopicSearchLive } from './TopicSearchLive';

function renderLive() {
  const client = new QueryClient();
  client.setQueryData(['topics', 'env'], {
    id: 'env',
    title: 'Environment',
    words: [{ id: 'w1', source_word: 'environmental' }],
  });
  return renderWithIntl(
    <QueryClientProvider client={client}>
      <TopicSearchLive />
    </QueryClientProvider>,
  );
}

describe('TopicSearchLive (A6b)', () => {
  beforeEach(() => window.localStorage.clear());

  it('splits matches into your topics and topics to plant', () => {
    renderLive();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'en' } });
    expect(screen.getByRole('heading', { name: 'Your topics · 1' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'More topics to plant · 1' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Plant Energy & resources' }).getAttribute('href')).toBe(
      '/review?new=5&topic=energy',
    );
  });

  it('points to a matching word in a loaded bed', () => {
    renderLive();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'environ' } });
    const hint = screen.getByRole('link', { name: /Looking for a word\?/ });
    expect(hint.textContent).toContain('environmental');
    expect(hint.getAttribute('href')).toBe('/topics/env/search?q=environ');
  });

  it('says when nothing matches and links back to all topics', () => {
    renderLive();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zebra' } });
    expect(screen.getByText('No topics called “zebra”')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Browse all topics' }).getAttribute('href')).toBe('/topics');
  });
});
