import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { DatabaseService } from '../../database/database.service';
import { SrsService, computeSrsSummary } from './srs.service';

async function makeService(queryAsMock: jest.Mock, withUserMock?: jest.Mock): Promise<SrsService> {
  const moduleRef = await Test.createTestingModule({
    providers: [
      SrsService,
      {
        provide: DatabaseService,
        useValue: { queryAs: queryAsMock, withUser: withUserMock ?? jest.fn() },
      },
    ],
  }).compile();
  return moduleRef.get(SrsService);
}

/** Fakes DatabaseService.withUser by handing the callback a stub pg client (matches TopicsService's spec helper). */
function withUserOf(queryMock: jest.Mock): jest.Mock {
  return jest.fn((_userId: string, work: (client: { query: jest.Mock }) => unknown) =>
    work({ query: queryMock }),
  );
}

describe('SrsService.findDue', () => {
  it('only queries new cards when the existing-due query already filled the limit', async () => {
    const existingRow = { topic_word_id: 'w1', next_due_at: new Date() };
    const queryAsMock = jest.fn().mockResolvedValueOnce([existingRow]);
    const service = await makeService(queryAsMock);

    const result = await service.findDue('user-1', undefined, 1);

    expect(queryAsMock).toHaveBeenCalledTimes(1); // no second (new-cards) query needed
    expect(result).toEqual([existingRow]);
  });

  it('tops up with new (never-reviewed) cards when existing due cards do not fill the limit', async () => {
    const existingRow = { topic_word_id: 'w1' };
    const newRow = { topic_word_id: 'w2', is_new: true };
    const queryAsMock = jest
      .fn()
      .mockResolvedValueOnce([existingRow])
      .mockResolvedValueOnce([newRow]);
    const service = await makeService(queryAsMock);

    const result = await service.findDue('user-1', undefined, 5);

    expect(queryAsMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual([existingRow, newRow]);
    // second call requested the remaining count (5 - 1 = 4)
    const [, , secondParams] = queryAsMock.mock.calls[1];
    expect(secondParams).toEqual([4]);
  });

  it('scopes both queries to a topic when topicId is given', async () => {
    const queryAsMock = jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const service = await makeService(queryAsMock);

    await service.findDue('user-1', 'topic-9', 10);

    const [, firstSql, firstParams] = queryAsMock.mock.calls[0];
    expect(firstSql).toMatch(/tw\.topic_id = \$1/);
    expect(firstParams).toEqual(['topic-9', 10]);
  });
});

describe('SrsService.rate', () => {
  const NOW = new Date('2026-09-01T12:00:00.000Z');

  it('throws NotFoundException when the word does not exist (or is not readable)', async () => {
    const queryMock = jest.fn().mockResolvedValueOnce({ rows: [] });
    const service = await makeService(jest.fn(), withUserOf(queryMock));

    await expect(
      service.rate('user-1', { topicWordId: 'missing', rating: 'GOOD' }, NOW),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(queryMock).toHaveBeenCalledTimes(1); // stopped after the existence check
  });

  it('treats a word with no existing user_word_srs row as a new card (EF 2.5, interval 0)', async () => {
    const queryMock = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: 'w1' }] }) // word exists
      .mockResolvedValueOnce({ rows: [] }) // no existing srs row
      .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // recent mistakes
      .mockResolvedValueOnce({ rows: [] }) // review_logs insert
      .mockResolvedValueOnce({
        rows: [
          { ease_factor: 2.5, interval_days: 1, repetitions: 1, is_leech: false, next_due_at: NOW },
        ],
      }); // upsert
    const service = await makeService(jest.fn(), withUserOf(queryMock));

    const result = await service.rate('user-1', { topicWordId: 'w1', rating: 'GOOD' }, NOW);

    expect(result.interval_days).toBe(1);
    expect(result.repetitions).toBe(1);
    expect(result.was_correct).toBe(true);

    const [, upsertParams] = queryMock.mock.calls[4];
    // user_id, topic_word_id, ease_factor, interval_days, repetitions, mistake_increment, ...
    expect(upsertParams[0]).toBe('user-1');
    expect(upsertParams[1]).toBe('w1');
    expect(upsertParams[5]).toBe(0); // mistakeIncrement for GOOD
  });

  it('AGAIN increments the mistake counter and flags a leech once the 7-day count reaches the threshold', async () => {
    const queryMock = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: 'w1' }] })
      .mockResolvedValueOnce({ rows: [{ ease_factor: 2.0, interval_days: 7, repetitions: 2 }] })
      .mockResolvedValueOnce({ rows: [{ count: '3' }] }) // 3 mistakes already this week
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          { ease_factor: 1.3, interval_days: 0, repetitions: 0, is_leech: true, next_due_at: NOW },
        ],
      });
    const service = await makeService(jest.fn(), withUserOf(queryMock));

    await service.rate('user-1', { topicWordId: 'w1', rating: 'AGAIN' }, NOW);

    const [, upsertParams] = queryMock.mock.calls[4];
    expect(upsertParams[5]).toBe(1); // mistakeIncrement
    expect(upsertParams[6]).toBe(4); // recentMistakesAfter = 3 + 1
    expect(upsertParams[7]).toBe(true); // is_leech, 4 >= LEECH_THRESHOLD
  });
});

describe('SrsService.findLeeches', () => {
  it('reads the stored is_leech flag via a single RLS-scoped query', async () => {
    const queryAsMock = jest.fn().mockResolvedValue([{ topic_word_id: 'w1', recent_mistakes: 4 }]);
    const service = await makeService(queryAsMock);

    const result = await service.findLeeches('user-1');

    expect(queryAsMock).toHaveBeenCalledTimes(1);
    const [, sql] = queryAsMock.mock.calls[0];
    expect(sql).toMatch(/is_leech = true/);
    expect(result).toEqual([{ topic_word_id: 'w1', recent_mistakes: 4 }]);
  });
});

describe('SrsService.getDailyActivity', () => {
  it('converts count(*) bigint strings to real numbers, worst/most-recent first', async () => {
    const queryAsMock = jest.fn().mockResolvedValue([
      { review_date: '2026-09-19', review_count: '5' },
      { review_date: '2026-09-18', review_count: '2' },
      { review_date: '2026-09-16', review_count: '1' }, // gap on the 17th — no row, not a zero row
    ]);
    const service = await makeService(queryAsMock);

    const result = await service.getDailyActivity('user-1');

    expect(result).toEqual([
      { review_date: '2026-09-19', review_count: 5 },
      { review_date: '2026-09-18', review_count: 2 },
      { review_date: '2026-09-16', review_count: 1 },
    ]);
  });

  it('defaults to 7 days and is RLS-scoped via queryAs with the caller id', async () => {
    const queryAsMock = jest.fn().mockResolvedValue([]);
    const service = await makeService(queryAsMock);

    await service.getDailyActivity('user-1');

    expect(queryAsMock).toHaveBeenCalledTimes(1);
    const [userId, sql, params] = queryAsMock.mock.calls[0] as [string, string, unknown[]];
    expect(userId).toBe('user-1');
    expect(sql).toMatch(/where user_id = \$1/i);
    expect(sql).toMatch(/group by review_date/i);
    expect(params).toEqual(['user-1', 7]);
  });

  it('passes a custom days value through as the second bound parameter', async () => {
    const queryAsMock = jest.fn().mockResolvedValue([]);
    const service = await makeService(queryAsMock);

    await service.getDailyActivity('user-1', 30);

    const [, , params] = queryAsMock.mock.calls[0] as [string, string, unknown[]];
    expect(params).toEqual(['user-1', 30]);
  });
});

describe('SrsService.stats', () => {
  it('computes a streak of consecutive UTC days ending today', async () => {
    const realNow = Date.now;
    Date.now = () => Date.parse('2026-09-03T15:00:00.000Z');
    try {
      const queryAsMock = jest
        .fn()
        .mockResolvedValueOnce([
          { total_words: '10', mastered_words: '2', due_now: '3', leech_count: '1' },
        ])
        .mockResolvedValueOnce([
          { review_date: '2026-09-03' },
          { review_date: '2026-09-02' },
          { review_date: '2026-09-01' },
          { review_date: '2026-08-28' }, // gap — should not extend the streak
        ]);
      const service = await makeService(queryAsMock);

      const stats = await service.stats('user-1');

      expect(stats.total_words).toBe(10);
      expect(stats.mastered_words).toBe(2);
      expect(stats.leech_count).toBe(1);
      expect(stats.current_streak_days).toBe(3);
    } finally {
      Date.now = realNow;
    }
  });

  it('returns a zero streak when the most recent review was more than a day ago', async () => {
    const realNow = Date.now;
    Date.now = () => Date.parse('2026-09-03T15:00:00.000Z');
    try {
      const queryAsMock = jest
        .fn()
        .mockResolvedValueOnce([
          { total_words: '1', mastered_words: '0', due_now: '0', leech_count: '0' },
        ])
        .mockResolvedValueOnce([{ review_date: '2026-08-30' }]);
      const service = await makeService(queryAsMock);

      const stats = await service.stats('user-1');

      expect(stats.current_streak_days).toBe(0);
    } finally {
      Date.now = realNow;
    }
  });
});

describe('computeSrsSummary (extracted — also used by NotificationProcessor)', () => {
  it('computes totals/due/leech/streak from a plain queryFn, independent of DatabaseService', async () => {
    const realNow = Date.now;
    Date.now = () => Date.parse('2026-09-03T15:00:00.000Z');
    try {
      const queryFn = jest
        .fn()
        .mockResolvedValueOnce([
          { total_words: '7', mastered_words: '1', due_now: '2', leech_count: '0' },
        ])
        .mockResolvedValueOnce([{ review_date: '2026-09-03' }]);

      const summary = await computeSrsSummary(queryFn, 'user-9');

      expect(summary).toEqual({
        total_words: 7,
        mastered_words: 1,
        due_now: 2,
        leech_count: 0,
        current_streak_days: 1,
      });
      // Both queries filter explicitly by the passed userId, regardless of
      // whether the caller's queryFn is RLS-scoped or not (see the
      // function's own comment on why this is deliberate).
      expect(queryFn.mock.calls[0][1]).toEqual(['user-9']);
      expect(queryFn.mock.calls[1][1]).toEqual(['user-9']);
    } finally {
      Date.now = realNow;
    }
  });
});

describe('SrsService.sync', () => {
  it('applies items in chronological order and isolates per-item failures', async () => {
    const service = await makeService(jest.fn());
    const rateSpy = jest
      .spyOn(service, 'rate')
      // Calls happen in chronological order: 'w-earlier' first, then 'w-later'.
      .mockRejectedValueOnce(new NotFoundException('gone'))
      .mockResolvedValueOnce({
        topic_word_id: 'w-later',
        ease_factor: 2.5,
        interval_days: 1,
        repetitions: 1,
        is_leech: false,
        was_correct: true,
        next_due_at: new Date(),
      });

    const results = await service.sync('user-1', {
      reviews: [
        { topicWordId: 'w-later', rating: 'GOOD', reviewedAt: '2026-09-01T12:00:00.000Z' },
        { topicWordId: 'w-earlier', rating: 'AGAIN', reviewedAt: '2026-09-01T10:00:00.000Z' },
      ],
    });

    // 'w-earlier' has the earlier timestamp, so it should be applied first
    // despite appearing second in the input array.
    expect(rateSpy.mock.calls[0][1].topicWordId).toBe('w-earlier');
    expect(rateSpy.mock.calls[1][1].topicWordId).toBe('w-later');

    expect(results.find((r) => r.topicWordId === 'w-earlier')?.status).toBe('error');
    expect(results.find((r) => r.topicWordId === 'w-later')?.status).toBe('applied');
  });
});
