import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

// The profile's English (lib/accent.ts useAccent) picks the IPA and clip.
let englishVariety: 'en-US' | 'en-GB' = 'en-US';
vi.mock('@/hooks/useProfile', () => ({
  useMyProfile: () => ({ data: { english_variety: englishVariety } }),
}));

const RESILIENT: WordLookup = {
  word: 'resilient',
  found: true,
  part_of_speech: 'adjective',
  cefr_level: 'B2',
  ipa_us: '/rɪˈzɪl.jənt/',
  ipa_uk: '/rɪˈzɪl.i.ənt/',
  meaning: 'Able to recover quickly from difficulties.',
  definition_en: 'Able to recover quickly from difficulties.',
  example: null,
  audio_url: null,
  audio_url_uk: null,
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

async function plant(word = 'resilient', bed = 'Environment') {
  fireEvent.change(screen.getByLabelText('Word'), { target: { value: word } });
  fireEvent.click(screen.getByRole('button', { name: `Plant in ${bed}` }));
  return screen.findByText(/^Planted/);
}

describe('AddWordSheet', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    reset.mockReset();
    createdFor.mockReset();
    lookedUp.mockReset();
    lookup = { settled: false, isError: false };
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('has the board header (title, subtitle, ✕), with Plant off until a word is typed', () => {
    renderSheet();
    expect(screen.getByRole('dialog', { name: 'Plant a new word' })).toBeTruthy();
    expect(screen.getByText('Type a word you met today')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
    const submit = screen.getByRole('button', { name: 'Plant in Environment' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Word'), { target: { value: '   ' } });
    expect(submit.disabled).toBe(true);
  });

  it('focuses the field after the slide-in, not while the sheet moves', () => {
    vi.useFakeTimers();
    renderSheet();
    const field = screen.getByLabelText('Word');
    expect(document.activeElement).not.toBe(field);
    expect(field.hasAttribute('autofocus')).toBe(false);
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(document.activeElement).toBe(field);
  });

  it('posts the trimmed word, then shows it planted under the same header; Done closes', async () => {
    mutateAsync.mockResolvedValue({});
    const onOpenChange = renderSheet();
    const planted = await plant('  resilient ');
    expect(mutateAsync).toHaveBeenCalledWith({ word: 'resilient' });
    expect(planted.textContent).toBe('Planted “resilient”');
    expect(screen.getByText('It’s a seed in Environment. First watering tomorrow.')).toBeTruthy();
    expect(screen.getByRole('dialog', { name: 'Plant a new word' })).toBeTruthy();
    expect(screen.getByText('Type a word you met today')).toBeTruthy();
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows Plant another and Done side by side', async () => {
    mutateAsync.mockResolvedValue({});
    renderSheet();
    await plant();
    const another = screen.getByRole('button', { name: 'Plant another' });
    const done = screen.getByRole('button', { name: 'Done' });
    expect(another.parentElement).toBe(done.parentElement);
    expect(another.parentElement?.className).toContain('grid-cols-2');
  });

  it('closes from the ✕ before and after planting', async () => {
    mutateAsync.mockResolvedValue({});
    const onOpenChange = renderSheet();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    onOpenChange.mockClear();
    await plant();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('Plant another goes back to an empty field', async () => {
    mutateAsync.mockResolvedValue({});
    renderSheet();
    await plant();
    fireEvent.click(screen.getByRole('button', { name: 'Plant another' }));
    expect((screen.getByLabelText('Word') as HTMLInputElement).value).toBe('');
    expect(screen.getByRole('dialog', { name: 'Plant a new word' })).toBeTruthy();
  });

  it('fills in the meaning, IPA, part of speech and level while typing', () => {
    lookup = { data: RESILIENT, settled: true, isError: false };
    renderSheet();
    fireEvent.change(screen.getByLabelText('Word'), { target: { value: 'resilient' } });
    expect(lookedUp).toHaveBeenLastCalledWith('resilient');
    expect(screen.getByText('/rɪˈzɪl.jənt/ · adjective')).toBeTruthy();
    expect(screen.getByText('B2')).toBeTruthy();
    expect(screen.getByText('Able to recover quickly from difficulties.')).toBeTruthy();
  });

  it('shows the UK IPA for an en-GB profile, and plays the UK clip', () => {
    englishVariety = 'en-GB';
    lookup = {
      data: {
        ...RESILIENT,
        audio_url: 'https://media.example/us.m4a',
        audio_url_uk: 'https://media.example/uk.m4a',
      },
      settled: true,
      isError: false,
    };
    const play = vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue();
    const pause = vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockReturnValue();
    const made: string[] = [];
    const RealAudio = window.Audio;
    vi.stubGlobal(
      'Audio',
      class extends RealAudio {
        constructor(src?: string) {
          super(src);
          if (src) made.push(src);
        }
      },
    );
    try {
      renderSheet();
      fireEvent.change(screen.getByLabelText('Word'), { target: { value: 'resilient' } });
      expect(screen.getByText('/rɪˈzɪl.i.ənt/ · adjective')).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Play pronunciation' }));
      expect(made).toEqual(['https://media.example/uk.m4a']);
    } finally {
      englishVariety = 'en-US';
      vi.unstubAllGlobals();
      play.mockRestore();
      pause.mockRestore();
    }
  });

  it('shows a translated meaning with the English definition under it', () => {
    lookup = {
      data: { ...RESILIENT, meaning: 'kiên cường, mau phục hồi' },
      settled: true,
      isError: false,
    };
    renderSheet();
    fireEvent.change(screen.getByLabelText('Word'), { target: { value: 'resilient' } });
    expect(screen.getByText('kiên cường, mau phục hồi')).toBeTruthy();
    expect(screen.getByText('Able to recover quickly from difficulties.')).toBeTruthy();
  });

  it('hides the example and play without data, and shows them when the lookup has them', () => {
    lookup = { data: RESILIENT, settled: true, isError: false };
    renderSheet();
    fireEvent.change(screen.getByLabelText('Word'), { target: { value: 'resilient' } });
    expect(screen.queryByTestId('addword-example')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Play pronunciation' })).toBeNull();

    lookup = {
      data: {
        ...RESILIENT,
        example: 'Coral reefs can be surprisingly resilient.',
        audio_url: 'https://cdn/resilient.mp3',
      },
      settled: true,
      isError: false,
    };
    fireEvent.change(screen.getByLabelText('Word'), { target: { value: 'resilient ' } });
    const example = screen.getByTestId('addword-example');
    expect(example.textContent).toBe('“Coral reefs can be surprisingly resilient.”');
    expect(example.querySelector('b')?.textContent).toBe('resilient');
    expect(screen.getByRole('button', { name: 'Play pronunciation' })).toBeTruthy();
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
    expect(
      (screen.getByRole('button', { name: 'Plant in Environment' }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it('shows "Looking it up…" until the lookup settles', () => {
    renderSheet();
    fireEvent.change(screen.getByLabelText('Word'), { target: { value: 'resil' } });
    expect(screen.getByText('Looking it up…')).toBeTruthy();
  });

  it('picks a bed from the chips, this bed first; the button follows the chosen bed', async () => {
    mutateAsync.mockResolvedValue({});
    renderSheet(vi.fn(), false, BEDS);
    const chips = screen.getAllByRole('button').filter((b) => b.hasAttribute('aria-pressed'));
    expect(chips.map((c) => c.textContent)).toEqual(['Environment', 'My words', 'Work & careers']);
    expect(chips[0].getAttribute('aria-pressed')).toBe('true');
    expect(createdFor).toHaveBeenLastCalledWith('t1');
    fireEvent.click(screen.getByRole('button', { name: 'Work & careers' }));
    expect(createdFor).toHaveBeenLastCalledWith('t2');
    expect(screen.queryByRole('button', { name: 'Plant in Environment' })).toBeNull();
    await plant('resilient', 'Work & careers');
    expect(screen.getByText(/It’s a seed in Work & careers/)).toBeTruthy();
  });

  it('says the word is already in the chosen bed and turns Plant off', () => {
    lookup = { data: { ...RESILIENT, in_topic_ids: ['t1'] }, settled: true, isError: false };
    renderSheet(vi.fn(), false, BEDS);
    fireEvent.change(screen.getByLabelText('Word'), { target: { value: 'resilient' } });
    expect(screen.getByText('Already in Environment.')).toBeTruthy();
    const submit = screen.getByRole('button', { name: 'Plant in Environment' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'My words' }));
    expect(screen.queryByText('Already in Environment.')).toBeNull();
    expect(
      (screen.getByRole('button', { name: 'Plant in My words' }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it('says the word is already here on a 409, and stays open', async () => {
    mutateAsync.mockRejectedValue(new ApiError('This word is already in the topic.', 409));
    const onOpenChange = renderSheet();
    fireEvent.change(screen.getByLabelText('Word'), { target: { value: 'resilient' } });
    fireEvent.click(screen.getByRole('button', { name: 'Plant in Environment' }));
    expect((await screen.findByRole('alert')).textContent).toBe(
      'This word is already in this bed.',
    );
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("shows a translated line on a 403, not the server's WRITE role text", async () => {
    mutateAsync.mockRejectedValue(new ApiError('WRITE role on this topic is required.', 403));
    renderSheet();
    fireEvent.change(screen.getByLabelText('Word'), { target: { value: 'resilient' } });
    fireEvent.click(screen.getByRole('button', { name: 'Plant in Environment' }));
    expect((await screen.findByRole('alert')).textContent).toBe(
      'You can’t add words to this topic.',
    );
  });

  it('on a bed the learner cannot edit, plants in My words and the button says so', async () => {
    mutateAsync.mockResolvedValue({});
    const onOpenChange = renderSheet(vi.fn(), true);
    expect(createdFor).toHaveBeenLastCalledWith(null);
    await plant('resilient', 'My words');
    expect(screen.getByText(/It’s a seed in My words/)).toBeTruthy();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('a duplicate in My words names My words', async () => {
    mutateAsync.mockRejectedValue(new ApiError('This word is already in the topic.', 409));
    renderSheet(vi.fn(), true);
    fireEvent.change(screen.getByLabelText('Word'), { target: { value: 'resilient' } });
    fireEvent.click(screen.getByRole('button', { name: 'Plant in My words' }));
    expect((await screen.findByRole('alert')).textContent).toBe(
      'This word is already in My words.',
    );
  });

  it('falls back to the translated message for other errors', async () => {
    mutateAsync.mockRejectedValue(new Error('network'));
    renderSheet();
    fireEvent.change(screen.getByLabelText('Word'), { target: { value: 'resilient' } });
    fireEvent.click(screen.getByRole('button', { name: 'Plant in Environment' }));
    expect((await screen.findByRole('alert')).textContent).toBe(
      'We couldn’t add this word. Please try again.',
    );
  });
});
