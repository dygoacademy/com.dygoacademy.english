import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DueCard } from '@/types';

const get = vi.fn();
const env = { recorder: 'media-recorder' as string | null, permission: 'granted' };
vi.mock('@/lib/api-client', () => ({ apiClient: { get: (...a: unknown[]) => get(...a) } }));
vi.mock('@/lib/speaking/audio', () => ({
  speakingSupport: () => ({ mic: true, recorder: env.recorder }),
  micPermission: () => Promise.resolve(env.permission),
}));

import { useSpeakOffers } from './useSpeakOffers';

const card = (id: string, is_new = false) =>
  ({ topic_word_id: id, is_new, state: is_new ? 'New' : 'Review', lapses: 0 }) as DueCard;
const CARDS = [card('a'), card('b', true), card('c'), card('d'), card('e')];

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <NextIntlClientProvider locale="en-US" messages={{}} timeZone="Asia/Ho_Chi_Minh">
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </NextIntlClientProvider>
  );
}

describe('useSpeakOffers', () => {
  beforeEach(() => {
    get
      .mockReset()
      .mockResolvedValue(
        ['a', 'b', 'c', 'd'].map((id) => ({
          topic_word_id: id,
          item_id: `i-${id}`,
          spoken_today: id === 'c',
        })),
      );
    env.recorder = 'media-recorder';
    env.permission = 'granted';
  });

  it('asks once for the cards and offers up to 3 (new first, spoken today left out)', async () => {
    const { result } = renderHook(() => useSpeakOffers(CARDS), { wrapper });
    await waitFor(() => expect(result.current.offers.size).toBe(3));
    expect([...result.current.offers]).toEqual(['b', 'a', 'd']);
    expect(get).toHaveBeenCalledTimes(1);
    expect(get.mock.calls[0][0]).toBe(
      '/speaking/words?topic_word_ids=a,b,c,d,e&tz=Asia%2FHo_Chi_Minh',
    );
    act(() => result.current.hide());
    expect(result.current.offers.size).toBe(0);
  });

  it('offers nothing (and asks nothing) when the mic was denied or recording is impossible', async () => {
    env.permission = 'denied';
    const denied = renderHook(() => useSpeakOffers(CARDS), { wrapper });
    await act(async () => {});
    expect(denied.result.current.offers.size).toBe(0);
    env.permission = 'granted';
    env.recorder = null;
    const none = renderHook(() => useSpeakOffers(CARDS), { wrapper });
    await act(async () => {});
    expect(none.result.current.offers.size).toBe(0);
    expect(get).not.toHaveBeenCalled();
  });
});
