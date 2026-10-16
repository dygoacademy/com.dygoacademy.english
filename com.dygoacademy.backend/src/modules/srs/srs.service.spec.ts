import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { DatabaseService } from '../../database/database.service';
import {
  DEFAULT_TIMEZONE,
  SrsService,
  computeGardenMinutes,
  computeSrsSummary,
  GARDEN_FIRST_EVENT_CAP_MS,
  GARDEN_IDLE_GAP_SECONDS,
  resolveUserTimezone,
} from './srs.service';
import { newCard, schedule } from './fsrs-scheduler';

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
  it("previews use the row's learning_steps and the EASY→GOOD rule for new cards (U4-1)", async () => {
    const t0 = new Date(Date.now() - 30 * 86_400_000);
    let card = newCard(t0);
    for (let i = 0; i < 3; i++) card = schedule(card, 'GOOD', card.dueAt).card;
    // A Relearning row one step in (older data): its AGAIN is no longer the 10-minute step.
    const step = { ...schedule(card, 'AGAIN', card.dueAt).card, learningSteps: 1 };
    const learningRow = {
      topic_word_id: 'w1',
      is_new: false,
      state: step.state,
      stability: step.stability,
      difficulty: step.difficulty,
      reps: step.reps,
      lapses: step.lapses,
      learning_steps: step.learningSteps,
      scheduled_days: step.scheduledDays,
      last_reviewed_at: step.lastReviewAt,
      next_due_at: new Date(Date.now() - 1000),
    };
    const newRow = {
      topic_word_id: 'w2',
      is_new: true,
      state: 'New',
      stability: null,
      difficulty: null,
      reps: 0,
      lapses: 0,
      learning_steps: 0,
      scheduled_days: 0,
      last_reviewed_at: null,
      next_due_at: null,
    };
    const queryAsMock = jest
      .fn()
      .mockResolvedValueOnce([learningRow])
      .mockResolvedValueOnce([newRow]);
    const service = await makeService(queryAsMock);

    const [learning, fresh] = await service.findDue('user-1', undefined, 5);

    expect(learningRow.learning_steps).toBeGreaterThan(0);
    expect(learning.interval_preview?.AGAIN).not.toEqual({ unit: 'minutes', count: 10 });
    expect(fresh.interval_preview?.EASY).toEqual(fresh.interval_preview?.GOOD);
  });

  it('only queries new cards when the existing-due query already filled the limit', async () => {
    const existingRow = { topic_word_id: 'w1', next_due_at: new Date() };
    const queryAsMock = jest.fn().mockResolvedValueOnce([existingRow]);
    const service = await makeService(queryAsMock);

    const result = await service.findDue('user-1', undefined, 1);

    expect(queryAsMock).toHaveBeenCalledTimes(1); // no second (new-cards) query needed
    // Phase 10 adds read-time recall probability; null when there is no FSRS state.
    expect(result).toEqual([
      { ...existingRow, retrievability: null, interval_preview: expect.any(Object) },
    ]);
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
    expect(result).toEqual([
      { ...existingRow, retrievability: null, interval_preview: expect.any(Object) },
      { ...newRow, retrievability: null, interval_preview: expect.any(Object) },
    ]);
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
    const [, secondSql] = queryAsMock.mock.calls[1];
    expect(secondSql).not.toMatch(/first_topic_id/);
  });

  it("without a topic, the learner's own words come first, then their first bed", async () => {
    const queryAsMock = jest.fn().mockResolvedValueOnce([]);
    const service = await makeService(queryAsMock);

    await service.findDue('user-1', undefined, 5, true);

    const [, sql] = queryAsMock.mock.calls[0];
    expect(sql).toMatch(
      /order by \(tw\.added_by is not distinct from auth\.uid\(\)\) desc, \(tw\.topic_id is not distinct from\s+\(select p\.first_topic_id/,
    );
    expect(sql).toMatch(/\) desc, tw\.created_at asc/);
  });

  it('with a topic, new cards keep plain oldest-first order', async () => {
    const queryAsMock = jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const service = await makeService(queryAsMock);

    await service.findDue('user-1', 'topic-9', 10);

    const [, secondSql] = queryAsMock.mock.calls[1];
    expect(secondSql).not.toMatch(/added_by/);
  });

  it('newOnly skips the existing-due query and asks for new cards up to the limit', async () => {
    const newRow = { topic_word_id: 'w2', is_new: true };
    const queryAsMock = jest.fn().mockResolvedValueOnce([newRow]);
    const service = await makeService(queryAsMock);

    const result = await service.findDue('user-1', undefined, 3, true);

    expect(queryAsMock).toHaveBeenCalledTimes(1);
    const [, sql, params] = queryAsMock.mock.calls[0];
    expect(sql).toMatch(/not exists/);
    expect(params).toEqual([3]);
    expect(result).toEqual([
      { ...newRow, retrievability: null, interval_preview: expect.any(Object) },
    ]);
  });
});

describe('SrsService.startSession (daily goal missions)', () => {
  /** A withUser client for newWordAllowance: tz, today's rows exist, then the LEARN_NEW row. */
  const allowanceClient = (learnNew: { target: number; progress: number } | null) =>
    jest.fn((sql: string) => {
      if (sql.includes('timezone')) return { rows: [{ timezone: 'UTC' }] };
      if (sql.includes('count(*) as n from public.daily_missions')) return { rows: [{ n: '3' }] };
      if (sql.includes("type = 'LEARN_NEW'")) return { rows: learnNew ? [learnNew] : [] };
      throw new Error(`unexpected SQL: ${sql}`);
    });

  it('dueOnly waters only: no new-card query, no mission read', async () => {
    const due = { topic_word_id: 'w1', is_new: false, next_due_at: new Date() };
    const queryAsMock = jest.fn().mockResolvedValueOnce([due]);
    const withUser = jest.fn();
    const service = await makeService(queryAsMock, withUser);

    const res = await service.startSession('user-1', { limit: 20, dueOnly: true });

    expect(withUser).not.toHaveBeenCalled();
    expect(queryAsMock).toHaveBeenCalledTimes(1);
    expect(res.cards.map((c) => c.topic_word_id)).toEqual(['w1']);
  });

  it("planting stops at what is left of today's Plant mission", async () => {
    const queryAsMock = jest.fn().mockResolvedValueOnce([]);
    const service = await makeService(
      queryAsMock,
      withUserOf(allowanceClient({ target: 5, progress: 3 })),
    );

    await service.startSession('user-1', { limit: 5, newOnly: true });

    const [, sql, params] = queryAsMock.mock.calls[0];
    expect(sql).toMatch(/not exists/);
    expect(params).toEqual([2]);
  });

  it('a catch-up day (no Plant mission) plants nothing', async () => {
    const queryAsMock = jest.fn();
    const service = await makeService(queryAsMock, withUserOf(allowanceClient(null)));

    const res = await service.startSession('user-1', { limit: 5, newOnly: true });

    expect(queryAsMock).not.toHaveBeenCalled();
    expect(res.cards).toEqual([]);
  });
});

describe('SrsService.rate (Phase 10 — FSRS)', () => {
  const NOW = new Date('2026-09-01T12:00:00.000Z');
  const DAY = 86_400_000;

  /**
   * The transaction's query order: word exists → current state → profile
   * timezone → graded-mistake counts → review_logs insert → (graded only)
   * user_word_srs upsert. The upsert mock simply echoes its own params back
   * the way `returning` would.
   */
  function txMock(opts: {
    state?: Record<string, unknown> | null;
    recent?: number;
    today?: number;
  }): jest.Mock {
    const mock = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: 'w1' }] })
      .mockResolvedValueOnce({ rows: opts.state ? [opts.state] : [] })
      .mockResolvedValueOnce({ rows: [{ timezone: 'Asia/Singapore' }] })
      .mockResolvedValueOnce({
        rows: [{ recent: String(opts.recent ?? 0), today: String(opts.today ?? 0) }],
      })
      .mockResolvedValueOnce({ rows: [] });
    mock.mockImplementationOnce((_sql: string, p: unknown[]) =>
      Promise.resolve({
        rows: [
          {
            fsrs_state: p[2],
            stability: p[3],
            difficulty: p[4],
            reps: p[5],
            lapses: p[6],
            scheduled_days: p[8],
            is_leech: p[11],
            next_due_at: new Date(p[13] as string),
            mastered_at: p[14],
          },
        ],
      }),
    );
    return mock;
  }

  /** A card in Review, last seen `daysAgo` days ago and due exactly now. */
  function reviewRow(overrides: Record<string, unknown> = {}) {
    return {
      fsrs_state: 'Review',
      stability: 8,
      difficulty: 5,
      reps: 3,
      lapses: 0,
      learning_steps: 0,
      scheduled_days: 8,
      last_reviewed_at: new Date(NOW.getTime() - 8 * DAY),
      next_due_at: NOW,
      mastered_at: null,
      is_leech: false,
      ...overrides,
    };
  }

  const logParams = (m: jest.Mock) => m.mock.calls[4][1] as unknown[];
  const upsertParams = (m: jest.Mock) => m.mock.calls[5][1] as unknown[];

  it('throws NotFoundException when the word does not exist (or is not readable)', async () => {
    const queryMock = jest.fn().mockResolvedValueOnce({ rows: [] });
    const service = await makeService(jest.fn(), withUserOf(queryMock));

    await expect(
      service.rate('user-1', { topicWordId: 'missing', rating: 'GOOD' }, NOW),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(queryMock).toHaveBeenCalledTimes(1); // stopped after the existence check
  });

  it('a first-ever GOOD creates an FSRS Review card due in 1 day and logs a graded flashcard review', async () => {
    const queryMock = txMock({ state: null });
    const service = await makeService(jest.fn(), withUserOf(queryMock));

    const result = await service.rate('user-1', { topicWordId: 'w1', rating: 'GOOD' }, NOW);

    expect(result.graded).toBe(true);
    expect(result.state).toBe('Review');
    expect(result.reps).toBe(1);
    expect(result.was_correct).toBe(true);
    expect(new Date(result.next_due_at).getTime() - NOW.getTime()).toBe(DAY);
    expect(logParams(queryMock)[6]).toBe('flashcard'); // source
    expect(logParams(queryMock)[9]).toBe(true); // graded
    expect(logParams(queryMock)[10]).toBe('New'); // state_before
    expect(upsertParams(queryMock)[9]).toBe(0); // no mistake increment
  });

  it("'Too easy' on a never-seen word counts as GOOD, so one tap can't push a new word ~8 days away", async () => {
    const queryMock = txMock({ state: null });
    const service = await makeService(jest.fn(), withUserOf(queryMock));

    const result = await service.rate('user-1', { topicWordId: 'w1', rating: 'EASY' }, NOW);

    expect(result.rating).toBe('GOOD');
    expect(new Date(result.next_due_at).getTime() - NOW.getTime()).toBe(DAY);
  });

  it('AGAIN schedules a 10-minute relearning step and flags a leech at the 4th graded mistake in 7 days', async () => {
    const queryMock = txMock({ state: reviewRow(), recent: 3 });
    const service = await makeService(jest.fn(), withUserOf(queryMock));

    const result = await service.rate('user-1', { topicWordId: 'w1', rating: 'AGAIN' }, NOW);

    expect(result.state).toBe('Relearning');
    expect(result.lapses).toBe(1);
    expect(new Date(result.next_due_at).getTime() - NOW.getTime()).toBe(10 * 60_000);
    expect(upsertParams(queryMock)[9]).toBe(1); // mistake increment
    expect(upsertParams(queryMock)[10]).toBe(4); // recent mistakes 3 + 1
    expect(upsertParams(queryMock)[11]).toBe(true); // is_leech
  });

  it('a second mistake on the same word in the same local day is logged but not counted', async () => {
    const queryMock = txMock({
      state: reviewRow({ fsrs_state: 'Relearning', next_due_at: new Date(NOW.getTime() - 60_000) }),
      recent: 1,
      today: 1,
    });
    const service = await makeService(jest.fn(), withUserOf(queryMock));

    const result = await service.rate('user-1', { topicWordId: 'w1', rating: 'AGAIN' }, NOW);

    expect(result.graded).toBe(false);
    expect(result.was_correct).toBe(false);
    expect(logParams(queryMock)[9]).toBe(false); // graded = false
    expect(queryMock).toHaveBeenCalledTimes(5); // no upsert: schedule untouched
  });

  it('a correct answer on a word that is not due yet is logged but does not move the schedule', async () => {
    const due = new Date(NOW.getTime() + 5 * DAY);
    const queryMock = txMock({ state: reviewRow({ next_due_at: due }) });
    const service = await makeService(jest.fn(), withUserOf(queryMock));

    const result = await service.rate('user-1', { topicWordId: 'w1', rating: 'GOOD' }, NOW);

    expect(result.graded).toBe(false);
    expect(result.next_due_at).toEqual(due);
    expect(queryMock).toHaveBeenCalledTimes(5);
  });

  it('getting a just-missed word right on its 10-minute retry still counts (it is due again)', async () => {
    const queryMock = txMock({
      state: reviewRow({
        fsrs_state: 'Relearning',
        stability: 2,
        lapses: 1,
        last_reviewed_at: new Date(NOW.getTime() - 15 * 60_000),
        next_due_at: new Date(NOW.getTime() - 5 * 60_000),
      }),
      recent: 1,
      today: 1,
    });
    const service = await makeService(jest.fn(), withUserOf(queryMock));

    const result = await service.rate('user-1', { topicWordId: 'w1', rating: 'GOOD' }, NOW);

    expect(result.graded).toBe(true);
    expect(result.state).toBe('Review');
  });

  it('just_mastered is true when this review lifts stability past 21 days (GOOD from S=8)', async () => {
    const queryMock = txMock({ state: reviewRow() });
    const service = await makeService(jest.fn(), withUserOf(queryMock));

    const result = await service.rate('user-1', { topicWordId: 'w1', rating: 'GOOD' }, NOW);

    expect(result.stability).toBeGreaterThanOrEqual(21);
    expect(result.just_mastered).toBe(true);
    expect(upsertParams(queryMock)[14]).toBe(NOW.toISOString()); // mastered_at set now
  });

  it('HARD from the same state does not reach mastery (the old "four HARDs = mastered" bug)', async () => {
    const queryMock = txMock({ state: reviewRow() });
    const service = await makeService(jest.fn(), withUserOf(queryMock));

    const result = await service.rate('user-1', { topicWordId: 'w1', rating: 'HARD' }, NOW);

    expect(result.stability).toBeLessThan(21);
    expect(result.just_mastered).toBe(false);
    expect(result.scheduled_days).toBeGreaterThan(1); // HARD grows, no 1-day trap
  });

  it('mastery is sticky: an already-mastered word stays mastered on a success, without re-announcing it', async () => {
    const masteredAt = new Date(NOW.getTime() - 30 * DAY);
    const queryMock = txMock({ state: reviewRow({ mastered_at: masteredAt }) });
    const service = await makeService(jest.fn(), withUserOf(queryMock));

    const result = await service.rate('user-1', { topicWordId: 'w1', rating: 'HARD' }, NOW);

    expect(result.is_mastered).toBe(true);
    expect(result.just_mastered).toBe(false);
    expect(upsertParams(queryMock)[14]).toBe(masteredAt.toISOString());
  });

  it('a graded mistake clears mastery', async () => {
    const queryMock = txMock({
      state: reviewRow({ mastered_at: new Date(NOW.getTime() - 30 * DAY) }),
    });
    const service = await makeService(jest.fn(), withUserOf(queryMock));

    const result = await service.rate('user-1', { topicWordId: 'w1', rating: 'AGAIN' }, NOW);

    expect(result.is_mastered).toBe(false);
    expect(upsertParams(queryMock)[14]).toBeNull();
  });

  describe('daily missions (UI-6 U6-2)', () => {
    const missionSql = (m: jest.Mock) =>
      m.mock.calls.slice(6).map((c) => [String(c[0]), c[1] as unknown[]] as const);

    it('a graded review of a due card bumps REVIEW_DUE in the same transaction', async () => {
      const queryMock = txMock({ state: reviewRow() });
      queryMock.mockResolvedValueOnce({ rows: [{ n: '3' }] }); // today's rows exist
      const service = await makeService(jest.fn(), withUserOf(queryMock));

      await service.rate('user-1', { topicWordId: 'w1', rating: 'GOOD' }, NOW);

      const calls = missionSql(queryMock);
      expect(calls).toHaveLength(2);
      expect(calls[1][0]).toContain('update public.daily_missions');
      // Asia/Singapore (txMock's profile tz) local date of NOW.
      expect(calls[1][1]).toEqual(['user-1', '2026-09-01', 'REVIEW_DUE']);
    });

    it("a new card's first review bumps LEARN_NEW and creates today's rows if missing", async () => {
      const queryMock = txMock({ state: null });
      queryMock
        .mockResolvedValueOnce({ rows: [{ n: '0' }] }) // no rows yet
        .mockResolvedValueOnce({ rows: [{ n: '4' }] }) // 4 due
        .mockResolvedValueOnce({ rows: [{ daily_goal_minutes: 10 }] }) // 10 min goal
        .mockResolvedValueOnce({ rows: [{ n: '0' }] }); // 2026-09-01 is a speak day: 0 speakable words
      const service = await makeService(jest.fn(), withUserOf(queryMock));

      await service.rate('user-1', { topicWordId: 'w1', rating: 'GOOD' }, NOW);

      const calls = missionSql(queryMock);
      expect(calls[2][0]).toContain('daily_goal_minutes');
      expect(calls[3][0]).toContain('speaking_items');
      expect(calls[4][0]).toContain('insert into public.daily_missions');
      // The 10 min goal's day: water 4, plant 5, quiz (no speakable words).
      expect(calls[4][1]).toEqual([
        'user-1',
        '2026-09-01',
        'REVIEW_DUE',
        4,
        false,
        'LEARN_NEW',
        5,
        false,
        'QUIZ',
        1,
        false,
      ]);
      expect(calls[5][1]).toEqual(['user-1', '2026-09-01', 'LEARN_NEW']);
    });

    it('an ungraded review does not touch missions', async () => {
      const queryMock = txMock({
        state: reviewRow({ next_due_at: new Date(NOW.getTime() + DAY) }),
      });
      const service = await makeService(jest.fn(), withUserOf(queryMock));

      const result = await service.rate('user-1', { topicWordId: 'w1', rating: 'GOOD' }, NOW);

      expect(result.graded).toBe(false);
      expect(queryMock.mock.calls.some((c) => String(c[0]).includes('daily_missions'))).toBe(false);
    });
  });
});

describe('SrsService.recordQuizResult (Phase 10 — quizzes grade the SRS)', () => {
  const NOW = new Date('2026-09-01T12:00:00.000Z');

  function txNewCard(): jest.Mock {
    const mock = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: 'w1' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ timezone: 'UTC' }] })
      .mockResolvedValueOnce({ rows: [{ recent: '0', today: '0' }] })
      .mockResolvedValueOnce({ rows: [] });
    mock.mockImplementationOnce((_sql: string, p: unknown[]) =>
      Promise.resolve({
        rows: [
          {
            fsrs_state: p[2],
            stability: p[3],
            difficulty: p[4],
            reps: p[5],
            lapses: p[6],
            scheduled_days: p[8],
            is_leech: p[11],
            next_due_at: new Date(p[13] as string),
            mastered_at: p[14],
          },
        ],
      }),
    );
    return mock;
  }

  it.each([
    ['CLOZE', true, false, 'GOOD'],
    ['DICTATION', true, false, 'GOOD'],
    ['MATCHING', true, false, 'HARD'],
    ['CONTEXTUAL_CHOICE', true, false, 'HARD'],
    ['CLOZE', true, true, 'HARD'],
    ['DICTATION', false, false, 'AGAIN'],
  ] as const)(
    '%s correct=%s hint=%s is graded %s and logged as a quiz review',
    async (quizType, correct, hintUsed, expected) => {
      const queryMock = txNewCard();
      const service = await makeService(jest.fn(), withUserOf(queryMock));

      const result = await service.recordQuizResult(
        'user-1',
        { topicWordId: 'w1', quizType, correct, hintUsed },
        NOW,
      );

      expect(result.rating).toBe(expected);
      const log = queryMock.mock.calls[4][1] as unknown[];
      expect(log[2]).toBe(expected); // stored rating
      expect(log[6]).toBe('quiz'); // source
      expect(log[7]).toBe(quizType);
      expect(log[8]).toBe(hintUsed);
    },
  );

  it('quizFinished bumps the QUIZ mission (UI-6 U6-2); quiz answers never bump review missions', async () => {
    const queryMock = txNewCard();
    queryMock.mockResolvedValueOnce({ rows: [{ n: '3' }] });
    const service = await makeService(jest.fn(), withUserOf(queryMock));

    await service.recordQuizResult(
      'user-1',
      { topicWordId: 'w1', quizType: 'CLOZE', correct: true, hintUsed: false, quizFinished: true },
      NOW,
    );

    const updates = queryMock.mock.calls.filter((c) =>
      String(c[0]).includes('update public.daily_missions'),
    );
    expect(updates).toHaveLength(1);
    expect(updates[0][1]).toEqual(['user-1', '2026-09-01', 'QUIZ']);
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

    // Two calls: resolveUserTimezone's own lookup, then the activity query.
    expect(queryAsMock).toHaveBeenCalledTimes(2);
    const [userId, sql, params] = queryAsMock.mock.calls[1] as [string, string, unknown[]];
    expect(userId).toBe('user-1');
    expect(sql).toMatch(/where user_id = \$1/i);
    expect(sql).toMatch(/group by review_date/i);
    // Third param is the resolved timezone -- DEFAULT_TIMEZONE here since
    // the mocked profiles lookup returns no row (falls through both the
    // stored-preference and detected-value tiers).
    expect(params).toEqual(['user-1', 7, 'Asia/Ho_Chi_Minh']);
  });

  it('passes a custom days value through as the second bound parameter', async () => {
    const queryAsMock = jest.fn().mockResolvedValue([]);
    const service = await makeService(queryAsMock);

    await service.getDailyActivity('user-1', 30);

    const [, , params] = queryAsMock.mock.calls[1] as [string, string, unknown[]];
    expect(params).toEqual(['user-1', 30, 'Asia/Ho_Chi_Minh']);
  });
});

describe('SrsService.getUpcomingActivity', () => {
  it('converts due_count bigint strings to real numbers, earliest first', async () => {
    const queryAsMock = jest.fn().mockResolvedValue([
      { due_date: '2026-09-21', due_count: '3' },
      { due_date: '2026-09-23', due_count: '7' }, // gap on the 22nd -- no row, not a zero row
    ]);
    const service = await makeService(queryAsMock);

    const result = await service.getUpcomingActivity('user-1');

    expect(result).toEqual([
      { due_date: '2026-09-21', due_count: 3 },
      { due_date: '2026-09-23', due_count: 7 },
    ]);
  });

  it('defaults to 7 days, is RLS-scoped via queryAs, and excludes today (strictly future calendar days only)', async () => {
    const queryAsMock = jest.fn().mockResolvedValue([]);
    const service = await makeService(queryAsMock);

    await service.getUpcomingActivity('user-1');

    // Two calls: resolveUserTimezone's own lookup, then the activity query.
    expect(queryAsMock).toHaveBeenCalledTimes(2);
    const [userId, sql, params] = queryAsMock.mock.calls[1] as [string, string, unknown[]];
    expect(userId).toBe('user-1');
    expect(sql).toMatch(/where user_id = \$1/i);
    // strict future-day filter, not next_due_at > now() -- a word due
    // later today must not double-count against SrsStats.due_now. Both
    // sides now use the resolved timezone ($3), not a hardcoded 'utc'.
    expect(sql).toMatch(
      /\(next_due_at at time zone \$3\)::date > \(now\(\) at time zone \$3\)::date/i,
    );
    expect(sql).toMatch(/group by due_date/i);
    expect(params).toEqual(['user-1', 7, 'Asia/Ho_Chi_Minh']);
  });

  it('passes a custom days value through as the second bound parameter', async () => {
    const queryAsMock = jest.fn().mockResolvedValue([]);
    const service = await makeService(queryAsMock);

    await service.getUpcomingActivity('user-1', 14);

    const [, , params] = queryAsMock.mock.calls[1] as [string, string, unknown[]];
    expect(params).toEqual(['user-1', 14, 'Asia/Ho_Chi_Minh']);
  });
});

describe('SrsService.getTierProgress', () => {
  const TIER_1 = 'c9c9c9c9-0000-0000-0000-000000000001';
  const TIER_2 = 'c9c9c9c9-0000-0000-0000-000000000002';
  const TIER_3 = 'c9c9c9c9-0000-0000-0000-000000000003';
  const TIER_4 = 'c9c9c9c9-0000-0000-0000-000000000004';

  it('freshly started: no rows at all resolves to tier 1, 0 progress', async () => {
    const queryAsMock = jest.fn().mockResolvedValue([]);
    const service = await makeService(queryAsMock);

    const result = await service.getTierProgress('user-1');

    expect(result).toEqual({
      tier: 1,
      tierName: 'Foundation',
      masteredInTier: 0,
      wordsInTier: 0,
      nextTierName: 'Core Vocabulary',
      wordsToNextTier: 0,
    });
  });

  it('mid-tier: tier 1 fully cleared, tier 2 in progress — reports tier 2, not tier 1', async () => {
    const queryAsMock = jest.fn().mockResolvedValue([
      { topic_id: TIER_1, word_count: '6', mastered_count: '6' },
      { topic_id: TIER_2, word_count: '6', mastered_count: '3' },
    ]);
    const service = await makeService(queryAsMock);

    const result = await service.getTierProgress('user-1');

    expect(result).toEqual({
      tier: 2,
      tierName: 'Core Vocabulary',
      masteredInTier: 3,
      wordsInTier: 6,
      nextTierName: 'Band 6.5 Ready',
      wordsToNextTier: 3,
    });
  });

  it('exactly at the boundary: masteredCount === wordCount clears the tier, advancing to the next', async () => {
    const queryAsMock = jest
      .fn()
      .mockResolvedValue([{ topic_id: TIER_1, word_count: '6', mastered_count: '6' }]);
    const service = await makeService(queryAsMock);

    const result = await service.getTierProgress('user-1');

    expect(result.tier).toBe(2); // tier 1 cleared exactly at the boundary, tier 2 is now active
    expect(result.tierName).toBe('Core Vocabulary');
  });

  it('top tier cleared: nextTierName and wordsToNextTier are both null, nothing left to progress toward', async () => {
    const queryAsMock = jest.fn().mockResolvedValue([
      { topic_id: TIER_1, word_count: '6', mastered_count: '6' },
      { topic_id: TIER_2, word_count: '6', mastered_count: '6' },
      { topic_id: TIER_3, word_count: '6', mastered_count: '6' },
      { topic_id: TIER_4, word_count: '6', mastered_count: '6' },
    ]);
    const service = await makeService(queryAsMock);

    const result = await service.getTierProgress('user-1');

    expect(result).toEqual({
      tier: 4,
      tierName: 'Band 7.5 Ready',
      masteredInTier: 6,
      wordsInTier: 6,
      nextTierName: null,
      wordsToNextTier: null,
    });
  });

  it('a zero-word tier is never treated as cleared, even with mastered_count also at 0', async () => {
    // Guards the same divide-by-zero case MasteryRing's frontend already
    // guards — a misconfigured/empty tier topic should never silently
    // "clear" and let the ladder skip past it.
    const queryAsMock = jest
      .fn()
      .mockResolvedValue([{ topic_id: TIER_1, word_count: '0', mastered_count: '0' }]);
    const service = await makeService(queryAsMock);

    const result = await service.getTierProgress('user-1');

    expect(result.tier).toBe(1);
    expect(result.tierName).toBe('Foundation');
  });

  it('is RLS-scoped via queryAs with the caller id, and queries all 4 tier topic ids in one call', async () => {
    const queryAsMock = jest.fn().mockResolvedValue([]);
    const service = await makeService(queryAsMock);

    await service.getTierProgress('user-1');

    expect(queryAsMock).toHaveBeenCalledTimes(1);
    const [userId, sql, params] = queryAsMock.mock.calls[0] as [string, string, unknown[][]];
    expect(userId).toBe('user-1');
    expect(sql).toMatch(/tw\.topic_id = any\(\$1/i);
    expect(params[0]).toEqual([TIER_1, TIER_2, TIER_3, TIER_4]);
  });
});

describe('SrsService.stats', () => {
  it('computes a streak of consecutive UTC days ending today', async () => {
    const realNow = Date.now;
    Date.now = () => Date.parse('2026-09-03T15:00:00.000Z');
    try {
      const queryAsMock = jest
        .fn()
        .mockResolvedValueOnce([{ timezone: 'UTC' }]) // timezone resolution (unset -> DEFAULT_TIMEZONE)
        .mockResolvedValueOnce([
          { total_words: '10', mastered_words: '2', due_now: '3', leech_count: '1' },
        ])
        .mockResolvedValueOnce([
          { review_date: '2026-09-03' },
          { review_date: '2026-09-02' },
          { review_date: '2026-09-01' },
          { review_date: '2026-08-28' }, // gap — should not extend the streak
        ])
        .mockResolvedValueOnce([{ display_name: 'Sarah Chen' }]);
      const service = await makeService(queryAsMock);

      const stats = await service.stats('user-1');

      expect(stats.total_words).toBe(10);
      expect(stats.mastered_words).toBe(2);
      expect(stats.leech_count).toBe(1);
      expect(stats.current_streak_days).toBe(3);
      expect(stats.display_name).toBe('Sarah Chen');
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
        .mockResolvedValueOnce([{ timezone: 'UTC' }]) // timezone resolution
        .mockResolvedValueOnce([
          { total_words: '1', mastered_words: '0', due_now: '0', leech_count: '0' },
        ])
        .mockResolvedValueOnce([{ review_date: '2026-08-30' }])
        .mockResolvedValueOnce([{ display_name: null }]);
      const service = await makeService(queryAsMock);

      const stats = await service.stats('user-1');

      expect(stats.current_streak_days).toBe(0);
      expect(stats.display_name).toBeNull();
    } finally {
      Date.now = realNow;
    }
  });
});

describe('computeGardenMinutes', () => {
  it('turns the summed seconds into whole minutes', async () => {
    const queryFn = jest.fn().mockResolvedValueOnce([{ seconds: '1530.4' }]);

    await expect(computeGardenMinutes(queryFn, 'user-1')).resolves.toBe(26);
    expect(queryFn).toHaveBeenCalledWith(expect.stringContaining('public.speaking_attempts'), [
      'user-1',
      GARDEN_IDLE_GAP_SECONDS,
      GARDEN_FIRST_EVENT_CAP_MS,
    ]);
  });

  it('is 0 with no activity or an unreadable result', async () => {
    const none = jest.fn().mockResolvedValueOnce([{ seconds: 0 }]);
    const unreadable = jest.fn().mockResolvedValueOnce(undefined);
    await expect(computeGardenMinutes(none, 'u')).resolves.toBe(0);
    await expect(computeGardenMinutes(unreadable, 'u')).resolves.toBe(0);
  });
});

describe('SrsService.stats garden_minutes', () => {
  it('adds the garden time to the summary', async () => {
    const queryAsMock = jest.fn((_userId: string, text: string) =>
      Promise.resolve(text.includes('public.speaking_attempts') ? [{ seconds: '600' }] : []),
    );
    const service = await makeService(queryAsMock);

    const stats = await service.stats('user-1');

    expect(stats.garden_minutes).toBe(10);
  });
});

describe('resolveUserTimezone', () => {
  it("prefers the caller's stored profiles.timezone once it's actually been set", async () => {
    const queryFn = jest.fn().mockResolvedValueOnce([{ timezone: 'Asia/Singapore' }]);

    const tz = await resolveUserTimezone(queryFn, 'user-1', 'Europe/Rome');

    expect(tz).toBe('Asia/Singapore');
  });

  it("falls to the caller's detected timezone when the stored value is the schema's unset sentinel ('UTC')", async () => {
    const queryFn = jest.fn().mockResolvedValueOnce([{ timezone: 'UTC' }]);

    const tz = await resolveUserTimezone(queryFn, 'user-1', 'Europe/Rome');

    expect(tz).toBe('Europe/Rome');
  });

  it('falls to DEFAULT_TIMEZONE when neither a stored preference nor a valid detected value is available', async () => {
    const queryFn = jest.fn().mockResolvedValueOnce([{ timezone: 'UTC' }]);

    const tz = await resolveUserTimezone(queryFn, 'user-1', undefined);

    expect(tz).toBe(DEFAULT_TIMEZONE);
  });

  it('rejects a garbage detected value rather than passing it through to a SQL parameter', async () => {
    const queryFn = jest.fn().mockResolvedValueOnce([{ timezone: 'UTC' }]);

    const tz = await resolveUserTimezone(
      queryFn,
      'user-1',
      'not-a-real-zone; drop table profiles;',
    );

    expect(tz).toBe(DEFAULT_TIMEZONE);
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
        .mockResolvedValueOnce([{ review_date: '2026-09-03' }])
        .mockResolvedValueOnce([{ display_name: null }]);

      const summary = await computeSrsSummary(queryFn, 'user-9');

      expect(summary).toEqual({
        total_words: 7,
        mastered_words: 1,
        due_now: 2,
        leech_count: 0,
        current_streak_days: 1,
        display_name: null,
        stage_counts: { new: 0, learning: 0, review: 0, mastered: 1 },
        freezes: { available: 2, used_this_week: 0, refills_on: '2026-09-07' },
        best_streak_days: 1,
      });
      // All three queries filter explicitly by the passed userId, regardless
      // of whether the caller's queryFn is RLS-scoped or not (see the
      // function's own comment on why this is deliberate). The streak
      // query's second param is the resolved timezone — DEFAULT_TIMEZONE
      // here since this test calls computeSrsSummary directly, with no
      // timezone argument.
      expect(queryFn.mock.calls[0][1]).toEqual(['user-9']);
      expect(queryFn.mock.calls[1][1]).toEqual(['user-9', 'Asia/Ho_Chi_Minh']);
      expect(queryFn.mock.calls[2][1]).toEqual(['user-9']);
    } finally {
      Date.now = realNow;
    }
  });
});

describe('computeSrsSummary streak freezes (UI-6 U6-3)', () => {
  const at = async (
    nowIso: string,
    reviews: string[],
    profile: Record<string, unknown>,
    frozen: string[] = [],
    tz = 'UTC',
  ) => {
    const realNow = Date.now;
    Date.now = () => Date.parse(nowIso);
    try {
      const queryFn = jest
        .fn()
        .mockResolvedValueOnce([{ total_words: '1', mastered_words: '0', due_now: '0', leech_count: '0' }])
        .mockResolvedValueOnce(reviews.map((review_date) => ({ review_date })))
        .mockResolvedValueOnce([{ display_name: null, ...profile }])
        .mockResolvedValueOnce(frozen.map((local_date) => ({ local_date })))
        .mockResolvedValue([]);
      const summary = await computeSrsSummary(queryFn, 'user-9', tz);
      return { summary, queryFn };
    } finally {
      Date.now = realNow;
    }
  };
  const fresh = { streak_freezes_available: 2, freezes_refilled_on: '2026-08-31' };

  it('uses a freeze for a missed day and keeps the streak', async () => {
    // Thu 2026-09-03; studied Mon+Tue, missed Wed.
    const { summary, queryFn } = await at('2026-09-03T15:00:00.000Z', ['2026-09-01', '2026-08-31'], fresh);
    expect(summary.current_streak_days).toBe(2);
    expect(summary.freezes).toEqual({ available: 1, used_this_week: 1, refills_on: '2026-09-07' });
    expect(queryFn).toHaveBeenCalledTimes(5);
    expect(queryFn.mock.calls[4][0]).toContain('insert into public.streak_freeze_uses');
    expect(queryFn.mock.calls[4][1]).toEqual(['user-9', ['2026-09-02'], 1, '2026-08-31']);
  });

  it('breaks the streak when no freeze is left, and writes nothing', async () => {
    const { summary, queryFn } = await at('2026-09-03T15:00:00.000Z', ['2026-09-01', '2026-08-31'], {
      streak_freezes_available: 0,
      freezes_refilled_on: '2026-08-31',
    });
    expect(summary.current_streak_days).toBe(0);
    expect(summary.freezes.available).toBe(0);
    expect(queryFn).toHaveBeenCalledTimes(4);
  });

  it('does not spend freezes on a gap longer than what is left', async () => {
    const { summary, queryFn } = await at('2026-09-05T15:00:00.000Z', ['2026-09-01'], fresh);
    expect(summary.current_streak_days).toBe(0);
    expect(summary.freezes.available).toBe(2);
    expect(queryFn).toHaveBeenCalledTimes(4);
  });

  it('refills to 2 on Monday before using one', async () => {
    // Mon 2026-09-07; last week's freezes were used up; missed Sunday.
    const { summary, queryFn } = await at('2026-09-07T10:00:00.000Z', ['2026-09-05'], {
      streak_freezes_available: 0,
      freezes_refilled_on: '2026-08-31',
    });
    expect(summary.current_streak_days).toBe(1);
    expect(summary.freezes).toEqual({ available: 1, used_this_week: 0, refills_on: '2026-09-14' });
    expect(queryFn.mock.calls[4][1]).toEqual(['user-9', ['2026-09-06'], 1, '2026-09-07']);
  });

  it("uses the learner's local day (time zone)", async () => {
    // 18:00Z on 09-02 is already 09-03 in Ho Chi Minh: 09-02 counts as missed there.
    const local = await at('2026-09-02T18:00:00.000Z', ['2026-09-01'], fresh, [], 'Asia/Ho_Chi_Minh');
    expect(local.summary.freezes.used_this_week).toBe(1);
    expect(local.summary.current_streak_days).toBe(1);
    const utc = await at('2026-09-02T18:00:00.000Z', ['2026-09-01'], fresh, [], 'UTC');
    expect(utc.summary.freezes.used_this_week).toBe(0);
    expect(utc.queryFn).toHaveBeenCalledTimes(4);
  });

  it('lets a stored frozen day bridge the chain and reports the best streak', async () => {
    const old = ['2026-08-25', '2026-08-24', '2026-08-23', '2026-08-22', '2026-08-21', '2026-08-20'];
    const { summary } = await at(
      '2026-09-03T15:00:00.000Z',
      ['2026-09-03', '2026-09-01', ...old],
      { streak_freezes_available: 1, freezes_refilled_on: '2026-08-31' },
      ['2026-09-02'],
    );
    expect(summary.current_streak_days).toBe(2);
    expect(summary.best_streak_days).toBe(6);
    expect(summary.freezes).toEqual({ available: 1, used_this_week: 1, refills_on: '2026-09-07' });
  });
});

describe('computeSrsSummary stage_counts (UI-4 U4-2)', () => {
  it('splits words into new/learning/review/mastered like stageFromSrs', async () => {
    const queryFn = jest
      .fn()
      .mockResolvedValueOnce([
        {
          total_words: '9',
          mastered_words: '2',
          due_now: '3',
          leech_count: '1',
          new_rows: '1',
          learning_words: '4',
          review_words: '2',
          unseen_words: '5',
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ display_name: null }]);

    const summary = await computeSrsSummary(queryFn, 'user-9');

    // new = 1 row still in 'New' + 5 READY words never studied (seeds).
    expect(summary.stage_counts).toEqual({ new: 6, learning: 4, review: 2, mastered: 2 });
    const sql: string = queryFn.mock.calls[0][0];
    expect(sql).toContain("mastered_at is null and fsrs_state in ('Learning', 'Relearning')");
    expect(sql).toContain("mastered_at is null and fsrs_state = 'Review'");
    expect(sql).toContain("tw.status = 'READY'");
    expect(sql).toContain('u2.user_id = $1');
    // Leeches are not subtracted from any stage (A7 rule).
    expect(sql).not.toContain('not is_leech');
  });

  it('defaults every stage to 0 when the aggregate row lacks the fields', async () => {
    const queryFn = jest
      .fn()
      .mockResolvedValueOnce([{ due_now: '0', leech_count: '0' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ display_name: null }]);

    const summary = await computeSrsSummary(queryFn, 'user-9');

    expect(summary.stage_counts).toEqual({ new: 0, learning: 0, review: 0, mastered: 0 });
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
        rating: 'GOOD',
        graded: true,
        state: 'Review',
        stability: 2.3,
        difficulty: 2.1,
        reps: 1,
        lapses: 0,
        scheduled_days: 1,
        is_leech: false,
        is_mastered: false,
        was_correct: true,
        next_due_at: new Date(),
        just_mastered: false,
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
    expect(rateSpy.mock.calls[0][3]).toBe('sync'); // logged with source = 'sync'
    expect(rateSpy.mock.calls[1][1].topicWordId).toBe('w-later');

    expect(results.find((r) => r.topicWordId === 'w-earlier')?.status).toBe('error');
    expect(results.find((r) => r.topicWordId === 'w-later')?.status).toBe('applied');
  });
});
