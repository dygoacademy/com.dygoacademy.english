import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/render';

import type { WordLookup } from '@/types';

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

let lookup: { data?: WordLookup; settled: boolean; isError: boolean } = {
  settled: false,
  isError: false,
};
const lookedUp = vi.fn();
vi.mock('@/hooks/useWordLookup', () => ({
  useWordLookup: (word: string) => {
    lookedUp(word);
    return lookup;
  },
}));

const RESILIENT: WordLookup = {
  word: 'resilient',
  found: true,
  part_of_speech: 'adjective',
  cefr_level: 'B2',
  ipa_us: '/rɪˈzɪl.jənt/',
  ipa_uk: '/rɪˈzɪl.i.ənt/',
  meaning: 'Able to recover quickly from difficulties.',
  audio_url: null,
  in_topic_ids: [],
};

function renderSheet(
  onOpenChange = vi.fn(),
  saveToMyWords = false,
  beds?: { id: string | null; title: string }[],
) {
  renderWithIntl(
    <div data-ui="garden">
      <AddWordSheet
        topicId="t1"
        topicTitle="Environment"
        open
        onOpenChange={onOpenChange}
        saveToMyWords={saveToMyWords}
        beds={beds}
      />
    </div>,
  );
  return onOpenChange;
}

const BEDS = [
  { id: 't1', title: 'Environment' },
  { id: 'mw', title: 'My words' },
  { id: 't2', title: 'Work & careers' },
];

describe('AddWordSheet', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    reset.mockReset();
    createdFor.mockReset();
    lookedUp.mockReset();
    lookup = { settled: false, isError: false };
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

  it('posts the trimmed word, then shows it planted; Done closes', async () => {
    mutateAsync.mockResolvedValue({});
    const onOpenChange = renderSheet();
    fireEvent.change(screen.getByLabelText('Word'), { target: { value: '  resilient ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Plant word' }));
    expect(await screen.findByRole('dialog', { name: 'Planted' })).toBeTruthy();
    expect(mutateAsync).toHaveBeenCalledWith({ word: 'resilient' });
    expect(screen.getByText(/is planted in Environment/).textContent).toBe(
      'resilient is planted in Environment',
    );
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('Plant another goes back to an empty field', async () => {
    mutateAsync.mockResolvedValue({});
    renderSheet();
    fireEvent.change(screen.getByLabelText('Word'), { target: { value: 'resilient' } });
    fireEvent.click(screen.getByRole('button', { name: 'Plant word' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Plant another word' }));
    expect((screen.getByLabelText('Word') as HTMLInputElement).value).toBe('');
    expect(screen.getByRole('dialog', { name: 'Add a word' })).toBeTruthy();
  });

  it('fills in the meaning, IPA, part of speech and level while typing', () => {
    lookup = { data: RESILIENT, settled: true, isError: false };
    renderSheet();
    fireEvent.change(screen.getByLabelText('Word'), { target: { value: 'resilient' } });
    expect(lookedUp).toHaveBeenLastCalledWith('resilient');
    expect(screen.getByText('/rɪˈzɪl.jənt/')).toBeTruthy();
    expect(screen.getByText('adjective · B2')).toBeTruthy();
    expect(screen.getByText('Able to recover quickly from difficulties.')).toBeTruthy();
  });

  it('says a word new to Dygo gets its meaning after planting', () => {
    lookup = {
      data: { ...RESILIENT, word: 'zorbing', found: false, meaning: null, ipa_us: null },
      settled: true,
      isError: false,
    };
    renderSheet();
    fireEvent.change(screen.getByLabelText('Word'), { target: { value: 'zorbing' } });
    expect(screen.getByText(/New to Dygo/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Plant word' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it('shows "Looking it up…" until the lookup settles', () => {
    renderSheet();
    fireEvent.change(screen.getByLabelText('Word'), { target: { value: 'resil' } });
    expect(screen.getByText('Looking it up…')).toBeTruthy();
  });

  it('picks a bed from the chips, this bed first, and plants there', async () => {
    mutateAsync.mockResolvedValue({});
    renderSheet(vi.fn(), false, BEDS);
    expect(screen.queryByText('To Environment')).toBeNull();
    const chips = screen.getAllByRole('button').filter((b) => b.hasAttribute('aria-pressed'));
    expect(chips.map((c) => c.textContent)).toEqual(['Environment', 'My words', 'Work & careers']);
    expect(chips[0].getAttribute('aria-pressed')).toBe('true');
    expect(createdFor).toHaveBeenLastCalledWith('t1');
    fireEvent.click(screen.getByRole('button', { name: 'Work & careers' }));
    expect(createdFor).toHaveBeenLastCalledWith('t2');
    fireEvent.change(screen.getByLabelText('Word'), { target: { value: 'resilient' } });
    fireEvent.click(screen.getByRole('button', { name: 'Plant word' }));
    expect(await screen.findByText(/is planted in Work & careers/)).toBeTruthy();
  });

  it('says the word is already in the chosen bed and turns Plant off', () => {
    lookup = { data: { ...RESILIENT, in_topic_ids: ['t1'] }, settled: true, isError: false };
    renderSheet(vi.fn(), false, BEDS);
    fireEvent.change(screen.getByLabelText('Word'), { target: { value: 'resilient' } });
    expect(screen.getByText('Already in Environment.')).toBeTruthy();
    const submit = screen.getByRole('button', { name: 'Plant word' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'My words' }));
    expect(screen.queryByText('Already in Environment.')).toBeNull();
    expect(submit.disabled).toBe(false);
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
    expect(await screen.findByText(/is planted in My words/)).toBeTruthy();
    expect(onOpenChange).not.toHaveBeenCalled();
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
