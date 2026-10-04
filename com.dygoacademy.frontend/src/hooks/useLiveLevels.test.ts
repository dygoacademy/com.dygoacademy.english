import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const analyser = {
  fftSize: 0,
  getFloatTimeDomainData: vi.fn((buf: Float32Array) => buf.fill(0.5)),
  disconnect: vi.fn(),
};
const source = { connect: vi.fn(), disconnect: vi.fn() };
vi.mock('@/lib/speaking/audio', async (orig) => ({
  ...(await orig<typeof import('@/lib/speaking/audio')>()),
  getAudioContext: () => ({
    createMediaStreamSource: () => source,
    createAnalyser: () => analyser,
  }),
}));

import { LIVE_LEVELS_PER_SECOND, useLiveLevels } from './useLiveLevels';

describe('useLiveLevels', () => {
  let frames: Array<(t: number) => void> = [];
  let now = 0;
  beforeEach(() => {
    frames = [];
    now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /** Runs the pending animation frame at time t. */
  const step = (t: number) => {
    now = t;
    const cb = frames.shift();
    act(() => cb?.(t));
  };

  it('adds one RMS bar per 1/LIVE_LEVELS_PER_SECOND s and cleans up', () => {
    const stream = {} as MediaStream;
    const { result, unmount } = renderHook(() => useLiveLevels(stream));
    expect(source.connect).toHaveBeenCalledWith(analyser);
    const bar = 1000 / LIVE_LEVELS_PER_SECOND;
    step(bar / 2);
    expect(result.current).toEqual([]);
    step(bar);
    step(bar * 2);
    expect(result.current).toHaveLength(2);
    expect(result.current[0]).toBeCloseTo(0.5);
    unmount();
    expect(source.disconnect).toHaveBeenCalled();
    expect(analyser.disconnect).toHaveBeenCalled();
  });

  it('does nothing without a stream or when inactive', () => {
    const { result } = renderHook(() => useLiveLevels(null));
    expect(frames).toHaveLength(0);
    expect(result.current).toEqual([]);
    const stream = {} as MediaStream;
    renderHook(() => useLiveLevels(stream, false));
    expect(frames).toHaveLength(0);
  });
});
