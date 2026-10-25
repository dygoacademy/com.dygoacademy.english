import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GuestWordCard } from '@/types';

const play = vi.fn(() => Promise.resolve());
const prepare = vi.fn();
vi.mock('@/hooks/usePlayer', () => ({
  usePlayer: () => ({ play }),
  prepareSlowClip: (...a: unknown[]) => prepare(...a),
}));
const get = vi.fn();
vi.mock('@/lib/api-client', () => ({ apiClient: { get: (...a: unknown[]) => get(...a) } }));

const { SlowCompare, slowCompareClips } = await import('./SlowCompare');

const WORD: GuestWordCard = {
  source_word: 'inevitable',
  part_of_speech: 'adjective',
  ipa_us: '/ˌɪnˈev.ə.t̬ə.bəl/',
  ipa_uk: '/ɪˈnev.ɪ.tə.bəl/',
  definition_en: 'certain to happen',
  audio_url_us: 'us.m4a',
  audio_url_uk: null,
  synonyms: [],
  antonyms: [],
  example_sentences: [],
};

describe('slowCompareClips', () => {
  it("gives the accent's clip at 1× and at 0.75×", () => {
    expect(slowCompareClips(WORD, 'US')).toEqual({
      normal: { src: 'us.m4a', rate: 1 },
      slow: { src: 'us.m4a', rate: 0.75 },
    });
  });

  it("never falls back to the other accent's clip", () => {
    expect(slowCompareClips(WORD, 'UK').slow).toEqual({ src: null, rate: 0.75 });
  });
});

describe('SlowCompare', () => {
  beforeEach(() => {
    play.mockClear();
    prepare.mockClear();
    get.mockReset();
  });

  it('looks the word up and plays it at 1× and slowly for the chosen accent', async () => {
    get.mockResolvedValue(WORD);
    render(<SlowCompare />);
    fireEvent.click(screen.getByRole('button', { name: 'Look up' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Normal 1×' }));
    expect(play).toHaveBeenLastCalledWith('us.m4a', 1, undefined, null, { stretch: false });
    fireEvent.click(screen.getByRole('button', { name: 'Slowly 0.75×' }));
    // 0.75 is a player rate too: the slowed copy is asked for (`stretch`), as on Pronunciation's Slowly.
    expect(play).toHaveBeenLastCalledWith('us.m4a', 0.75, undefined, null, { stretch: true });
    expect(prepare).toHaveBeenCalledWith('us.m4a', 0.75, undefined, true);
    expect(get).toHaveBeenCalledWith('/words/guest-lookup?word=inevitable');

    fireEvent.click(screen.getByRole('button', { name: 'UK' }));
    expect(screen.getByRole('button', { name: 'Slowly 0.75× (none)' })).toHaveProperty('disabled', true);
  });
});
