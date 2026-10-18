import { describe, expect, it } from 'vitest';

import { cutSpan, makeSlowClip, readySlowClip, resetSlowClipsForTest, stretchSpeech } from './slow-clip';

const RATE = 16000;
const tone = (hz: number, seconds: number) =>
  Float32Array.from({ length: Math.round(RATE * seconds) }, (_, i) => Math.sin((2 * Math.PI * hz * i) / RATE));

/** Zero crossings per second: the pitch of a pure tone, times two. */
function crossings(samples: Float32Array) {
  let n = 0;
  for (let i = 1; i < samples.length; i++) if (samples[i - 1] < 0 !== samples[i] < 0) n++;
  return n / (samples.length / RATE);
}

describe('slow-clip', () => {
  it('stretches speech to 1 / rate of its speed and keeps the pitch', () => {
    const src = tone(220, 1);
    const slow = stretchSpeech(src, RATE, 0.7);
    expect(slow.length).toBe(Math.ceil(src.length / 0.7));
    const mid = slow.slice(RATE * 0.1, RATE * 1.3);
    expect(crossings(mid)).toBeGreaterThan(440 * 0.95);
    expect(crossings(mid)).toBeLessThan(440 * 1.05);
    expect(Math.max(...mid.map(Math.abs))).toBeGreaterThan(0.8); // no dips where frames meet
    expect(stretchSpeech(src, RATE, 1)).toBe(src);
  });

  it('cuts a span of the clip', () => {
    const pcm = { samples: tone(100, 2), sampleRate: RATE };
    expect(cutSpan(pcm, { start: 0.5, end: 1 }).length).toBe(RATE / 2);
    expect(cutSpan(pcm)).toBe(pcm.samples);
  });

  it('makes a copy once per clip, span and rate, and tries again after a failure', async () => {
    resetSlowClipsForTest();
    let loads = 0;
    const load = () => {
      loads++;
      return loads === 1
        ? Promise.reject(new Error('cors'))
        : Promise.resolve({ samples: tone(200, 0.3), sampleRate: RATE });
    };
    await expect(makeSlowClip('a.m4a', 0.7, undefined, load)).rejects.toThrow('cors');
    expect(readySlowClip('a.m4a', 0.7)).toBeNull();
    const url = await makeSlowClip('a.m4a', 0.7, undefined, load);
    expect(url).toMatch(/^blob:/);
    expect(await makeSlowClip('a.m4a', 0.7, undefined, load)).toBe(url);
    expect(readySlowClip('a.m4a', 0.7)).toBe(url);
    expect(readySlowClip('a.m4a', 0.7, { start: 0, end: 0.1 })).toBeNull();
    expect(loads).toBe(2);
  });
});
