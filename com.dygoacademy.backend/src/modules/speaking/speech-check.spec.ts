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
import { stageForScore, toCheckResult, toWordCheckResult } from './speech-check.mapper';
import { SpeechCheckJob } from '../../queues/queue.constants';
import { SpeechCheckProcessor } from './speech-check.processor';
import { SpeechCheckService } from './speech-check.service';
import { AUDIO_TTL_MS, RESULT_TTL_MS, ScorerPool, SpeechCheckStore } from './speech-check.store';
import { SyllableMismatchError } from './pronunciation-word';
import { ScorerResult, ScorerWordResult, SpeechCheckError } from './speech-checker';
import type { SpeakingCheckResult, SpeakingWordCheckResult } from './speaking.types';
import type { VoiceDonationService } from '../voice-donation/voice-donation.service';

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
    expect((done.result as SpeakingCheckResult).word_marks[6].reason).toBe('missing');
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

function makeProcessor(
  check: jest.Mock,
  checkWord: jest.Mock = jest.fn(),
  queryAs: jest.Mock = jest.fn(),
  keep: jest.Mock = jest.fn().mockResolvedValue(false),
) {
  const store = new SpeechCheckStore();
  const config = {
    get: () => ['http://s0', 'http://s1'],
  } as unknown as ConfigService;
  const processor = new SpeechCheckProcessor(
    store,
    { check, checkWord },
    config,
    { queryAs } as unknown as DatabaseService,
    { keep } as unknown as VoiceDonationService,
  );
  const job = (checkId: string) =>
    ({
      data: {
        checkId,
        userId: 'u',
        sentence: SENTENCE,
        targetIndex: 5,
        accent: 'UK',
        device: 'phone',
      },
    }) as Job<SpeechCheckJob>;
  return { store, processor, job, keep };
}
describe('SpeechCheckProcessor', () => {
  const make = makeProcessor;

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
    expect((store.get('c1', 'u')?.result as SpeakingCheckResult).word_marks[6].reason).toBe(
      'missing',
    );
    expect(store.takeAudio('c1')).toBeNull(); // the recording is gone
    store.onModuleDestroy();
  });

  it('voice donation: hands the scored recording and its metadata to keep(), after the result', async () => {
    const raw = scorer({});
    const { store, processor, job, keep } = make(jest.fn().mockResolvedValue(raw));
    store.add('c1', 'u', audio());
    await processor.process(job('c1'));
    expect(store.get('c1', 'u')?.status).toBe('done');
    expect(keep).toHaveBeenCalledWith('u', expect.objectContaining({ mimetype: 'audio/mp4' }), {
      kind: 'sentence',
      text: SENTENCE,
      targetIpa: null,
      accent: 'UK',
      device: 'phone',
      scores: raw,
    });
    store.onModuleDestroy();
  });

  it('deletes the recording right after scoring when the learner has not opted in', async () => {
    const rec = audio();
    const { store, processor, job, keep } = make(jest.fn().mockResolvedValue(scorer({})));
    store.add('c1', 'u', rec);
    await processor.process(job('c1'));
    await new Promise((r) => setImmediate(r));
    expect(keep).toHaveBeenCalled(); // keep() finds no active consent and keeps nothing
    expect(rec.buffer.every((b) => b === 0)).toBe(true);
    store.onModuleDestroy();
  });

  it('opted in: the donation copy is made from the recording before it is deleted', async () => {
    const rec = audio();
    let copied: string | null = null;
    const keep = jest.fn(async (_u: string, a: { buffer: Buffer }) => {
      await new Promise((r) => setTimeout(r, 5));
      copied = a.buffer.toString('hex');
      return true;
    });
    const original = rec.buffer.toString('hex');
    const { store, processor, job } = makeProcessor(
      jest.fn().mockResolvedValue(scorer({})),
      jest.fn(),
      jest.fn(),
      keep,
    );
    store.add('c1', 'u', rec);
    await processor.process(job('c1'));
    await new Promise((r) => setTimeout(r, 20));
    expect(copied).toBe(original);
    expect(rec.buffer.every((b) => b === 0)).toBe(true);
    store.onModuleDestroy();
  });

  it('a failed check deletes the recording too', async () => {
    const rec = audio();
    const { store, processor, job } = make(jest.fn().mockRejectedValue(new Error('boom')));
    store.add('c1', 'u', rec);
    await processor.process(job('c1'));
    await new Promise((r) => setImmediate(r));
    expect(rec.buffer.every((b) => b === 0)).toBe(true);
    store.onModuleDestroy();
  });

  it('voice donation: a failed check keeps nothing', async () => {
    const { store, processor, job, keep } = make(jest.fn().mockRejectedValue(new Error('boom')));
    store.add('c1', 'u', audio());
    await processor.process(job('c1'));
    expect(keep).not.toHaveBeenCalled();
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

describe('Word check (Pronunciation, 2026-10-11)', () => {
  const MITIGATE = '/ˈmɪt.ɪ.ɡeɪt/';
  const STONES = [
    { text: 'mi', stressed: true },
    { text: 'ti', stressed: false },
    { text: 'gate', stressed: false },
  ];
  const STORED = STONES.map((x) => ({ ...x, start_ms: null, end_ms: null }));
  const raw = (over: Partial<ScorerWordResult> = {}): ScorerWordResult => ({
    status: 'ok',
    total: 76,
    heard_text: 'mitigate',
    duration_ms: 900,
    latency_ms: 700,
    syllables: [
      {
        ipa: 'ˈmɪt',
        text: 'mi',
        score: 91,
        wobbly: false,
        heard_ipa: null,
        start_ms: 90,
        end_ms: 220,
      },
      {
        ipa: 'ɪ',
        text: 'ti',
        score: 48,
        wobbly: true,
        heard_ipa: 'aɪ',
        start_ms: 220,
        end_ms: 380,
      },
      {
        ipa: 'ɡeɪt',
        text: 'gate',
        score: 88,
        wobbly: false,
        heard_ipa: null,
        start_ms: 380,
        end_ms: 640,
      },
    ],
    ...over,
  });

  it('passed = heard as the word at 80+; the stones are the stored ones', () => {
    const almost = toWordCheckResult(raw(), STONES);
    expect(almost).toMatchObject({ kind: 'word', status: 'ok', passed: false, total: 76 });
    expect(almost.spelling).toEqual(STONES);
    expect(almost.syllables[1]).toEqual({
      ipa: 'ɪ',
      text: 'ti',
      score: 48,
      wobbly: true,
      heard_ipa: 'aɪ',
      start_ms: 220,
      end_ms: 380,
    });
    expect(toWordCheckResult(raw({ total: 80 }), STONES).passed).toBe(true);
    expect(toWordCheckResult(raw({ total: 79 }), STONES).passed).toBe(false);
    expect(toWordCheckResult(raw({ status: 'not_heard', total: 90 }), STONES).passed).toBe(false);
    expect(toWordCheckResult(raw({ status: 'other_word', total: 40 }), STONES)).toMatchObject({
      status: 'other_word',
      passed: false,
    });
  });

  function service(rows: unknown[]) {
    const queryAs = jest.fn().mockResolvedValue(rows);
    const queue = {
      getWaitingCount: jest.fn().mockResolvedValue(0),
      getActiveCount: jest.fn().mockResolvedValue(0),
      add: jest.fn().mockResolvedValue({}),
    };
    const config = {
      get: (key: string) =>
        ({ 'speech.scorerUrls': ['http://s0'], 'speech.busyEtaSeconds': 15 })[key],
    } as unknown as ConfigService;
    const s = new SpeechCheckService(
      { queryAs } as unknown as DatabaseService,
      new SpeechCheckStore(),
      config,
      queue as unknown as Queue<SpeechCheckJob>,
    );
    return { s, queryAs, queue };
  }

  it('queues the word, its IPA and its stored stones for the accent, read as the learner; 404 when unreadable', async () => {
    const word = {
      lexicon_id: 'lex-1',
      word: 'mitigate',
      ipa_uk: MITIGATE,
      ipa_us: '/ˈmɪt̬.ə.ɡeɪt/',
      syllables_us: STORED,
      syllables_uk: STORED,
    };
    const { s, queryAs, queue } = service([word]);
    const r = await s.enqueueWord('u', 'tw-1', 'UK', audio(), { device: 'tablet' });
    expect(queryAs).toHaveBeenCalledWith('u', expect.stringContaining('topic_words'), ['tw-1']);
    expect(queue.add.mock.calls[0][1]).toEqual({
      kind: 'word',
      checkId: r.check_id,
      userId: 'u',
      word: 'mitigate',
      ipa: MITIGATE,
      stones: STONES,
      lexiconId: 'lex-1',
      accent: 'UK',
      device: 'tablet',
    });
    await s.enqueueWord('u', 'tw-1', 'US', audio());
    expect(queue.add.mock.calls[1][1].ipa).toBe('/ˈmɪt̬.ə.ɡeɪt/');
    // No UK IPA: the US one is used.
    const { s: s2, queue: q2 } = service([{ ...word, ipa_uk: null }]);
    await s2.enqueueWord('u', 'tw-1', 'UK', audio());
    expect(q2.add.mock.calls[0][1].ipa).toBe('/ˈmɪt̬.ə.ɡeɪt/');
    await expect(service([]).s.enqueueWord('u', 'tw-x', 'UK', audio())).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(s.enqueueWord('u', 'tw-1', 'UK', undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('refuses a word with no stored stones (blocked: no_syllables), queuing nothing', async () => {
    const { s, queue } = service([
      {
        lexicon_id: 'lex-2',
        word: 'flat tyre',
        ipa_uk: null,
        ipa_us: null,
        syllables_us: null,
        syllables_uk: null,
      },
    ]);
    await expect(s.enqueueWord('u', 'tw-2', 'US', audio())).rejects.toMatchObject({
      message: 'no_syllables',
    });
    expect(queue.add).not.toHaveBeenCalled();
  });

  const wordJob = (checkId: string) =>
    ({
      data: {
        kind: 'word',
        checkId,
        userId: 'u',
        word: 'mitigate',
        ipa: MITIGATE,
        stones: STONES,
        lexiconId: 'lex-1',
      },
    }) as Job<SpeechCheckJob>;

  it('a passed word is pollinated, as the learner, once (never SRS)', async () => {
    const checkWord = jest.fn().mockResolvedValue(raw({ total: 86 }));
    const queryAs = jest
      .fn()
      .mockResolvedValueOnce([{ id: 'h1' }])
      .mockResolvedValueOnce([]);
    const { store, processor } = makeProcessor(jest.fn(), checkWord, queryAs);
    store.add('w1', 'u', audio());
    await processor.process(wordJob('w1'));
    expect(checkWord).toHaveBeenCalledWith(
      expect.objectContaining({ mimetype: 'audio/mp4' }),
      'mitigate',
      MITIGATE,
      STONES,
      expect.stringMatching(/^http:\/\/s[01]$/),
    );
    expect(queryAs).toHaveBeenCalledWith(
      'u',
      expect.stringMatching(
        /insert into public\.speaking_harvests[\s\S]*on conflict \(user_id, lexicon_id\) do nothing/,
      ),
      ['lex-1', 86],
    );
    expect(String(queryAs.mock.calls[0][1])).not.toMatch(/user_word_srs/);
    const first = store.get('w1', 'u')?.result as SpeakingWordCheckResult;
    expect(first).toMatchObject({ passed: true, pollinated: true });
    // Said well again the same day: no second row.
    store.add('w2', 'u', audio());
    await processor.process(wordJob('w2'));
    expect((store.get('w2', 'u')?.result as SpeakingWordCheckResult).pollinated).toBe(false);
    store.onModuleDestroy();
  });

  it('not passed, not heard or another word: nothing is written', async () => {
    for (const r of [
      raw(),
      raw({ status: 'not_heard', total: 0 }),
      raw({ status: 'other_word', total: 30 }),
    ]) {
      const queryAs = jest.fn();
      const { store, processor } = makeProcessor(
        jest.fn(),
        jest.fn().mockResolvedValue(r),
        queryAs,
      );
      store.add('w1', 'u', audio());
      await processor.process(wordJob('w1'));
      expect(queryAs).not.toHaveBeenCalled();
      expect(store.get('w1', 'u')?.result).toMatchObject({
        status: r.status,
        passed: false,
        pollinated: false,
      });
      store.onModuleDestroy();
    }
  });

  it('a scorer split unlike the stones fails the check as syllable_mismatch (P3 Check again)', async () => {
    const { store, processor } = makeProcessor(
      jest.fn(),
      jest.fn().mockRejectedValue(new SyllableMismatchError(3, 2)),
    );
    store.add('w1', 'u', audio());
    await processor.process(wordJob('w1'));
    expect(store.get('w1', 'u')).toMatchObject({ status: 'failed', reason: 'syllable_mismatch' });
    store.onModuleDestroy();
  });

  it('a failed save still shows the result', async () => {
    const queryAs = jest.fn().mockRejectedValue(new Error('check constraint'));
    const { store, processor } = makeProcessor(
      jest.fn(),
      jest.fn().mockResolvedValue(raw({ total: 95 })),
      queryAs,
    );
    store.add('w1', 'u', audio());
    await processor.process(wordJob('w1'));
    expect(store.get('w1', 'u')).toMatchObject({
      status: 'done',
      result: { passed: true, pollinated: false },
    });
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
