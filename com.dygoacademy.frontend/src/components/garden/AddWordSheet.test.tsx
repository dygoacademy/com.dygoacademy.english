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
const createdFor = vi.fn();
vi.mock('@/hooks/useCreateWord', () => ({
  useCreateWord: (topicId: string | null) => {
    createdFor(topicId);
    return { mutateAsync, reset, isPending: false };
  },
}));

function renderSheet(onOpenChange = vi.fn(), saveToMyWords = false) {
  renderWithIntl(
    <div data-ui="garden">
      <AddWordSheet
        topicId="t1"
        topicTitle="Environment"
        open
        onOpenChange={onOpenChange}
        saveToMyWords={saveToMyWords}
      />
    </div>,
  );
  return onOpenChange;
}

describe('AddWordSheet', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    reset.mockReset();
    createdFor.mockReset();
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

  it('says the word is already here on a 409, and stays open', async () => {
    mutateAsync.mockRejectedValue(new ApiError('This word is already in the topic.', 409));
    const onOpenChange = renderSheet();
    fireEvent.change(screen.getByLabelText('Word'), { target: { value: 'resilient' } });
    fireEvent.click(screen.getByRole('button', { name: 'Plant word' }));
    expect((await screen.findByRole('alert')).textContent).toBe(
      'This word is already in this bed.',
    );
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("shows a translated line on a 403, not the server's WRITE role text", async () => {
    mutateAsync.mockRejectedValue(new ApiError('WRITE role on this topic is required.', 403));
    renderSheet();
    fireEvent.change(screen.getByLabelText('Word'), { target: { value: 'resilient' } });
    fireEvent.click(screen.getByRole('button', { name: 'Plant word' }));
    expect((await screen.findByRole('alert')).textContent).toBe(
      'You can’t add words to this topic.',
    );
  });

  it('on a bed the learner cannot edit, saves to My words and says so', async () => {
    mutateAsync.mockResolvedValue({});
    const onOpenChange = renderSheet(vi.fn(), true);
    expect(screen.getByText('Saved to My words')).toBeTruthy();
    expect(screen.queryByText('To Environment')).toBeNull();
    expect(createdFor).toHaveBeenLastCalledWith(null);
    fireEvent.change(screen.getByLabelText('Word'), { target: { value: 'resilient' } });
    fireEvent.click(screen.getByRole('button', { name: 'Plant word' }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(await screen.findByText('Added to My words')).toBeTruthy();
  });

  it('a duplicate in My words names My words', async () => {
    mutateAsync.mockRejectedValue(new ApiError('This word is already in the topic.', 409));
    renderSheet(vi.fn(), true);
    fireEvent.change(screen.getByLabelText('Word'), { target: { value: 'resilient' } });
    fireEvent.click(screen.getByRole('button', { name: 'Plant word' }));
    expect((await screen.findByRole('alert')).textContent).toBe(
      'This word is already in My words.',
    );
  });

  it('falls back to the translated message for other errors', async () => {
    mutateAsync.mockRejectedValue(new Error('network'));
    renderSheet();
    fireEvent.change(screen.getByLabelText('Word'), { target: { value: 'resilient' } });
    fireEvent.click(screen.getByRole('button', { name: 'Plant word' }));
    expect((await screen.findByRole('alert')).textContent).toBe(
      'We couldn’t add this word. Please try again.',
    );
  });
});
