import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

const query = <T,>(data: T) => ({ data, isPending: false, isError: false, refetch: vi.fn() });

const topic = {
  id: 't1',
  title: 'Environment',
  words: [
    { id: 'w1', source_word: 'deteriorate', custom_note: 'xấu đi, suy giảm', fsrs_state: 'Review', next_due_at: '2020-01-01T00:00:00Z' },
    { id: 'w2', source_word: 'mitigate', custom_note: 'giảm nhẹ', fsrs_state: 'Review', next_due_at: '2020-01-01T00:00:00Z' },
    { id: 'w3', source_word: 'drought', custom_note: 'hạn hán', fsrs_state: 'Review', next_due_at: '2020-01-01T00:00:00Z' },
  ],
};
const lookup = vi.fn();

vi.mock('@/hooks/useTopic', () => ({ useTopic: () => query(topic) }));
vi.mock('@/hooks/useStudySession', () => ({ useStudySession: () => query({ cards: [] }) }));
vi.mock('@/lib/api-client', () => ({ apiClient: { get: (url: string) => lookup(url) } }));
vi.mock('../AddWordSheet', () => ({
  AddWordSheet: ({ open, initialWord }: { open: boolean; initialWord?: string }) =>
    open ? <div role="dialog" aria-label="Add word">{initialWord}</div> : null,
}));

import { TopicWordSearchLive } from './TopicWordSearchLive';

function renderLive(initialQuery = '') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithIntl(
    <QueryClientProvider client={client}>
      <TopicWordSearchLive topicId="t1" initialQuery={initialQuery} />
    </QueryClientProvider>,
  );
}

describe('TopicWordSearchLive (A7c)', () => {
  beforeEach(() => {
    lookup.mockReset();
    window.localStorage.clear();
  });

  it('finds English words and highlights the match', () => {
    renderLive('DE');
    expect(screen.getByRole('heading', { name: 'In Environment · 1' })).toBeTruthy();
    const mark = screen.getByText('de', { selector: 'b' });
    expect(mark.parentElement?.textContent).toBe('deteriorate');
  });

  it('finds Vietnamese meanings with and without accents, earliest match first', () => {
    renderLive('giam');
    expect(screen.getByRole('heading', { name: 'In Environment · 2' })).toBeTruthy();
    const links = screen
      .getAllByRole('link')
      .filter((a) => a.getAttribute('href') === '/topics/t1' && a.textContent !== 'Cancel');
    expect(links.map((a) => a.textContent)).toEqual([
      expect.stringContaining('mitigate'),
      expect.stringContaining('deteriorate'),
    ]);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'giảm' } });
    expect(screen.getByRole('heading', { name: 'In Environment · 2' })).toBeTruthy();
  });

  it('offers the dictionary word to plant here and opens Add word with it', async () => {
    lookup.mockResolvedValue({ source_word: 'desertification', part_of_speech: 'noun', definition_en: 'land turning into desert' });
    renderLive('desertification');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Not in Environment yet' })).toBeTruthy());
    expect(lookup).toHaveBeenCalledWith('/words/guest-lookup?word=desertification');
    expect(screen.getByText('noun · land turning into desert')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Plant here/ }));
    expect(screen.getByRole('dialog', { name: 'Add word' }).textContent).toBe('desertification');
    expect(screen.getByRole('button', { name: 'desertification' })).toBeTruthy();
  });

  it('offers the typed word when the lookup misses and nothing matched', async () => {
    lookup.mockRejectedValue(new Error('404'));
    renderLive('reforest');
    await waitFor(() => expect(screen.getByRole('button', { name: /Plant here/ })).toBeTruthy());
    expect(screen.queryByRole('heading', { name: /^In Environment/ })).toBeNull();
  });

  it('Cancel goes back to the bed', () => {
    renderLive();
    expect(screen.getByRole('link', { name: 'Cancel' }).getAttribute('href')).toBe('/topics/t1');
    expect(screen.queryByRole('heading', { name: /^In Environment/ })).toBeNull();
  });

  it('keeps the last searches for this topic', async () => {
    renderLive('drought');
    await act(async () => {
      fireEvent.submit(screen.getByRole('search'));
    });
    expect(JSON.parse(window.localStorage.getItem('dygo:recent-search:t1') ?? '[]')).toEqual(['drought']);
    expect(screen.getByRole('button', { name: 'drought' })).toBeTruthy();
  });
});
