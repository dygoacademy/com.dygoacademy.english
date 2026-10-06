import {
  BadRequestException,
  ExecutionContext,
  HttpException,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Queue } from 'bullmq';

import { DatabaseService } from '../../database/database.service';
import { SpeechCheckRateLimitGuard } from './speech-check-rate-limit.guard';
import { stageForScore, toCheckResult } from './speech-check.mapper';
import { SpeechCheckJob } from '../../queues/queue.constants';
import { SpeechCheckProcessor } from './speech-check.processor';
import { SpeechCheckService } from './speech-check.service';
import { AUDIO_TTL_MS, RESULT_TTL_MS, ScorerPool, SpeechCheckStore } from './speech-check.store';
import { ScorerResult, SpeechCheckError } from './speech-checker';

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

describe('SpeechCheckService (queue v1)', () => {
  function make(
    opts: {
      rows?: unknown[];
      waiting?: number;
      active?: number;
      scorers?: number;
      busyEta?: number;
    } = {},
  ) {
    const queryAs = jest
      .fn()
      .mockResolvedValue(opts.rows ?? [{ sentence: SENTENCE, target_index: 5 }]);
    const queue = {
      getWaitingCount: jest.fn().mockResolvedValue(opts.waiting ?? 0),
      getActiveCount: jest.fn().mockResolvedValue(opts.active ?? 0),
      add: jest.fn().mockResolvedValue({}),
    };
    const store = new SpeechCheckStore();
    const config = {
      get: (key: string) =>
        ({
          'speech.scorerUrls': Array.from({ length: opts.scorers ?? 2 }, (_, i) => `http://s${i}`),
          'speech.busyEtaSeconds': opts.busyEta ?? 15,
        })[key],
    } as unknown as ConfigService;
    const service = new SpeechCheckService(
      { queryAs } as unknown as DatabaseService,
      store,
      config,
      queue as unknown as Queue<SpeechCheckJob>,
    );
    return { service, queryAs, queue, store };
  }

  it('queues ids only (never the audio), keeps the recording in memory, answers at once', async () => {
    const { service, queryAs, queue, store } = make({ waiting: 1, active: 1 });
    const r = await service.enqueue('user-1', 'item-1', audio());
    expect(queryAs).toHaveBeenCalledWith('user-1', expect.stringContaining('speaking_items'), [
      'item-1',
    ]);
    expect(r).toMatchObject({ status: 'queued', position: 2, eta_s: 4 }); // (2 + 1) / 2 scorers × 2.5 s, rounded up
    const [name, job, opts] = queue.add.mock.calls[0];
    expect(name).toBe('speech-check');
    expect(job).toEqual({
      checkId: r.check_id,
      userId: 'user-1',
      sentence: SENTENCE,
      targetIndex: 5,
    });
    expect(JSON.stringify(job)).not.toContain('fake-m4a');
    expect(opts).toMatchObject({ jobId: r.check_id, attempts: 1 });
    expect(store.takeAudio(r.check_id)?.buffer.toString()).toBe('fake-m4a');
  });

  it('busy: refuses with 503 when the wait would pass the limit, keeping nothing', async () => {
    const { service, queue, store } = make({ waiting: 20, active: 2, scorers: 2, busyEta: 15 });
    await expect(service.enqueue('u', 'i', audio())).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(queue.add).not.toHaveBeenCalled();
    expect(store.size()).toBe(0);
  });

  it('refuses missing, oversized or non-audio uploads, and unknown items', async () => {
    const { service, queue } = make();
    await expect(service.enqueue('u', 'i', undefined)).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.enqueue('u', 'i', audio({ buffer: Buffer.alloc(1_000_001) })),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
    await expect(
      service.enqueue('u', 'i', audio({ mimetype: 'image/png' })),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(make({ rows: [] }).service.enqueue('u', 'i', audio())).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('accepts what browsers record: m4a, webm with codecs, wav', async () => {
    const { service } = make();
    for (const mimetype of ['audio/mp4', 'audio/x-m4a', 'audio/webm;codecs=opus', 'audio/wav']) {
      await expect(service.enqueue('u', 'i', audio({ mimetype }))).resolves.toBeDefined();
    }
  });

  it('status: only the owner can read a check; done carries the result', async () => {
    const { service, store } = make();
    const { check_id } = await service.enqueue('owner', 'i', audio());
    expect(service.status('owner', check_id)).toEqual({ check_id, status: 'queued' });
    expect(() => service.status('someone-else', check_id)).toThrow(NotFoundException);
    store.takeAudio(check_id);
    expect(service.status('owner', check_id).status).toBe('checking');
    store.done(check_id, toCheckResult(scorer({ 6: { status: 'missing' } }), 11));
    const done = service.status('owner', check_id);
    expect(done.status).toBe('done');
    expect(done.result?.word_marks[6].reason).toBe('missing');
  });
});

describe('SpeechCheckStore and ScorerPool', () => {
  it('hands a recording out once, then forgets it', () => {
    const store = new SpeechCheckStore();
    store.add('c1', 'u', audio(), 0);
    expect(store.takeAudio('c1', 1)).not.toBeNull();
    expect(store.takeAudio('c1', 2)).toBeNull();
    store.onModuleDestroy();
  });

  it('a recording waiting too long expires: the check reads failed / expired', () => {
    const store = new SpeechCheckStore();
    store.add('c1', 'u', audio(), 0);
    expect(store.takeAudio('c1', AUDIO_TTL_MS + 1)).toBeNull();
    store.add('c2', 'u', audio(), 0);
    expect(store.get('c2', 'u', AUDIO_TTL_MS + 1)).toEqual({
      status: 'failed',
      reason: 'expired',
      result: undefined,
    });
    store.onModuleDestroy();
  });

  it('results go after 10 minutes', () => {
    const store = new SpeechCheckStore();
    store.add('c1', 'u', audio(), 0);
    expect(store.get('c1', 'u', RESULT_TTL_MS - 1)).not.toBeNull();
    expect(store.get('c1', 'u', RESULT_TTL_MS + 1)).toBeNull();
    store.sweep(RESULT_TTL_MS + 1);
    expect(store.size()).toBe(0);
    store.onModuleDestroy();
  });

  it('the pool gives each scorer one check at a time, spreading the load', () => {
    const pool = new ScorerPool(['a', 'b']);
    const first = pool.acquire();
    const second = pool.acquire();
    expect(new Set([first, second])).toEqual(new Set(['a', 'b']));
    expect(() => pool.acquire()).toThrow('no free speech scorer');
    pool.release(first);
    expect(pool.acquire()).toBe(first);
    expect(() => new ScorerPool([])).toThrow();
  });
});

describe('SpeechCheckProcessor', () => {
  function make(check: jest.Mock) {
    const store = new SpeechCheckStore();
    const config = {
      get: () => ['http://s0', 'http://s1'],
    } as unknown as ConfigService;
    const processor = new SpeechCheckProcessor(store, { check }, config);
    const job = (checkId: string) =>
      ({
        data: { checkId, userId: 'u', sentence: SENTENCE, targetIndex: 5 },
      }) as Job<SpeechCheckJob>;
    return { store, processor, job };
  }

  it('takes the recording, checks it on a scorer with the target index, stores the marks', async () => {
    const check = jest.fn().mockResolvedValue(scorer({ 6: { status: 'missing' } }));
    const { store, processor, job } = make(check);
    store.add('c1', 'u', audio());
    await processor.process(job('c1'));
    expect(check).toHaveBeenCalledWith(
      expect.objectContaining({ mimetype: 'audio/mp4' }),
      SENTENCE,
      5,
      expect.stringMatching(/^http:\/\/s[01]$/),
    );
    expect(store.get('c1', 'u')?.result?.word_marks[6].reason).toBe('missing');
    expect(store.takeAudio('c1')).toBeNull(); // the recording is gone
    store.onModuleDestroy();
  });

  it('records why a check failed instead of throwing (no BullMQ retry)', async () => {
    for (const [err, reason] of [
      [new SpeechCheckError('timeout', 't'), 'timeout'],
      [new SpeechCheckError('bad_audio', 'b'), 'bad_audio'],
      [new Error('boom'), 'unavailable'],
    ] as const) {
      const { store, processor, job } = make(jest.fn().mockRejectedValue(err));
      store.add('c1', 'u', audio());
      await expect(processor.process(job('c1'))).resolves.toBeUndefined();
      expect(store.get('c1', 'u')).toMatchObject({ status: 'failed', reason });
      store.onModuleDestroy();
    }
  });

  it('a recording that is gone (expired, restart) fails as expired without calling a scorer', async () => {
    const check = jest.fn();
    const { store, processor, job } = make(check);
    store.add('c1', 'u', audio(), Date.now() - AUDIO_TTL_MS - 1);
    await processor.process(job('c1'));
    expect(check).not.toHaveBeenCalled();
    expect(store.get('c1', 'u')).toMatchObject({ status: 'failed', reason: 'expired' });
    store.onModuleDestroy();
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
