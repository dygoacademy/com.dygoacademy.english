import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { playClip, resetPlayerForTest, stopClip, usePlayer } from './usePlayer';

describe('usePlayer', () => {
  let play: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    resetPlayerForTest();
    play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('plays one clip at a time through one element, at the chosen rate', async () => {
    const { result } = renderHook(() => usePlayer());
    await act(() => result.current.play('https://media.dygoacademy.com/a.m4a'));
    expect(result.current.src).toBe('https://media.dygoacademy.com/a.m4a');
    expect(result.current.isPlaying('https://media.dygoacademy.com/a.m4a')).toBe(true);

    await act(() => result.current.play('blob:me', 0.75));
    expect(result.current.src).toBe('blob:me');
    expect(result.current.rate).toBe(0.75);
    const el = play.mock.contexts[1] as HTMLAudioElement;
    expect(play.mock.contexts[0]).toBe(el); // the same element both times
    expect(el.playbackRate).toBe(0.75);
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });

  it('clears the state when the clip ends or is stopped', async () => {
    const { result } = renderHook(() => usePlayer());
    await act(() => result.current.play('a.m4a'));
    const el = play.mock.contexts[0] as HTMLAudioElement;
    act(() => el.dispatchEvent(new Event('ended')));
    expect(result.current.src).toBeNull();

    await act(() => playClip('b.m4a'));
    act(() => stopClip());
    expect(result.current.src).toBeNull();
  });

  it('keeps the rate for the next play and reports a failed play', async () => {
    const { result } = renderHook(() => usePlayer());
    act(() => result.current.setRate(0.75));
    await act(() => result.current.play('a.m4a'));
    expect((play.mock.contexts[0] as HTMLAudioElement).playbackRate).toBe(0.75);

    play.mockRejectedValueOnce(new Error('NotSupportedError'));
    await act(() => result.current.play('bad.m4a').catch(() => undefined));
    expect(result.current.src).toBeNull();
    expect(result.current.error).toBe('NotSupportedError');
  });
});
