import { fireEvent, screen, waitFor } from '@testing-library/react';
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

const get = vi.fn();
vi.mock('@/lib/api-client', () => ({ apiClient: { get: (path: string) => get(path) } }));

import { TopicSearchLive } from './TopicSearchLive';

function renderLive({ loadedBed = true } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (loadedBed) {
    client.setQueryData(['topics', 'env'], {
      id: 'env',
      title: 'Environment',
      words: [{ id: 'w1', source_word: 'environmental' }],
    });
  }
  return renderWithIntl(
    <QueryClientProvider client={client}>
      <TopicSearchLive />
    </QueryClientProvider>,
  );
}

describe('TopicSearchLive (A6b)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    get.mockReset();
    get.mockResolvedValue([]);
  });

  const type = (value: string) =>
    fireEvent.change(screen.getByRole('searchbox'), { target: { value } });
  const hit = (word: string, matched: 'word' | 'meaning' = 'word') => [
    { word, topic_id: 'env', topic_title: 'Environment', matched },
  ];

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

  it('shows the word row from the word search with nothing loaded', async () => {
    get.mockResolvedValue(hit('environmental'));
    renderLive({ loadedBed: false });
    type('envi');
    const row = await screen.findByRole('link', { name: /Looking for a word\?/ });
    expect(row.textContent).toContain('environmental');
    expect(row.textContent).toContain('Environment');
    expect(row.getAttribute('href')).toBe('/topics/env/search?q=envi');
    expect(get).toHaveBeenCalledWith('/topics/word-search?q=envi');
  });

  it('shows the loaded bed match while the word search is loading', () => {
    get.mockReturnValue(new Promise(() => {}));
    renderLive();
    type('environ');
    expect(screen.getByRole('link', { name: /Looking for a word\?/ }).textContent).toContain(
      'environmental',
    );
  });

  it('sends one word search for a word typed fast', async () => {
    renderLive({ loadedBed: false });
    for (const value of ['e', 'en', 'env', 'envi', 'envir']) type(value);
    await waitFor(() => expect(get).toHaveBeenCalledWith('/topics/word-search?q=envir'));
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(get.mock.calls.filter(([path]) => String(path).startsWith('/topics/word-search'))).toHaveLength(1);
  });

  it('names the English word without a highlight when only the meaning matched', async () => {
    get.mockResolvedValue(hit('environmental', 'meaning'));
    renderLive({ loadedBed: false });
    type('môi');
    const row = await screen.findByRole('link', { name: /Looking for a word\?/ });
    expect(row.textContent).toContain('environmental');
    expect(row.querySelector('.bg-gold-light')).toBeNull();
  });

  it('hides the word row when the word search finds nothing', async () => {
    renderLive({ loadedBed: false });
    type('zebra');
    await waitFor(() => expect(get).toHaveBeenCalledWith('/topics/word-search?q=zebra'));
    expect(screen.queryByRole('link', { name: /Looking for a word\?/ })).toBeNull();
  });
});
