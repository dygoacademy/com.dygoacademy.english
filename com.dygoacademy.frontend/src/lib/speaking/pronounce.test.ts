import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SpeakingSessionItem, SpeakingWordCheckResult } from '@/types';

const upload = vi.fn();
const get = vi.fn();
vi.mock('@/lib/api-client', () => ({
  ApiError: class extends Error {},
  apiClient: { upload: (...a: unknown[]) => upload(...a), get: (...a: unknown[]) => get(...a) },
}));

import {
  slowWord,
  nativeClipRate,
  nativeWord,
  pronVoiceEnded,
  unusableTake,
  voicedBars,
  voiceIn,
  wordCheck,
  wordStones,
} from './pronounce';

const MITIGATE = [
  { text: 'mi', stressed: true },
  { text: 'ti', stressed: false },
  { text: 'gate', stressed: false },
];
const BPS = 20;
/** `ms` of bars at `level`. */
const run = (ms: number, level: number) => Array.from({ length: (ms / 1000) * BPS }, () => level);

describe('syllables', () => {
  it('never makes one cell for the whole word: no stored syllables, no cells (the word is blocked)', () => {
    expect(wordStones({ syllables: [] })).toEqual([]);
    expect(wordStones({ syllables: undefined })).toEqual([]);
    expect(
      wordStones({ syllables: [{ text: 'cloud', stressed: true, start_ms: null, end_ms: null }] }),
    ).toHaveLength(1);
  });
});

describe('recording', () => {
  it('stops 1 s after the voice ends, never before any voice', () => {
    const voice = [...run(200, 0.001), ...run(500, 0.1)];
    expect(pronVoiceEnded([...voice, ...run(900, 0.001)], BPS)).toBe(false);
    expect(pronVoiceEnded([...voice, ...run(1000, 0.001)], BPS)).toBe(true);
    expect(pronVoiceEnded(run(3000, 0.001), BPS)).toBe(false);
  });

  it('calls a take with under 0.3 s of voice quiet, without asking the server', () => {
    const room = run(300, 0.001);
    expect(unusableTake([...run(300, 0.001), ...run(200, 0.1), ...run(1000, 0.001)], room, BPS)).toBe(
      'quiet',
    );
    expect(unusableTake(run(4000, 0.001), room, BPS)).toBe('quiet');
    expect(
      unusableTake([...run(300, 0.001), ...run(500, 0.1), ...run(1000, 0.001)], room, BPS),
    ).toBeNull();
    expect(voiceIn([...run(300, 0.001), ...run(500, 0.1)], BPS).voicedMs).toBe(500);
  });

  it('calls a loud room with no clear voice noisy', () => {
    const room = run(300, 0.05);
    expect(unusableTake(run(2000, 0.06), room, BPS)).toBe('noisy');
    expect(unusableTake([...run(300, 0.05), ...run(600, 0.4), ...run(1000, 0.05)], room, BPS)).toBeNull();
  });

  it('sends a take it cannot judge (a dead meter)', () => {
    expect(unusableTake(run(2000, 0), run(300, 0), BPS)).toBeNull();
  });
});

const ITEM = {
  word: 'mitigate',
  syllables: MITIGATE,
  target_index: 1,
  audio_uk_url: 'uk.m4a',
  audio_us_url: 'us.m4a',
  timings_uk: {
    duration: 2,
    words: [
      { text: 'Help', start: 0, end: 0.4, syllables: [] },
      {
        text: 'mitigate',
        start: 0.5,
        end: 1.1,
        syllables: [
          { start: 0.5, end: 0.7, stressed: true },
          { start: 0.7, end: 0.85, stressed: false },
          { start: 0.85, end: 1.1, stressed: false },
        ],
      },
    ],
  },
  timings_us: null,
  word_audio_url_us: null,
} as unknown as SpeakingSessionItem;

describe('native audio', () => {
  it('plays the word on its own when there is one, else its part of the sentence', () => {
    expect(nativeWord({ ...ITEM, word_audio_url_us: 'w.mp3' }, 'UK')).toEqual({ src: 'w.mp3' });
    expect(nativeWord(ITEM, 'UK')).toEqual({ src: 'uk.m4a', span: { start: 0.5, end: 1.1 }, madeAt: 1 });
  });

  it("plays the accent's own word clip, else the other accent's", () => {
    const both = { ...ITEM, word_audio_url_us: 'us.mp3', word_audio_url_uk: 'uk.mp3' };
    expect(nativeWord(both, 'UK')).toEqual({ src: 'uk.mp3' });
    expect(nativeWord(both, 'US')).toEqual({ src: 'us.mp3' });
    expect(nativeWord({ ...both, word_audio_url_uk: null }, 'UK')).toEqual({ src: 'us.mp3' });
    expect(nativeWord({ ...both, word_audio_url_us: null }, 'US')).toEqual({ src: 'uk.mp3' });
  });

});

describe('the P4 waveform', () => {
  it('keeps the voiced bars: the tap click, quiet ends and the trailing silence go', () => {
    const take = [...run(100, 0.5), ...run(200, 0.0001), ...run(500, 0.2), ...run(1000, 0.0001)];
    expect(voicedBars(take, BPS, 150)).toEqual(run(500, 0.2));
    expect(voicedBars(run(500, 0.00001), BPS)).toEqual([]);
  });

});

const CHECK: SpeakingWordCheckResult = {
  kind: 'word',
  status: 'ok',
  passed: false,
  pollinated: false,
  total: 72,
  heard_text: 'mitigate',
  syllables: [
    { ipa: 'mɪt', text: 'mi', score: 90, wobbly: false, heard_ipa: null, start_ms: 80, end_ms: 220 },
    { ipa: 'ɪ', text: 'ti', score: 40, wobbly: true, heard_ipa: 'aɪ', start_ms: 220, end_ms: 400 },
    { ipa: 'ɡeɪt', text: 'gate', score: 85, wobbly: false, heard_ipa: null, start_ms: null, end_ms: null },
  ],
  spelling: MITIGATE,
  user_duration_ms: 900,
  check_ms: 300,
};

describe('wordCheck', () => {
  afterEach(() => {
    upload.mockReset();
    get.mockReset();
  });

  it('uploads the take and polls until the check is done', async () => {
    upload.mockResolvedValue({ check_id: 'c1', status: 'queued', position: 0, eta_s: 1 });
    get
      .mockResolvedValueOnce({ check_id: 'c1', status: 'checking' })
      .mockResolvedValueOnce({ check_id: 'c1', status: 'done', result: CHECK });
    const r = await wordCheck(
      { recording: new Blob(['x'], { type: 'audio/webm' }), topicWordId: 'tw1', accent: 'UK' },
      { pollMs: 1 },
    );
    expect(r).toEqual(CHECK);
    expect(upload.mock.calls[0][0]).toBe('/speaking/check-pronunciation');
    const form = upload.mock.calls[0][1] as FormData;
    expect(form.get('topic_word_id')).toBe('tw1');
    expect(form.get('accent')).toBe('UK');
    expect((form.get('audio') as File).name).toBe('word.webm');
    expect(get).toHaveBeenCalledWith('/speaking/check/c1');
  });

  it('rejects when the check fails', async () => {
    upload.mockResolvedValue({ check_id: 'c1', status: 'queued', position: 0, eta_s: 1 });
    get.mockResolvedValue({ check_id: 'c1', status: 'failed', reason: 'bad_audio' });
    await expect(
      wordCheck({ recording: new Blob(['x']), topicWordId: 'tw1', accent: 'US' }, { pollMs: 1 }),
    ).rejects.toThrow('bad_audio');
  });
});

describe('Slowly', () => {
  it("Slowly: the accent's word clip at 0.75", () => {
    const both = {
      word_audio_url_us: 'https://m/us.m4a',
      word_audio_url_uk: 'https://m/uk.m4a',
    } as SpeakingSessionItem;
    expect(slowWord(both, 'UK')).toEqual({ clip: { src: 'https://m/uk.m4a' }, rate: 0.75 });
    expect(slowWord(both, 'US')).toEqual({ clip: { src: 'https://m/us.m4a' }, rate: 0.75 });
  });
});

describe('nativeClipRate', () => {
  it('plays the word clip at the rate asked, like the flashcard', () => {
    expect(nativeClipRate({ src: 'w.mp3' })).toBe(1);
    expect(nativeClipRate({ src: 'w.mp3' }, 0.7)).toBe(0.7);
  });
  it('brings a span of an older sentence clip to the learner pace; slow stays slow', () => {
    expect(nativeClipRate({ src: 'uk.m4a', madeAt: 1 })).toBe(0.85);
    expect(nativeClipRate({ src: 'uk.m4a', madeAt: 1 }, 0.7)).toBe(0.7);
  });
  it('plays a clip made at the learner pace as it is; slow is still 0.7 of the voice', () => {
    expect(nativeClipRate({ src: 'uk.m4a', madeAt: 0.85 })).toBe(1);
    expect(nativeClipRate({ src: 'uk.m4a', madeAt: 0.85 }, 0.7)).toBeCloseTo(0.7 / 0.85);
  });
});
