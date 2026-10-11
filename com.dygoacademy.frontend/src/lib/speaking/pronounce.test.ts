import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SpeakingSessionItem, SpeakingWordCheckResult } from '@/types';

const upload = vi.fn();
const get = vi.fn();
vi.mock('@/lib/api-client', () => ({
  ApiError: class extends Error {},
  apiClient: { upload: (...a: unknown[]) => upload(...a), get: (...a: unknown[]) => get(...a) },
}));

import {
  hopParts,
  layoutStones,
  litStones,
  nativeClipRate,
  nativeSyllable,
  nativeWord,
  pronVoiceEnded,
  resultView,
  unusableTake,
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

describe('stones', () => {
  it('draws the stressed syllable as the big stone, where the boards put three', () => {
    const stones = layoutStones(MITIGATE, 'phone', 150);
    expect(stones.map((s) => [s.text, s.cx, s.cy, s.rx, s.ry, s.fontSize, s.textY])).toEqual([
      ['MI', 62, 140, 50, 22, 24, 148],
      ['ti', 168, 146, 32, 14, 16, 151],
      ['gate', 268, 144, 40, 17, 19, 150],
    ]);
    const ipad = layoutStones(MITIGATE, 'ipad', 222);
    expect(ipad.map((s) => [s.cx, s.cy, s.rx])).toEqual([
      [110, 206, 84],
      [285, 214, 52],
      [452, 211, 70],
    ]);
  });

  it('shrinks long words so the stones never touch', () => {
    const five = ['de', 'fo', 'res', 'ta', 'tion'].map((text, k) => ({ text, stressed: k === 3 }));
    const stones = layoutStones(five, 'phone', 120);
    expect(stones[3].text).toBe('TA');
    for (let k = 1; k < stones.length; k++) {
      expect(stones[k].cx - stones[k].rx).toBeGreaterThan(stones[k - 1].cx + stones[k - 1].rx);
    }
  });

  it('uses the whole word as one big stone when there are no syllables', () => {
    expect(wordStones({ word: 'tree', syllables: [] })).toEqual([{ text: 'tree', stressed: true }]);
  });

  it('builds the hop tip: hard on the big stone, light after it, then the rest', () => {
    expect(hopParts(MITIGATE)).toEqual([
      { kind: 'hard', text: 'MI' },
      { kind: 'light', text: 'ti' },
      { kind: 'then', text: 'gate' },
    ]);
  });
});

describe('recording', () => {
  it('lights one stone per share of the native word as the voice goes on', () => {
    expect(litStones(0, 3, 0.6)).toBe(0);
    expect(litStones(50, 3, 0.6)).toBe(1);
    expect(litStones(250, 3, 0.6)).toBe(2);
    expect(litStones(450, 3, 0.6)).toBe(3);
    expect(litStones(5000, 3, 0.6)).toBe(3);
    // No timings: 0.25 s a syllable.
    expect(litStones(260, 3, null)).toBe(2);
  });

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
  word_audio_url: null,
} as unknown as SpeakingSessionItem;

describe('native audio', () => {
  it('plays the word on its own when there is one, else its part of the sentence', () => {
    expect(nativeWord({ ...ITEM, word_audio_url: 'w.mp3' }, 'UK')).toEqual({ src: 'w.mp3' });
    expect(nativeWord(ITEM, 'UK')).toEqual({ src: 'uk.m4a', span: { start: 0.5, end: 1.1 }, madeAt: 1 });
  });

  it('plays one syllable from the timings, else the whole word', () => {
    expect(nativeSyllable(ITEM, 'UK', 1)).toEqual({ src: 'uk.m4a', span: { start: 0.7, end: 0.85 }, madeAt: 1 });
    expect(nativeSyllable(ITEM, 'UK', 5)).toEqual({ src: 'uk.m4a', span: { start: 0.5, end: 1.1 }, madeAt: 1 });
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
    { ipa: 'mɪt', score: 90, wobbly: false, heard_ipa: null },
    { ipa: 'ɪ', score: 40, wobbly: true, heard_ipa: 'aɪ' },
    { ipa: 'ɡeɪt', score: 85, wobbly: false, heard_ipa: null },
  ],
  spelling: MITIGATE,
  user_duration_ms: 900,
  check_ms: 300,
};

describe('result', () => {
  it('shows the first wobbly stone with what it sounded like', () => {
    expect(resultView(MITIGATE, CHECK)).toEqual({
      passed: false,
      stones: MITIGATE,
      wobbly: [false, true, false],
      first: { index: 1, text: 'ti', heardIpa: 'aɪ', ipa: 'ɪ' },
    });
  });

  it('turns every stone green on a pass', () => {
    const r = resultView(MITIGATE, { ...CHECK, passed: true });
    expect(r.wobbly).toEqual([false, false, false]);
    expect(r.first).toBeNull();
  });

  it('marks the lowest stone when a miss has no wobbly one', () => {
    const syllables = CHECK.syllables.map((s, k) => ({ ...s, wobbly: false, score: [70, 65, 75][k] }));
    expect(resultView(MITIGATE, { ...CHECK, syllables }).wobbly).toEqual([false, true, false]);
  });

  it("falls back to the check's own stones when the counts differ", () => {
    const r = resultView([{ text: 'mitigate', stressed: true }], CHECK);
    expect(r.stones).toEqual(MITIGATE);
  });
});

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
