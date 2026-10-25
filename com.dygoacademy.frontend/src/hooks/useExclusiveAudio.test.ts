import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { makeSlowClip, resetSlowClipsForTest } from '@/lib/speaking/slow-clip';

import { envelopeBuckets } from './useAudioEnvelope';
import { useExclusiveAudio } from './useExclusiveAudio';
import { hexesLit, MIC_LEVEL_DECAY, smoothLevel } from './useMicLevel';
import { playClip, resetPlayerForTest, usePlayer } from './usePlayer';

describe('useExclusiveAudio', () => {
  beforeEach(() => {
    resetPlayerForTest();
    resetSlowClipsForTest();
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('one sound at a time: starting one key stops the other', async () => {
    const { result } = renderHook(() => useExclusiveAudio());
    await act(() => result.current.play('native', { src: 'n.m4a' }));
    expect(result.current).toMatchObject({ key: 'native', state: 'playing' });
    expect(result.current.stateOf('you')).toBe('idle');
    await act(() => result.current.play('you', { src: 'blob:me' }));
    expect(result.current.key).toBe('you');
    expect(result.current.stateOf('native')).toBe('idle');
    expect(result.current.stateOf('you')).toBe('playing');
  });

  it('a tap while playing stops it', async () => {
    const { result } = renderHook(() => useExclusiveAudio());
    await act(() => result.current.toggle('normal', { src: 'n.m4a' }));
    expect(result.current.state).toBe('playing');
    await act(() => result.current.toggle('normal', { src: 'n.m4a' }));
    expect(result.current).toMatchObject({ key: null, state: 'idle' });
  });

  it('nothing to play, or a failed play: that key shows the error', async () => {
    const { result } = renderHook(() => useExclusiveAudio());
    await act(() => result.current.play('slow', { src: null }));
    expect(result.current).toMatchObject({ key: 'slow', state: 'error' });
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new Error('NotSupported'));
    await act(() => result.current.play('normal', { src: 'n.m4a' }));
    expect(result.current.stateOf('normal')).toBe('error');
  });

  it('two screens keep their own keys; unmounting stops its own sound only', async () => {
    const a = renderHook(() => useExclusiveAudio());
    const b = renderHook(() => useExclusiveAudio());
    const player = renderHook(() => usePlayer());
    await act(() => a.result.current.play('native', { src: 'n.m4a' }));
    expect(b.result.current.stateOf('native')).toBe('idle');
    b.unmount();
    expect(player.result.current.src).toBe('n.m4a');
    a.unmount();
    expect(player.result.current.src).toBeNull();
  });

  it('a sound started elsewhere is not this screen’s', async () => {
    const { result } = renderHook(() => useExclusiveAudio());
    await act(() => playClip('other.m4a', 1, undefined, 'p-elsewhere'));
    expect(result.current).toMatchObject({ key: null, state: 'idle' });
  });

  it('Slowly at 0.75 plays the slowed copy at 1× when asked to stretch', async () => {
    const pcm = { samples: new Float32Array(1600), sampleRate: 16000 };
    const url = await makeSlowClip('n.m4a', 0.75, undefined, () => Promise.resolve(pcm));
    const { result } = renderHook(() => useExclusiveAudio());
    const player = renderHook(() => usePlayer());
    await act(() => result.current.play('slow', { src: 'n.m4a', rate: 0.75, stretch: true }));
    const el = vi.mocked(HTMLMediaElement.prototype.play).mock.contexts[0] as HTMLAudioElement;
    expect(el.src).toBe(url);
    expect(el.playbackRate).toBe(1);
    // The Pond's remembered rate is untouched.
    expect(player.result.current.rate).toBe(1);
  });
});

describe('mic level and envelope helpers', () => {
  it('smoothLevel: up at once, down by the decay', () => {
    expect(smoothLevel(0, 0.1)).toBeCloseTo(0.5);
    expect(smoothLevel(0.5, 0)).toBeCloseTo(0.5 * MIC_LEVEL_DECAY);
    expect(smoothLevel(0.2, 1)).toBe(1);
  });

  it('hexesLit: level × count, clamped', () => {
    expect(hexesLit(0, 21)).toBe(0);
    expect(hexesLit(0.5, 21)).toBe(11);
    expect(hexesLit(2, 21)).toBe(21);
  });

  it('envelopeBuckets: the voiced part in N bars, loudest = 1', () => {
    const levels = [0, 0, 0, 0.1, 0.2, 0.4, 0.2, 0.1, 0, 0, 0];
    const bars = envelopeBuckets(levels, 5);
    expect(bars).toHaveLength(5);
    expect(Math.max(...bars)).toBe(1);
    expect(bars.every((v) => v >= 0 && v <= 1)).toBe(true);
    expect(envelopeBuckets([0, 0, 0], 40)).toEqual([]);
  });
});
