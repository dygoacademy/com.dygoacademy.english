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
  audio_url_uk: 'uk.m4a',
  audio_slow_url_us: 'us-slow.m4a',
  audio_slow_url_uk: null,
  synonyms: [],
  antonyms: [],
  example_sentences: [],
};

describe('slowCompareClips', () => {
  it("gives the accent's normal clip, its slow clip at 1× and its normal clip at 0.7×", () => {
    expect(slowCompareClips(WORD, 'US')).toEqual({
      normal: { src: 'us.m4a', rate: 1 },
      a: { src: 'us-slow.m4a', rate: 1 },
      b: { src: 'us.m4a', rate: 0.7 },
    });
  });

  it("never falls back to the other accent's clip", () => {
    expect(slowCompareClips(WORD, 'UK').a).toEqual({ src: null, rate: 1 });
  });
});

describe('SlowCompare', () => {
  beforeEach(() => {
    play.mockClear();
    prepare.mockClear();
    get.mockReset();
  });

  it('looks the word up and plays A and B for the chosen accent', async () => {
    get.mockResolvedValue(WORD);
    render(<SlowCompare />);
    fireEvent.click(screen.getByRole('button', { name: 'Look up' }));

    fireEvent.click(await screen.findByRole('button', { name: 'A · slow clip' }));
    expect(play).toHaveBeenLastCalledWith('us-slow.m4a', 1);
    fireEvent.click(screen.getByRole('button', { name: 'B · normal at 0.7×' }));
    expect(play).toHaveBeenLastCalledWith('us.m4a', 0.7);
    expect(prepare).toHaveBeenCalledWith('us.m4a', 0.7);
    expect(get).toHaveBeenCalledWith('/words/guest-lookup?word=inevitable');

    fireEvent.click(screen.getByRole('button', { name: 'UK' }));
    expect(screen.getByRole('button', { name: 'A · slow clip (none)' })).toHaveProperty('disabled', true);
  });
});
