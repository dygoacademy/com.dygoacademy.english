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
      .mockResolvedValueOnce([{ due_now: '0', leech_count: '0' }]) // stats
      .mockResolvedValueOnce([]); // streak dates

    await processor.process(makeJob());

    expect(sendToUserMock).not.toHaveBeenCalled();
  });

  it('dispatches a leech-priority push for a matched user with due leeches', async () => {
    queryMock
      .mockResolvedValueOnce([{ user_id: 'user-1' }])
      .mockResolvedValueOnce([{ due_now: '5', leech_count: '2' }])
      .mockResolvedValueOnce([]);

    await processor.process(makeJob());

    expect(sendToUserMock).toHaveBeenCalledTimes(1);
    const [userId, payload, frontendUrl] = sendToUserMock.mock.calls[0];
    expect(userId).toBe('user-1');
    expect(payload.tag).toBe('leech');
    expect(frontendUrl).toBe('http://localhost:3000');
  });

  it('isolates a per-user failure — one bad stats query does not stop the tick', async () => {
    // buildPayload fires its stats + streak queries together via
    // Promise.all, so each user consumes two queue slots, not one — the
    // failing user's *stats* query rejects; its streak query still gets
    // called (and must resolve to something) before the rejection is
    // observed by the caller.
    queryMock
      .mockResolvedValueOnce([{ user_id: 'user-1' }, { user_id: 'user-2' }]) // due schedules
      .mockRejectedValueOnce(new Error('db down')) // user-1 stats query fails
      .mockResolvedValueOnce([]) // user-1 streak query (result discarded — Promise.all already rejects)
      .mockResolvedValueOnce([{ due_now: '3', leech_count: '0' }]) // user-2 stats
      .mockResolvedValueOnce([]); // user-2 streak

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

    const realNow = Date.now;
    Date.now = () => Date.parse('2026-09-01T18:00:00.000Z');
    try {
      // Path 1: GET /srs/stats — RLS-scoped via queryAs(userId, text, params).
      const queryAsMock = jest
        .fn()
        .mockResolvedValueOnce(fixtureTotals)
        .mockResolvedValueOnce(fixtureStreak);
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
        .mockResolvedValueOnce(fixtureStreak);
      const summaryViaWorker = await computeSrsSummary(workerQueryMock, 'user-1');

      // Same fixture rows in, same numbers out — regardless of which
      // caller's queryFn shape ran them.
      expect(summaryViaWorker).toEqual(statsViaApi);

      // And it's not just coincidence: both paths execute the exact same
      // SQL string — the "single source of truth" property Wave 1b exists
      // to guarantee, not two independently hand-copied queries that
      // happen to agree today.
      const [, apiStatsSql] = queryAsMock.mock.calls[0];
      const [workerStatsSql] = workerQueryMock.mock.calls[0];
      expect(workerStatsSql).toBe(apiStatsSql);
    } finally {
      Date.now = realNow;
    }
  });
});
