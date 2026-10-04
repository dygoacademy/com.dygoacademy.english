import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SpeakingCheckResult } from '@/types';

const upload = vi.fn();
vi.mock('@/lib/api-client', () => ({ apiClient: { upload: (...a: unknown[]) => upload(...a) } }));

import { mergeServerResult, serverCheck } from './check';
import { speechCheckMode, TIP_KEYS } from './constants';
import type { SpeakingResult } from './envelopeScorer';

const SENTENCE = 'Planting more trees can help mitigate the effects of climate change.';
const TOKENS = SENTENCE.split(' ');
const TARGET = 5;

const local = (targetReason: 'stress_soft' | null = null): SpeakingResult => ({
  score: 82,
  stage: 'bloom',
  wordMarks: TOKENS.map((_, index) => ({
    index,
    ok: !(index === TARGET && targetReason),
    reason: index === TARGET ? targetReason : index === 2 ? 'rushed' : null,
  })),
  userDurationMs: 3300,
  envelopes: { native: [0.1, 0.5], user: [0.2, 0.4] },
  tipKey: targetReason ? TIP_KEYS.stress : TIP_KEYS.flowed,
  tipParams: targetReason ? { word: 'mitigate', syllable: '0' } : undefined,
});

const server = (
  marks: Partial<Record<number, Partial<SpeakingCheckResult['word_marks'][number]>>> = {},
  score = 89,
): SpeakingCheckResult => ({
  score,
  stage: score >= 90 ? 'fruit' : 'bloom',
  word_marks: TOKENS.map((_, index) => ({ index, ok: true, reason: null, ...marks[index] })),
  user_duration_ms: 3500,
  check_ms: 1600,
});

describe('mergeServerResult (S18)', () => {
  it("uses the server's score, marks and length, and the phone's waveforms", () => {
    const r = mergeServerResult(
      server({ 6: { ok: false, reason: 'missing' } }),
      local(),
      TOKENS,
      TARGET,
    );
    expect(r).toMatchObject({ score: 89, stage: 'bloom', userDurationMs: 3500 });
    expect(r.envelopes).toEqual(local().envelopes);
    expect(r.wordMarks[6]).toEqual({ index: 6, ok: false, reason: 'missing' });
    expect(r.wordMarks[2]).toEqual({ index: 2, ok: true, reason: null }); // the phone's "rushed" is dropped
    expect(r.tipKey).toBe(TIP_KEYS.missing);
    expect(r.tipParams).toEqual({ words: 'the' });
  });

  it("adds the phone's stress verdict on the target word, and leads the tip with it", () => {
    const r = mergeServerResult(
      server({ 7: { ok: false, reason: 'unclear', heard: 'affects' } }),
      local('stress_soft'),
      TOKENS,
      TARGET,
    );
    expect(r.wordMarks[TARGET]).toEqual({ index: TARGET, ok: false, reason: 'stress_soft' });
    expect(r.wordMarks[7]).toEqual({ index: 7, ok: false, reason: 'unclear', heard: 'affects' });
    expect(r.tipKey).toBe(TIP_KEYS.stress);
    expect(r.tipParams).toEqual({ word: 'mitigate', syllable: '0' });
  });

  it("keeps the server's verdict when it already flagged the target word", () => {
    const r = mergeServerResult(
      server({ [TARGET]: { ok: false, reason: 'unclear', heard: 'migrate' } }),
      local('stress_soft'),
      TOKENS,
      TARGET,
    );
    expect(r.wordMarks[TARGET]).toEqual({
      index: TARGET,
      ok: false,
      reason: 'unclear',
      heard: 'migrate',
    });
    expect(r.tipKey).toBe(TIP_KEYS.unclear);
    expect(r.tipParams).toEqual({ word: 'mitigate', heard: 'migrate' });
  });

  it('unclear without a heard word, and "flowed well" when all is fine', () => {
    const unclear = mergeServerResult(
      server({ 9: { ok: false, reason: 'unclear' } }),
      local(),
      TOKENS,
      TARGET,
    );
    expect(unclear.tipParams).toEqual({ word: 'climate', heard: 'none' });
    const fine = mergeServerResult(server({}, 97), local(), TOKENS, TARGET);
    expect(fine.tipKey).toBe(TIP_KEYS.flowed);
    expect(fine.wordMarks.every((m) => m.ok)).toBe(true);
    expect(fine.stage).toBe('fruit');
  });
});

describe('serverCheck', () => {
  afterEach(() => upload.mockReset());

  it('uploads the recording as recorded with item and accent, then merges', async () => {
    upload.mockResolvedValue(server({ 6: { ok: false, reason: 'missing' } }));
    const recording = new Blob(['m4a'], { type: 'audio/mp4' });
    const r = await serverCheck(
      { recording, itemId: 'item-1', accent: 'UK', sentence: SENTENCE, targetIndex: TARGET },
      local(),
    );
    const [path, form] = upload.mock.calls[0] as [string, FormData];
    expect(path).toBe('/speaking/check');
    expect((form.get('audio') as File).name).toBe('recording.m4a');
    expect(form.get('item_id')).toBe('item-1');
    expect(form.get('accent')).toBe('UK');
    expect(r.wordMarks[6].reason).toBe('missing');
  });

  it('names a Chrome recording .webm', async () => {
    upload.mockResolvedValue(server());
    await serverCheck(
      {
        recording: new Blob(['x'], { type: 'audio/webm;codecs=opus' }),
        itemId: 'i',
        accent: 'US',
        sentence: SENTENCE,
        targetIndex: TARGET,
      },
      local(),
    );
    expect(((upload.mock.calls[0][1] as FormData).get('audio') as File).name).toBe(
      'recording.webm',
    );
  });

  it('rejects when the API fails (→ SP3 "Couldn\'t check")', async () => {
    upload.mockRejectedValue(new Error('503'));
    await expect(
      serverCheck(
        {
          recording: new Blob(['x'], { type: 'audio/mp4' }),
          itemId: 'i',
          accent: 'US',
          sentence: SENTENCE,
          targetIndex: TARGET,
        },
        local(),
      ),
    ).rejects.toThrow('503');
  });
});

describe('speechCheckMode', () => {
  it('is local unless set to server', () => {
    expect(speechCheckMode(undefined)).toBe('local');
    expect(speechCheckMode('')).toBe('local');
    expect(speechCheckMode('SERVER')).toBe('local');
    expect(speechCheckMode('server')).toBe('server');
  });
});
