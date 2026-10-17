import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const order: string[] = [];
const apiDelete = vi.fn();
vi.mock('@/lib/api-client', () => ({ apiClient: { delete: (...args: unknown[]) => apiDelete(...args) } }));

const authSignOut = vi.fn();
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { signOut: authSignOut } }) }));

vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ clear: vi.fn() }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));

import { useSignOut } from './useSignOut';

function stubServiceWorker(endpoint: string | null) {
  const registration = {
    pushManager: { getSubscription: () => Promise.resolve(endpoint ? { endpoint } : null) },
  };
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { getRegistration: () => Promise.resolve(registration) },
  });
}

beforeEach(() => {
  order.length = 0;
  apiDelete.mockReset().mockImplementation(() => {
    order.push('release');
    return Promise.resolve();
  });
  authSignOut.mockReset().mockImplementation(() => {
    order.push('signOut');
    return Promise.resolve({ error: null });
  });
});

describe('useSignOut', () => {
  it("removes this browser's push subscription from the server before signing out", async () => {
    stubServiceWorker('https://push.example/1');
    const { result } = renderHook(() => useSignOut());
    await act(() => result.current.signOut());
    expect(apiDelete).toHaveBeenCalledWith('/notifications/subscribe', { endpoint: 'https://push.example/1' });
    expect(order).toEqual(['release', 'signOut']);
  });

  it('still signs out when the release fails or there is no subscription', async () => {
    stubServiceWorker('https://push.example/1');
    apiDelete.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useSignOut());
    await act(async () => {
      expect(await result.current.signOut()).toBe(true);
    });

    stubServiceWorker(null);
    apiDelete.mockClear();
    const second = renderHook(() => useSignOut());
    await act(() => second.result.current.signOut());
    expect(apiDelete).not.toHaveBeenCalled();
    expect(authSignOut).toHaveBeenCalledTimes(2);
  });
});
