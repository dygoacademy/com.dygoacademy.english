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

describe('NotificationProcessor', () => {
  let queryMock: jest.Mock;
  let sendToUserMock: jest.Mock;
  let processor: NotificationProcessor;

  beforeEach(async () => {
    queryMock = jest.fn();
    sendToUserMock = jest.fn().mockResolvedValue({ sent: 1, pruned: 0, failed: 0 });

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationProcessor,
        { provide: DatabaseService, useValue: { query: queryMock } },
        { provide: PushDispatchService, useValue: { sendToUser: sendToUserMock } },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:3000') },
        },
      ],
    }).compile();

    processor = moduleRef.get(NotificationProcessor);
  });

  it('does nothing when no schedule bucket matches this tick', async () => {
    queryMock.mockResolvedValueOnce([]); // due-schedules query

    await processor.process(makeJob());

    expect(sendToUserMock).not.toHaveBeenCalled();
  });

  it('skips a matched user with nothing due and no leeches (buildReminderPayload -> null)', async () => {
    queryMock
      .mockResolvedValueOnce([{ user_id: 'user-1' }]) // due schedules
      .mockResolvedValueOnce([{ timezone: 'UTC' }]) // timezone resolution (unset -> DEFAULT_TIMEZONE)
      .mockResolvedValueOnce([{ due_now: '0', leech_count: '0' }]) // stats
      .mockResolvedValueOnce([]) // streak dates
      .mockResolvedValueOnce([{ display_name: null }]); // profile

    await processor.process(makeJob());

    expect(sendToUserMock).not.toHaveBeenCalled();
  });

  it('dispatches a leech-priority push for a matched user with due leeches', async () => {
    queryMock
      .mockResolvedValueOnce([{ user_id: 'user-1' }])
      .mockResolvedValueOnce([{ timezone: 'UTC' }]) // timezone resolution
      .mockResolvedValueOnce([{ due_now: '5', leech_count: '2' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ display_name: null }]); // profile

    await processor.process(makeJob());

    expect(sendToUserMock).toHaveBeenCalledTimes(1);
    const [userId, payload, frontendUrl] = sendToUserMock.mock.calls[0];
    expect(userId).toBe('user-1');
    expect(payload.tag).toBe('leech');
    expect(frontendUrl).toBe('http://localhost:3000');
  });

  it('isolates a per-user failure — one bad stats query does not stop the tick', async () => {
    // buildPayload resolves each user's timezone first (one query), then
    // fires stats + streak + profile + freeze uses together via Promise.all — five
    // queue slots per user (+ a refill write when due), not one. The failing user's *stats* (totals)
    // query rejects; its streak and profile queries still get called (and
    // must resolve to something) before the rejection is observed by the
    // caller.
    queryMock
      .mockResolvedValueOnce([{ user_id: 'user-1' }, { user_id: 'user-2' }]) // due schedules
      .mockResolvedValueOnce([{ timezone: 'UTC' }]) // user-1 timezone resolution
      .mockRejectedValueOnce(new Error('db down')) // user-1 stats query fails
      .mockResolvedValueOnce([]) // user-1 streak query (result discarded — Promise.all already rejects)
      .mockResolvedValueOnce([{ display_name: null }]) // user-1 profile query (discarded)
      .mockResolvedValueOnce([]) // user-1 freeze-uses query (UI-6 U6-3, discarded)
      .mockResolvedValueOnce([{ timezone: 'UTC' }]) // user-2 timezone resolution
      .mockResolvedValueOnce([{ due_now: '3', leech_count: '0' }]) // user-2 stats
      .mockResolvedValueOnce([]) // user-2 streak
      .mockResolvedValueOnce([{ display_name: null }]) // user-2 profile
      .mockResolvedValueOnce([]) // user-2 freeze uses (UI-6 U6-3)
      .mockResolvedValueOnce([]); // user-2 weekly freeze refill write

    await processor.process(makeJob());

    expect(sendToUserMock).toHaveBeenCalledTimes(1);
    expect(sendToUserMock.mock.calls[0][0]).toBe('user-2');
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

      // Path 2: the worker's payload builder — unscoped via query(text, params).
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
