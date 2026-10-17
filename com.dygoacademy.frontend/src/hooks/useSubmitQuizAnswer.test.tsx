import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const post = vi.fn();
vi.mock('@/lib/api-client', () => ({ apiClient: { post: (...a: unknown[]) => post(...a) } }));

import { useSubmitQuizAnswer } from './useSubmitQuizAnswer';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useSubmitQuizAnswer', () => {
  beforeEach(() => {
    post.mockReset();
    post.mockResolvedValue({ correct: true });
  });

  it('sends final: true only for the last answer (it completes the QUIZ mission)', async () => {
    const { result } = renderHook(() => useSubmitQuizAnswer(), { wrapper });

    await act(() => result.current.mutateAsync({ itemId: 'q1', answer: 'a' }));
    expect(post.mock.calls[0][1]).not.toHaveProperty('final');

    await act(() => result.current.mutateAsync({ itemId: 'q10', answer: 'b', final: true }));
    expect(post.mock.calls[1][0]).toBe('/quizzes/q10/answer');
    expect(post.mock.calls[1][1]).toMatchObject({ answer: 'b', final: true });
  });

  it('sends drill: true only from the leech drill (A4 Rescue)', async () => {
    const { result } = renderHook(() => useSubmitQuizAnswer(), { wrapper });

    await act(() => result.current.mutateAsync({ itemId: 'q1', answer: 'a' }));
    expect(post.mock.calls[0][1]).not.toHaveProperty('drill');

    await act(() => result.current.mutateAsync({ itemId: 'q2', answer: 'b', drill: true }));
    expect(post.mock.calls[1][1]).toMatchObject({ answer: 'b', drill: true });
  });
});
