import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PENDING_SEED_KEY } from '@/lib/pending-seed';

const mutate = vi.fn();
vi.mock('@/hooks/useCreateWord', () => ({ useCreateWord: () => ({ mutate }) }));
vi.mock('@/lib/api-client', () => ({
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      public readonly status: number,
    ) {
      super(message);
    }
  },
}));

import { ApiError } from '@/lib/api-client';
import { usePlantPendingSeed } from './usePlantPendingSeed';

describe('usePlantPendingSeed (HP-9 "Save this word")', () => {
  beforeEach(() => {
    mutate.mockReset();
    window.localStorage.clear();
  });

  it('saves the kept word to My words once and clears it', () => {
    window.localStorage.setItem(PENDING_SEED_KEY, '  resilient ');
    const { rerender } = renderHook(() => usePlantPendingSeed());
    rerender();
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0]).toEqual({ word: 'resilient' });
    expect(window.localStorage.getItem(PENDING_SEED_KEY)).toBeNull();
  });

  it('does nothing without a kept word', () => {
    renderHook(() => usePlantPendingSeed());
    expect(mutate).not.toHaveBeenCalled();
  });

  it('keeps the word for later when saving fails, but not when it is already there', () => {
    window.localStorage.setItem(PENDING_SEED_KEY, 'resilient');
    renderHook(() => usePlantPendingSeed());
    const { onError } = mutate.mock.calls[0][1] as { onError: (e: unknown) => void };

    onError(new ApiError('Conflict', 409));
    expect(window.localStorage.getItem(PENDING_SEED_KEY)).toBeNull();

    onError(new Error('offline'));
    expect(window.localStorage.getItem(PENDING_SEED_KEY)).toBe('resilient');
  });
});
