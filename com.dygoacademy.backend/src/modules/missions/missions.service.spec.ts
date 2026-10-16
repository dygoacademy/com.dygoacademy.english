import { Test } from '@nestjs/testing';

import { DatabaseService } from '../../database/database.service';
import { MissionsService } from './missions.service';
import { isSpeakDay, localDateOf } from './missions.store';

async function makeService(db: Partial<Record<'queryAs' | 'withUser', jest.Mock>>) {
  const moduleRef = await Test.createTestingModule({
    providers: [MissionsService, { provide: DatabaseService, useValue: db }],
  }).compile();
  return moduleRef.get(MissionsService);
}

const withUserOf = (query: jest.Mock) =>
  jest.fn((_u: string, work: (c: { query: jest.Mock }) => unknown) => work({ query }));

interface Day {
  timezone?: string;
  existing?: number;
  due?: number;
  goal?: number | null;
  speakable?: number;
  rows?: Array<{ type: string; target: number; progress: number; completed_at: Date | null }>;
}

/** A pg client answering by SQL shape, so the order of reads doesn't matter. */
function clientFor(day: Day): jest.Mock {
  return jest.fn((sql: string) => {
    if (sql.includes('timezone')) return { rows: [{ timezone: day.timezone ?? 'UTC' }] };
    if (sql.includes('count(*) as n from public.daily_missions'))
      return { rows: [{ n: String(day.existing ?? 0) }] };
    if (sql.includes('from public.user_word_srs')) return { rows: [{ n: String(day.due ?? 0) }] };
    if (sql.includes('daily_goal_minutes'))
      return { rows: [{ daily_goal_minutes: day.goal === undefined ? 10 : day.goal }] };
    if (sql.includes('speaking_items')) return { rows: [{ n: String(day.speakable ?? 0) }] };
    if (sql.includes('insert into public.daily_missions')) return { rows: [] };
    if (sql.includes('select type, target, progress')) return { rows: day.rows ?? [] };
    throw new Error(`unexpected SQL: ${sql}`);
  });
}

/** The (type, target, done-from-start) triples the insert wrote. */
function inserted(query: jest.Mock): Array<[string, number, boolean]> {
  const call = query.mock.calls.find(([sql]) => String(sql).includes('insert into'));
  if (!call) return [];
  const params = call[1] as unknown[];
  const out: Array<[string, number, boolean]> = [];
  for (let i = 2; i < params.length; i += 3)
    out.push([params[i] as string, params[i + 1] as number, params[i + 2] as boolean]);
  return out;
}

describe('MissionsService (UI-6 U6-2, daily goal missions)', () => {
  // 17:30Z = 00:30 next day in Ho Chi Minh (UTC+7).
  const NOW = new Date('2026-10-01T17:30:00.000Z');
  const QUIZ_DAY = new Date('2026-10-02T09:00:00Z');
  const SPEAK_DAY = new Date('2026-10-07T09:00:00Z');

  it('localDateOf uses the learner time zone', () => {
    expect(localDateOf(NOW, 'Asia/Ho_Chi_Minh')).toBe('2026-10-02');
    expect(localDateOf(NOW, 'America/New_York')).toBe('2026-10-01');
  });

  it('isSpeakDay alternates by local date', () => {
    expect(isSpeakDay('2026-10-01')).toBe(true);
    expect(isSpeakDay('2026-10-02')).toBe(false);
    expect(isSpeakDay('2026-10-07')).toBe(true);
  });

  it("10 min goal: today's rows match the old day (water, plant 5, quiz); 0 due = water done", async () => {
    const query = clientFor({
      timezone: 'Asia/Ho_Chi_Minh',
      due: 0,
      rows: [
        { type: 'QUIZ', target: 1, progress: 0, completed_at: null },
        { type: 'REVIEW_DUE', target: 1, progress: 1, completed_at: new Date() },
        { type: 'LEARN_NEW', target: 5, progress: 2, completed_at: null },
      ],
    });
    const service = await makeService({ withUser: withUserOf(query) });

    const res = await service.today('user-1', undefined, NOW);

    expect(inserted(query)).toEqual([
      ['REVIEW_DUE', 1, true],
      ['LEARN_NEW', 5, false],
      ['QUIZ', 1, false],
    ]);
    expect(res.date).toBe('2026-10-02');
    expect(res.missions.map((m) => [m.type, m.progress, m.target, m.done])).toEqual([
      ['REVIEW_DUE', 1, 1, true],
      ['LEARN_NEW', 2, 5, false],
      ['QUIZ', 0, 1, false],
    ]);
    expect(res.goldenBloom).toBe(false);
    expect(res.quiz_questions).toBe(10);
    // 1×10 s + 5×40 s + 10×12 s = 330 s → 6 min
    expect(res.estimate_minutes).toBe(6);
  });

  it('10 min goal on a speak day: SPEAK (3) instead of QUIZ when 3+ words can be spoken', async () => {
    const query = clientFor({ due: 4, speakable: 12 });
    const service = await makeService({ withUser: withUserOf(query) });

    await service.today('user-1', undefined, SPEAK_DAY);

    expect(inserted(query)).toEqual([
      ['REVIEW_DUE', 4, false],
      ['LEARN_NEW', 5, false],
      ['SPEAK', 3, false],
    ]);
  });

  it('on a speak day with fewer than 3 speakable words the practice stays QUIZ', async () => {
    const query = clientFor({ due: 0, speakable: 2 });
    const service = await makeService({ withUser: withUserOf(query) });

    await service.today('user-1', undefined, SPEAK_DAY);

    expect(inserted(query).map(([t]) => t)).toEqual(['REVIEW_DUE', 'LEARN_NEW', 'QUIZ']);
  });

  it('30 min goal: water, plant 15, quiz and speak 5 — four missions', async () => {
    const query = clientFor({ goal: 30, due: 6, speakable: 20 });
    const service = await makeService({ withUser: withUserOf(query) });

    await service.today('user-1', undefined, QUIZ_DAY);

    expect(inserted(query)).toEqual([
      ['REVIEW_DUE', 6, false],
      ['LEARN_NEW', 15, false],
      ['QUIZ', 1, false],
      ['SPEAK', 5, false],
    ]);
  });

  it('a catch-up day (watering fills the goal) has no Plant mission', async () => {
    const query = clientFor({ goal: 10, due: 80 });
    const service = await makeService({ withUser: withUserOf(query) });

    await service.today('user-1', undefined, QUIZ_DAY);

    expect(inserted(query).map(([t]) => t)).toEqual(['REVIEW_DUE', 'QUIZ']);
  });

  it('today() does not re-create rows and reports a Golden Bloom when every mission is done', async () => {
    const done = new Date();
    const query = clientFor({
      existing: 2,
      rows: ['REVIEW_DUE', 'QUIZ'].map((type) => ({
        type,
        target: 1,
        progress: 1,
        completed_at: done,
      })),
    });
    const service = await makeService({ withUser: withUserOf(query) });

    const res = await service.today('user-1', 'America/New_York', NOW);

    expect(inserted(query)).toEqual([]);
    expect(res.date).toBe('2026-10-01');
    expect(res.goldenBloom).toBe(true);
  });

  it('week() returns 7 local days, oldest first; Golden Bloom = all of that day done', async () => {
    const queryAs = jest
      .fn()
      .mockResolvedValueOnce([{ timezone: 'Asia/Ho_Chi_Minh' }])
      .mockResolvedValueOnce([
        { local_date: '2026-10-02', done: '3', total: '3' },
        { local_date: '2026-10-01', done: '3', total: '4' },
        { local_date: '2026-09-28', done: '1', total: '3' },
      ]);
    const service = await makeService({ queryAs });

    const week = await service.week('user-1', undefined, NOW);

    expect(queryAs.mock.calls[1][2]).toEqual(['user-1', '2026-09-26', '2026-10-02']);
    expect(week).toHaveLength(7);
    expect(week[0]).toEqual({ date: '2026-09-26', done: 0, goldenBloom: false });
    expect(week[2]).toEqual({ date: '2026-09-28', done: 1, goldenBloom: false });
    expect(week[5]).toEqual({ date: '2026-10-01', done: 3, goldenBloom: false });
    expect(week[6]).toEqual({ date: '2026-10-02', done: 3, goldenBloom: true });
  });
});
