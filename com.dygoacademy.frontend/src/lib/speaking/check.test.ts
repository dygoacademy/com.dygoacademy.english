import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SpeakingCheckResult } from '@/types';

const upload = vi.fn();
const get = vi.fn();
vi.mock('@/lib/api-client', () => {
  class ApiError extends Error {
    constructor(
      message: string,
      public readonly status: number,
    ) {
      super(message);
    }
  }
  return {
    ApiError,
    apiClient: { upload: (...a: unknown[]) => upload(...a), get: (...a: unknown[]) => get(...a) },
  };
});

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

describe('serverCheck (queue v1)', () => {
  afterEach(() => {
    upload.mockReset();
    get.mockReset();
  });
  const req = (type = 'audio/mp4') => ({
    recording: new Blob(['m4a'], { type }),
    itemId: 'item-1',
    accent: 'UK' as const,
    sentence: SENTENCE,
    targetIndex: TARGET,
  });
  const queued = { check_id: 'c1', status: 'queued', position: 1, eta_s: 3 };

  it('sends the recording as recorded, polls the check until done, then merges', async () => {
    upload.mockResolvedValue(queued);
    get
      .mockResolvedValueOnce({ check_id: 'c1', status: 'queued' })
      .mockResolvedValueOnce({ check_id: 'c1', status: 'checking' })
      .mockResolvedValueOnce({
        check_id: 'c1',
        status: 'done',
        result: server({ 6: { ok: false, reason: 'missing' } }),
      });
    const r = await serverCheck(req(), local(), { pollMs: 1 });
    const [path, form] = upload.mock.calls[0] as [string, FormData];
    expect(path).toBe('/speaking/check');
    expect((form.get('audio') as File).name).toBe('recording.m4a');
    expect(form.get('item_id')).toBe('item-1');
    expect(form.get('accent')).toBe('UK');
    expect(get).toHaveBeenCalledWith('/speaking/check/c1');
    expect(get).toHaveBeenCalledTimes(3);
    expect(r.wordMarks[6].reason).toBe('missing');
    expect(r.quick).toBeUndefined();
  });

  it('names a Chrome recording .webm', async () => {
    upload.mockResolvedValue(queued);
    get.mockResolvedValue({ check_id: 'c1', status: 'done', result: server() });
    await serverCheck(req('audio/webm;codecs=opus'), local(), { pollMs: 1 });
    expect(((upload.mock.calls[0][1] as FormData).get('audio') as File).name).toBe(
      'recording.webm',
    );
  });

  it("busy (503 on send): the phone's own result, marked quick, nothing polled", async () => {
    const { ApiError } = await import('@/lib/api-client');
    upload.mockRejectedValue(new ApiError('Speech checking is busy', 503));
    const r = await serverCheck(req(), local('stress_soft'), { pollMs: 1 });
    expect(r.quick).toBe(true);
    expect(r.score).toBe(82);
    expect(r.wordMarks[TARGET].reason).toBe('stress_soft');
    expect(get).not.toHaveBeenCalled();
  });

  it('a failed check rejects (→ SP3 "Couldn\'t check")', async () => {
    upload.mockResolvedValue(queued);
    get.mockResolvedValue({ check_id: 'c1', status: 'failed', reason: 'timeout' });
    await expect(serverCheck(req(), local(), { pollMs: 1 })).rejects.toThrow(
      'check failed: timeout',
    );
  });

  it('other send errors reject', async () => {
    upload.mockRejectedValue(new Error('network'));
    await expect(serverCheck(req(), local(), { pollMs: 1 })).rejects.toThrow('network');
  });

  it('gives up after the timeout and stops polling', async () => {
    upload.mockResolvedValue(queued);
    get.mockResolvedValue({ check_id: 'c1', status: 'queued' });
    await expect(serverCheck(req(), local(), { pollMs: 5, timeoutMs: 40 })).rejects.toThrow(
      'check timed out',
    );
    const calls = get.mock.calls.length;
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(get.mock.calls.length).toBeLessThanOrEqual(calls + 1);
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
