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
  layoutResultStones,
  layoutStones,
  slowWord,
  stoneTextWidth,
  takeSyllable,
  litStones,
  nativeClipRate,
  nativeSyllable,
  nativeWord,
  pronVoiceEnded,
  resultView,
  stoneShares,
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

  it('makes every stone wide enough for its text, inside the card (CONDITIONAL, 2026-10-18)', () => {
    const one = layoutStones([{ text: 'conditional', stressed: true }], 'phone', 120);
    expect(one[0].text).toBe('CONDITIONAL');
    expect(one[0].rx * 2).toBeGreaterThan(stoneTextWidth('CONDITIONAL', one[0].fontSize) + one[0].fontSize);
    expect(one[0].cx - one[0].rx).toBeGreaterThanOrEqual(10);
    expect(one[0].cx + one[0].rx).toBeLessThanOrEqual(324);

    const four = ['con', 'di', 'tio', 'nal'].map((text, k) => ({ text, stressed: k === 1 }));
    for (const size of ['phone', 'ipad'] as const) {
      const stones = layoutStones(four, size, 120);
      const width = size === 'phone' ? 334 : 560;
      stones.forEach((st, k) => {
        expect(st.rx * 2).toBeGreaterThan(stoneTextWidth(st.text, st.fontSize));
        expect(st.cx - st.rx).toBeGreaterThanOrEqual(width * 0.03 - 0.1);
        expect(st.cx + st.rx).toBeLessThanOrEqual(width * 0.97 + 0.1);
        if (k > 0) expect(st.cx - st.rx).toBeGreaterThan(stones[k - 1].cx + stones[k - 1].rx);
      });
    }
    // The board's numbers (P4-result-long-word).
    expect(layoutStones(four, 'phone', 120).map((s) => [s.text, Math.round(s.cx), s.fontSize])).toEqual([
      ['con', 43, 16],
      ['DI', 129, 20],
      ['tio', 214, 16],
      ['nal', 291, 16],
    ]);
  });

  it('never makes one stone for the whole word: no stored syllables, no stones (the word is blocked)', () => {
    expect(wordStones({ syllables: [] })).toEqual([]);
    expect(wordStones({ syllables: undefined })).toEqual([]);
    expect(
      wordStones({ syllables: [{ text: 'cloud', stressed: true, start_ms: null, end_ms: null }] }),
    ).toHaveLength(1);
  });

  it('P4 v2: one slot of 334/n per stone, the board sizes (big 52 x 22, small 36 x 15)', () => {
    const s = layoutResultStones(MITIGATE);
    expect(s.map((x) => [x.text, x.cx, x.cy, x.rx, x.ry, x.fontPx])).toEqual([
      ['MI', 55.7, 100, 51.7, 22, 23],
      ['ti', 167, 104, 36, 15, 17],
      ['gate', 278.3, 104, 36, 15, 17],
    ]);
    expect(s[0]).toMatchObject({ ringRx: 58.7, ringRy: 28, left: '16.68%', top: '66.67%' });
    // compensation (board): com · pen · SA · tion
    const c = layoutResultStones([
      { text: 'com', stressed: false },
      { text: 'pen', stressed: false },
      { text: 'sa', stressed: true },
      { text: 'tion', stressed: false },
    ]);
    expect(c.map((x) => x.rx)).toEqual([27.8, 27.8, 37.8, 27.8]);
    expect(c.every((x) => x.fontPx === (x.stressed ? 23 : 17))).toBe(true);
    // Six stones: the text shrinks to fit its stone, never past it.
    const six = layoutResultStones(
      ['in', 'ter', 'na', 'tio', 'nal', 'ly'].map((text, k) => ({ text, stressed: k === 2 })),
    );
    six.forEach((x) => expect(stoneTextWidth(x.text, x.fontPx)).toBeLessThanOrEqual(2 * x.rx - 8));
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

  it('plays one syllable from the timings, else the whole word', () => {
    expect(nativeSyllable(ITEM, 'UK', 1)).toEqual({ src: 'uk.m4a', span: { start: 0.7, end: 0.85 }, madeAt: 1 });
    expect(nativeSyllable(ITEM, 'UK', 5)).toEqual({ src: 'uk.m4a', span: { start: 0.5, end: 1.1 }, madeAt: 1 });
    // The timings count other syllables than the stones: the whole word.
    const more = { ...ITEM, syllables: [...ITEM.syllables, { text: 'x', stressed: false }] };
    expect(nativeSyllable(more, 'UK', 1)).toEqual({ src: 'uk.m4a', span: { start: 0.5, end: 1.1 }, madeAt: 1 });
  });
});

describe('compare your voice', () => {
  it('keeps the voiced bars: the tap click, quiet ends and the trailing silence go', () => {
    const take = [...run(100, 0.5), ...run(200, 0.0001), ...run(500, 0.2), ...run(1000, 0.0001)];
    expect(voicedBars(take, BPS, 150)).toEqual(run(500, 0.2));
    expect(voicedBars(run(500, 0.00001), BPS)).toEqual([]);
  });

  it('splits the word by the native syllable timings, else by letters', () => {
    const byTime = stoneShares(MITIGATE, ITEM, 'UK');
    expect(byTime.map((v) => +v.toFixed(3))).toEqual([0.333, 0.25, 0.417]);
    expect(stoneShares(MITIGATE, ITEM, 'US').map((v) => +v.toFixed(3))).toEqual([0.333, 0.25, 0.417]);
    const noTimings = { ...ITEM, timings_uk: null } as SpeakingSessionItem;
    expect(stoneShares(MITIGATE, noTimings, 'UK')).toEqual([0.25, 0.25, 0.5]);
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

describe('result', () => {
  it('a retry: the wobbly stone is selected, with what it sounded like', () => {
    expect(resultView(MITIGATE, CHECK)).toEqual({
      passed: false,
      outcome: 'retry',
      stones: MITIGATE,
      states: ['clean', 'wobbly', 'clean'],
      wobbly: [false, true, false],
      selected: 1,
      clean: 2,
      first: { index: 1, text: 'ti', heardIpa: 'aɪ', ipa: 'ɪ' },
    });
  });

  it('a pass at 80+ with every syllable 85+ is clean, nothing selected', () => {
    const syllables = CHECK.syllables.map((x) => ({ ...x, score: 90 }));
    const r = resultView(MITIGATE, { total: 88, syllables });
    expect(r?.outcome).toBe('pass');
    expect(r?.states).toEqual(['clean', 'clean', 'clean']);
    expect(r?.first).toBeNull();
  });

  it('marks the lowest stone when a miss has no syllable under 60', () => {
    const syllables = CHECK.syllables.map((x, k) => ({ ...x, wobbly: false, score: [70, 65, 75][k] }));
    expect(resultView(MITIGATE, { total: 70, syllables })?.states).toEqual(['clean', 'wobbly', 'clean']);
  });

  it('a scorer split unlike the stones is no result (P3 treats it as a scoring error)', () => {
    expect(resultView([{ text: 'mitigate', stressed: true }], CHECK)).toBeNull();
    expect(resultView([], CHECK)).toBeNull();
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

describe('stored syllable clips (pronunciation v2)', () => {
  it("Hear a stone: its stored span inside the accent's word clip", () => {
    const item = {
      syllables_clip_url: 'https://m/word-uk.m4a',
      syllables: [
        { text: 'mi', stressed: true, start_ms: 30, end_ms: 210 },
        { text: 'ti', stressed: false, start_ms: 210, end_ms: 436 },
      ],
    } as SpeakingSessionItem;
    expect(nativeSyllable(item, 'UK', 1)).toEqual({
      src: 'https://m/word-uk.m4a',
      span: { start: 0.21, end: 0.436 },
    });
  });

  it('"You" on a stone: its time in the take, null when the scorer gave none', () => {
    expect(takeSyllable(CHECK, 1)).toEqual({ start: 0.22, end: 0.4 });
    expect(takeSyllable(CHECK, 2)).toBeNull();
  });

  it('Slowly: the slow clip at 1x, else the word clip at 0.7', () => {
    const slow = {
      word_audio_slow_url_us: 'https://m/slow-us.m4a',
      word_audio_url_us: 'https://m/us.m4a',
    } as SpeakingSessionItem;
    expect(slowWord(slow, 'UK')).toEqual({ clip: { src: 'https://m/slow-us.m4a' }, rate: 1 });
    const none = { word_audio_url_us: 'https://m/us.m4a' } as SpeakingSessionItem;
    expect(slowWord(none, 'US')).toEqual({ clip: { src: 'https://m/us.m4a' }, rate: 0.7 });
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
