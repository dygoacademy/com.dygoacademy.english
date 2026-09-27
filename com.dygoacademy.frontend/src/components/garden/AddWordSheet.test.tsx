import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

import { AddWordSheet } from './AddWordSheet';

// api-client reads env at import time; only its error class matters here.
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
const { ApiError } = await import('@/lib/api-client');

const mutateAsync = vi.fn();
const reset = vi.fn();
vi.mock('@/hooks/useCreateWord', () => ({
  useCreateWord: () => ({ mutateAsync, reset, isPending: false }),
}));

function renderSheet(onOpenChange = vi.fn()) {
  renderWithIntl(
    <div data-ui="garden">
      <AddWordSheet topicId="t1" topicTitle="Environment" open onOpenChange={onOpenChange} />
    </div>,
  );
  return onOpenChange;
}

describe('AddWordSheet', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    reset.mockReset();
  });

  it('is a garden sheet named "Add a word" for this bed, with submit off until a word is typed', () => {
    renderSheet();
    expect(screen.getByRole('dialog', { name: 'Add a word' })).toBeTruthy();
    expect(screen.getByText('To Environment')).toBeTruthy();
    const submit = screen.getByRole('button', { name: 'Plant word' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Word'), { target: { value: '   ' } });
    expect(submit.disabled).toBe(true);
  });

  it('posts the trimmed word and closes', async () => {
    mutateAsync.mockResolvedValue({});
    const onOpenChange = renderSheet();
    fireEvent.change(screen.getByLabelText('Word'), { target: { value: '  resilient ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Plant word' }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(mutateAsync).toHaveBeenCalledWith({ word: 'resilient' });
  });

  it("shows the API's message and stays open when adding fails", async () => {
    mutateAsync.mockRejectedValue(new ApiError('Already in this topic', 409));
    const onOpenChange = renderSheet();
    fireEvent.change(screen.getByLabelText('Word'), { target: { value: 'resilient' } });
    fireEvent.click(screen.getByRole('button', { name: 'Plant word' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Already in this topic');
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('falls back to the translated message for other errors', async () => {
    mutateAsync.mockRejectedValue(new Error('network'));
    renderSheet();
    fireEvent.change(screen.getByLabelText('Word'), { target: { value: 'resilient' } });
    fireEvent.click(screen.getByRole('button', { name: 'Plant word' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Couldn’t add this word. Try again.');
  });
});
