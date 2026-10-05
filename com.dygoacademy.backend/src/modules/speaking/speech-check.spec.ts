import {
  BadRequestException,
  ExecutionContext,
  HttpException,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { DatabaseService } from '../../database/database.service';
import { SpeechCheckRateLimitGuard } from './speech-check-rate-limit.guard';
import { stageForScore, toCheckResult } from './speech-check.mapper';
import { SpeechCheckService } from './speech-check.service';
import { SPEECH_CHECKER, ScorerResult, SpeechCheckError } from './speech-checker';

const SENTENCE = 'Planting more trees can help mitigate the effects of climate change.';

function scorer(
  overrides: Partial<Record<number, Partial<ScorerResult['words'][number]>>> = {},
  total = 89,
): ScorerResult {
  return {
    total,
    heard_text: 'not used',
    duration_ms: 3500,
    latency_ms: 1650,
    words: SENTENCE.split(' ').map((text, index) => ({
      index,
      text,
      score: 95,
      status: 'ok',
      heard: null,
      start: null,
      end: null,
      ...overrides[index],
    })),
  };
}

const audio = (over: Partial<{ buffer: Buffer; mimetype: string }> = {}) => ({
  buffer: Buffer.from('fake-m4a'),
  mimetype: 'audio/mp4',
  filename: 'recording.m4a',
  ...over,
});

describe('toCheckResult (scorer reply → SP3 marks)', () => {
  it('maps missing, unclear with heard, and fine words, one per word of the sentence', () => {
    const r = toCheckResult(
      scorer({
        5: { status: 'unclear', heard: 'migrate' },
        6: { status: 'missing' },
        7: { status: 'unclear' },
      }),
      11,
    );
    expect(r.word_marks).toHaveLength(11);
    expect(r.word_marks[5]).toEqual({ index: 5, ok: false, reason: 'unclear', heard: 'migrate' });
    expect(r.word_marks[6]).toEqual({ index: 6, ok: false, reason: 'missing' });
    expect(r.word_marks[7]).toEqual({ index: 7, ok: false, reason: 'unclear' });
    expect(r.word_marks[0]).toEqual({ index: 0, ok: true, reason: null });
    expect(r).toMatchObject({ score: 89, stage: 'bloom', user_duration_ms: 3500, check_ms: 1650 });
  });

  it('never invents a mistake for a word the scorer left out, and clamps the score', () => {
    const raw = scorer({}, 104);
    raw.words = raw.words.filter((w) => w.index !== 3);
    const r = toCheckResult(raw, 11);
    expect(r.word_marks[3]).toEqual({ index: 3, ok: true, reason: null });
    expect(r.score).toBe(100);
    expect(r.stage).toBe('fruit');
  });

  it('stages: < 40 seed · 40–69 sprout · 70–89 bloom · ≥ 90 fruit', () => {
    expect([0, 39, 40, 69, 70, 89, 90, 100].map(stageForScore)).toEqual([
      'seed',
      'seed',
      'sprout',
      'sprout',
      'bloom',
      'bloom',
      'fruit',
      'fruit',
    ]);
  });
});

describe('SpeechCheckService', () => {
  async function make(queryAs: jest.Mock, check: jest.Mock) {
    const mod = await Test.createTestingModule({
      providers: [
        SpeechCheckService,
        { provide: DatabaseService, useValue: { queryAs } },
        { provide: SPEECH_CHECKER, useValue: { check } },
      ],
    }).compile();
    return mod.get(SpeechCheckService);
  }

  it("checks the item's sentence (read as the learner) and returns the marks", async () => {
    const queryAs = jest.fn().mockResolvedValue([{ sentence: SENTENCE, target_index: 5 }]);
    const check = jest.fn().mockResolvedValue(scorer({ 6: { status: 'missing' } }));
    const service = await make(queryAs, check);
    const r = await service.check('user-1', 'item-1', audio());
    expect(queryAs).toHaveBeenCalledWith('user-1', expect.stringContaining('speaking_items'), [
      'item-1',
    ]);
    expect(check).toHaveBeenCalledWith(
      expect.objectContaining({ mimetype: 'audio/mp4' }),
      SENTENCE,
      5, // the target word weighs more in the scorer's total (M4-a)
    );
    expect(r.word_marks[6].reason).toBe('missing');
  });

  it('refuses missing, oversized or non-audio uploads before touching the scorer', async () => {
    const check = jest.fn();
    const service = await make(jest.fn(), check);
    await expect(service.check('u', 'i', undefined)).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.check('u', 'i', audio({ buffer: Buffer.alloc(1_000_001) })),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
    await expect(service.check('u', 'i', audio({ mimetype: 'image/png' }))).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(check).not.toHaveBeenCalled();
  });

  it('accepts what browsers record: m4a, webm with codecs, wav', async () => {
    const check = jest.fn().mockResolvedValue(scorer());
    const service = await make(jest.fn().mockResolvedValue([{ sentence: SENTENCE }]), check);
    for (const mimetype of ['audio/mp4', 'audio/x-m4a', 'audio/webm;codecs=opus', 'audio/wav']) {
      await expect(service.check('u', 'i', audio({ mimetype }))).resolves.toBeDefined();
    }
  });

  it('404 for an unknown item', async () => {
    const service = await make(jest.fn().mockResolvedValue([]), jest.fn());
    await expect(service.check('u', 'missing', audio())).rejects.toBeInstanceOf(NotFoundException);
  });

  it('scorer down or too slow → 503 (SP3 "Couldn\'t check"); unusable audio → 422', async () => {
    const queryAs = jest.fn().mockResolvedValue([{ sentence: SENTENCE }]);
    for (const [kind, type] of [
      ['timeout', ServiceUnavailableException],
      ['unavailable', ServiceUnavailableException],
      ['bad_audio', UnprocessableEntityException],
    ] as const) {
      const service = await make(
        queryAs,
        jest.fn().mockRejectedValue(new SpeechCheckError(kind, kind)),
      );
      await expect(service.check('u', 'i', audio())).rejects.toBeInstanceOf(type);
    }
  });
});

describe('SpeechCheckRateLimitGuard', () => {
  const ctx = (id?: string) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user: id ? { id } : undefined }) }),
    }) as unknown as ExecutionContext;

  afterEach(() => {
    SpeechCheckRateLimitGuard.LIMIT = 60;
    SpeechCheckRateLimitGuard.WINDOW_MS = 60 * 60 * 1000;
  });

  it('allows LIMIT checks per user per window, then 429, per user', () => {
    SpeechCheckRateLimitGuard.LIMIT = 3;
    const guard = new SpeechCheckRateLimitGuard();
    for (let i = 0; i < 3; i++) expect(guard.canActivate(ctx('a'))).toBe(true);
    expect(() => guard.canActivate(ctx('a'))).toThrow(HttpException);
    try {
      guard.canActivate(ctx('a'));
    } catch (err) {
      expect((err as HttpException).getStatus()).toBe(429);
    }
    expect(guard.canActivate(ctx('b'))).toBe(true);
  });

  it('frees a slot once the oldest check leaves the window', () => {
    SpeechCheckRateLimitGuard.LIMIT = 1;
    SpeechCheckRateLimitGuard.WINDOW_MS = 1000;
    const now = jest.spyOn(Date, 'now');
    const guard = new SpeechCheckRateLimitGuard();
    now.mockReturnValue(10_000);
    expect(guard.canActivate(ctx('a'))).toBe(true);
    now.mockReturnValue(10_500);
    expect(() => guard.canActivate(ctx('a'))).toThrow(HttpException);
    now.mockReturnValue(11_001);
    expect(guard.canActivate(ctx('a'))).toBe(true);
    now.mockRestore();
  });
});
