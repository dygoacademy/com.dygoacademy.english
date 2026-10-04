import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const post = vi.fn();
vi.mock('@/lib/api-client', () => ({ apiClient: { post: (...a: unknown[]) => post(...a) } }));

import {
  FLUSH_AFTER_MS,
  FLUSH_AT,
  flushMediaTimings,
  resetMediaTimingsForTest,
  trackAudioStart,
} from './media-timing';

const URL_MEDIA = 'https://media.dygoacademy.com/audio/en/us/abc.m4a';

describe('trackAudioStart', () => {
  let now = 0;
  beforeEach(() => {
    vi.useFakeTimers();
    post.mockReset().mockResolvedValue({ recorded: 1 });
    resetMediaTimingsForTest();
    now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('records tap → playing in ms with the host only, and sends after FLUSH_AFTER_MS', async () => {
    const audio = new Audio();
    trackAudioStart(audio, URL_MEDIA, 'word');
    now += 240;
    audio.dispatchEvent(new Event('playing'));

    expect(post).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(FLUSH_AFTER_MS);
    expect(post).toHaveBeenCalledWith('/telemetry/media', {
      events: [
        expect.objectContaining({
          kind: 'word',
          host: 'media.dygoacademy.com',
          outcome: 'played',
          ms: 240,
          from_cache: false,
        }),
      ],
    });
    const sent = JSON.stringify(post.mock.calls[0][1]);
    expect(sent).not.toContain('/audio/en/us'); // no file path
  });

  it('records errors, and counts an interrupted play only once', async () => {
    const audio = new Audio();
    trackAudioStart(audio, URL_MEDIA, 'speaking');
    trackAudioStart(audio, URL_MEDIA, 'speaking'); // tapped again before it played
    now += 900;
    audio.dispatchEvent(new Event('error'));
    audio.dispatchEvent(new Event('playing')); // nothing left listening

    await flushMediaTimings();
    expect(post).toHaveBeenCalledTimes(1);
    const { events } = post.mock.calls[0][1] as { events: { outcome: string; ms: number }[] };
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ outcome: 'error', ms: 900 });
  });

  it(`sends at once when ${FLUSH_AT} plays are queued`, async () => {
    for (let i = 0; i < FLUSH_AT; i++) {
      const audio = new Audio();
      trackAudioStart(audio, URL_MEDIA, 'word');
      audio.dispatchEvent(new Event('playing'));
    }
    await vi.dynamicImportSettled(); // api-client is imported lazily
    expect(post).toHaveBeenCalledTimes(1);
    expect((post.mock.calls[0][1] as { events: unknown[] }).events).toHaveLength(FLUSH_AT);
  });

  it('never throws when the report fails', async () => {
    post.mockRejectedValue(new Error('offline'));
    const audio = new Audio();
    trackAudioStart(audio, URL_MEDIA, 'word');
    audio.dispatchEvent(new Event('playing'));
    await expect(flushMediaTimings()).resolves.toBeUndefined();
  });
});
