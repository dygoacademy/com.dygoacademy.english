import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Job } from 'bullmq';

import { DatabaseService } from '../database/database.service';
import { PushDispatchService } from '../modules/notifications/push-dispatch.service';
import { computeSrsSummary, SrsService } from '../modules/srs/srs.service';
import { NotificationCronJob } from '../queues/queue.constants';
import { NotificationProcessor } from './notification.processor';

function makeJob(tickAt = '2026-09-01T20:00:00.000Z'): Job<NotificationCronJob> {
  return { data: { tickAt } } as unknown as Job<NotificationCronJob>;
}

/**
 * The worker's queries, answered by SQL text rather than call order (the
 * stats queries run in parallel). `rows` overrides one learner's answers.
 */
function learnerDb(
  rows: Record<string, Partial<Record<'tz' | 'totals' | 'learner', unknown>>> = {},
) {
  const answer = (userId: string, text: string) => {
    const r = rows[userId] ?? {};
    if (text.includes('select timezone from public.profiles')) return r.tz ?? [{ timezone: 'UTC' }];
    if (text.includes('from public.user_word_srs')) {
      const totals = r.totals ?? [{ due_now: '0', leech_count: '0' }];
      if (totals instanceof Error) throw totals;
      return totals;
    }
    if (text.includes('studied_today'))
      return r.learner ?? [{ ui_locale: null, studied_today: false }];
    if (text.includes('select display_name')) return [{ display_name: null }];
    return [];
  };
  return jest.fn((userId: string, text: string) =>
    Promise.resolve().then(() => answer(userId, text)),
  );
}

describe('NotificationProcessor', () => {
  let queryAsServiceMock: jest.Mock;
  let queryAsMock: jest.Mock;
  let queryMock: jest.Mock;
  let sendToUserMock: jest.Mock;
  let processor: NotificationProcessor;

  async function build(learners: Parameters<typeof learnerDb>[0] = {}) {
    queryAsServiceMock = jest.fn();
    queryAsMock = learnerDb(learners);
    queryMock = jest
      .fn()
      .mockRejectedValue(new Error('permission denied (authenticator has no grants)'));
    sendToUserMock = jest.fn().mockResolvedValue({ sent: 1, pruned: 0, failed: 0 });

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationProcessor,
        {
          provide: DatabaseService,
          useValue: { query: queryMock, queryAs: queryAsMock, queryAsService: queryAsServiceMock },
        },
        { provide: PushDispatchService, useValue: { sendToUser: sendToUserMock } },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:3000') },
        },
      ],
    }).compile();

    processor = moduleRef.get(NotificationProcessor);
  }

  it('reads due schedules as service_role, never as bare authenticator', async () => {
    await build();
    queryAsServiceMock.mockResolvedValueOnce([]);

    await processor.process(makeJob());

    expect(queryAsServiceMock.mock.calls[0][0]).toContain('from public.study_schedules');
    expect(queryMock).not.toHaveBeenCalled();
    expect(sendToUserMock).not.toHaveBeenCalled();
  });

  it("reads each learner's numbers RLS-scoped as that learner", async () => {
    await build({ 'user-1': { totals: [{ due_now: '2', leech_count: '0' }] } });
    queryAsServiceMock.mockResolvedValueOnce([{ user_id: 'user-1' }]);

    await processor.process(makeJob());

    expect(queryAsMock.mock.calls.length).toBeGreaterThan(0);
    expect(queryAsMock.mock.calls.every(([userId]) => userId === 'user-1')).toBe(true);
    expect(queryMock).not.toHaveBeenCalled();
    expect(sendToUserMock.mock.calls[0][1].tag).toBe('habit');
  });

  it('nudges a matched learner with nothing due who has not studied today', async () => {
    await build({ 'user-1': { learner: [{ ui_locale: 'vi-VN', studied_today: false }] } });
    queryAsServiceMock.mockResolvedValueOnce([{ user_id: 'user-1' }]);

    await processor.process(makeJob());

    expect(sendToUserMock).toHaveBeenCalledTimes(1);
    const [, payload] = sendToUserMock.mock.calls[0];
    expect(payload.tag).toBe('nudge');
    expect(payload.title).toBe('Khu vườn đang chờ bạn');
  });

  it('skips a matched learner with nothing due who already studied today', async () => {
    await build({ 'user-1': { learner: [{ ui_locale: null, studied_today: true }] } });
    queryAsServiceMock.mockResolvedValueOnce([{ user_id: 'user-1' }]);

    await processor.process(makeJob());

    expect(sendToUserMock).not.toHaveBeenCalled();
  });

  it('dispatches a leech-priority push for a matched user with due leeches', async () => {
    await build({ 'user-1': { totals: [{ due_now: '5', leech_count: '2' }] } });
    queryAsServiceMock.mockResolvedValueOnce([{ user_id: 'user-1' }]);

    await processor.process(makeJob());

    expect(sendToUserMock).toHaveBeenCalledTimes(1);
    const [userId, payload, frontendUrl] = sendToUserMock.mock.calls[0];
    expect(userId).toBe('user-1');
    expect(payload.tag).toBe('leech');
    expect(frontendUrl).toBe('http://localhost:3000');
  });

  it('isolates a per-user failure — one bad stats query does not stop the tick', async () => {
    await build({
      'user-1': { totals: new Error('db down') },
      'user-2': { totals: [{ due_now: '3', leech_count: '0' }] },
    });
    queryAsServiceMock.mockResolvedValueOnce([{ user_id: 'user-1' }, { user_id: 'user-2' }]);

    await processor.process(makeJob());

    expect(sendToUserMock).toHaveBeenCalledTimes(1);
    expect(sendToUserMock.mock.calls[0][0]).toBe('user-2');
  });

  it('logs a failed tick instead of failing silently', async () => {
    await build();
    const error = jest.spyOn(
      (processor as unknown as { logger: { error: jest.Mock } }).logger,
      'error',
    );
    error.mockImplementation(() => undefined);

    processor.onFailed(makeJob('2026-10-16T12:00:00.000Z'), new Error('permission denied'));

    expect(error).toHaveBeenCalledWith(expect.stringContaining('permission denied'));
  });
});

describe('NotificationProcessor / SrsService.stats — shared summary source (Wave 1b)', () => {
  it('produce identical due/leech/streak numbers for the same fixture user, via either call path', async () => {
    const fixtureTotals = [
      { total_words: '20', mastered_words: '5', due_now: '4', leech_count: '2' },
    ];
    const fixtureStreak = [{ review_date: '2026-09-01' }, { review_date: '2026-08-31' }];
    const fixtureProfile = [{ display_name: null }];

    const realNow = Date.now;
    Date.now = () => Date.parse('2026-09-01T18:00:00.000Z');
    try {
      // Path 1: GET /srs/stats — RLS-scoped via queryAs(userId, text, params).
      const queryAsMock = jest
        .fn()
        .mockResolvedValueOnce([{ timezone: 'UTC' }]) // timezone resolution (unset -> DEFAULT_TIMEZONE)
        .mockResolvedValueOnce(fixtureTotals)
        .mockResolvedValueOnce(fixtureStreak)
        .mockResolvedValueOnce(fixtureProfile);
      const srsModuleRef = await Test.createTestingModule({
        providers: [
          SrsService,
          { provide: DatabaseService, useValue: { queryAs: queryAsMock, withUser: jest.fn() } },
        ],
      }).compile();
      const statsViaApi = await srsModuleRef.get(SrsService).stats('user-1');

      // Path 2: computeSrsSummary called directly with a plain queryFn(text, params).
      const workerQueryMock = jest
        .fn()
        .mockResolvedValueOnce(fixtureTotals)
        .mockResolvedValueOnce(fixtureStreak)
        .mockResolvedValueOnce(fixtureProfile);
      const summaryViaWorker = await computeSrsSummary(workerQueryMock, 'user-1');

      // Same fixture rows in, same numbers out — regardless of which
      // caller's queryFn shape ran them.
      // (`garden_minutes` is API-only; the worker doesn't compute it.)
      expect(summaryViaWorker).toEqual({ ...statsViaApi, garden_minutes: undefined });

      // And it's not just coincidence: both paths execute the exact same
      // SQL string — the "single source of truth" property Wave 1b exists
      // to guarantee, not two independently hand-copied queries that
      // happen to agree today. queryAsMock.calls[0] is stats()'s own
      // timezone-resolution query (a step computeSrsSummary itself doesn't
      // do), so the totals query is calls[1] on that path but calls[0] on
      // the direct-call path below.
      const [, apiStatsSql] = queryAsMock.mock.calls[1];
      const [workerStatsSql] = workerQueryMock.mock.calls[0];
      expect(workerStatsSql).toBe(apiStatsSql);
    } finally {
      Date.now = realNow;
    }
  });
});
