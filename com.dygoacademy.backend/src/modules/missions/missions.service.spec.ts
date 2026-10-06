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

describe('MissionsService (UI-6 U6-2)', () => {
  // 17:30Z = 00:30 next day in Ho Chi Minh (UTC+7).
  const NOW = new Date('2026-10-01T17:30:00.000Z');

  it('localDateOf uses the learner time zone', () => {
    expect(localDateOf(NOW, 'Asia/Ho_Chi_Minh')).toBe('2026-10-02');
    expect(localDateOf(NOW, 'America/New_York')).toBe('2026-10-01');
  });

  it("today() creates the day's rows on first read; 0 due words = REVIEW_DUE already done", async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ timezone: 'Asia/Ho_Chi_Minh' }] })
      .mockResolvedValueOnce({ rows: [{ n: '0' }] }) // no rows yet
      .mockResolvedValueOnce({ rows: [{ n: '0' }] }) // 0 due
      .mockResolvedValueOnce({ rows: [] }) // insert
      .mockResolvedValueOnce({
        rows: [
          { type: 'QUIZ', target: 1, progress: 0, completed_at: null },
          { type: 'REVIEW_DUE', target: 1, progress: 1, completed_at: new Date() },
          { type: 'LEARN_NEW', target: 5, progress: 2, completed_at: null },
        ],
      });
    const service = await makeService({ withUser: withUserOf(query) });

    const res = await service.today('user-1', undefined, NOW);

    expect(query.mock.calls[3][0]).toContain('insert into public.daily_missions');
    expect(query.mock.calls[3][1]).toEqual(['user-1', '2026-10-02', 0, 5, 'QUIZ', 1]);
    expect(res.date).toBe('2026-10-02');
    expect(res.missions.map((m) => [m.type, m.progress, m.target, m.done])).toEqual([
      ['REVIEW_DUE', 1, 1, true],
      ['LEARN_NEW', 2, 5, false],
      ['QUIZ', 0, 1, false],
    ]);
    expect(res.goldenBloom).toBe(false);
  });

  it('isSpeakDay alternates by local date', () => {
    expect(isSpeakDay('2026-10-01')).toBe(true);
    expect(isSpeakDay('2026-10-02')).toBe(false);
    expect(isSpeakDay('2026-10-07')).toBe(true);
  });

  it('on a speak day the 3rd mission is SPEAK (target 3) when 3+ words can be spoken', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ timezone: 'UTC' }] })
      .mockResolvedValueOnce({ rows: [{ n: '0' }] }) // no rows yet
      .mockResolvedValueOnce({ rows: [{ n: '4' }] }) // 4 due
      .mockResolvedValueOnce({ rows: [{ n: '12' }] }) // 12 speakable words
      .mockResolvedValueOnce({ rows: [] }) // insert
      .mockResolvedValueOnce({
        rows: [
          { type: 'SPEAK', target: 3, progress: 1, completed_at: null },
          { type: 'REVIEW_DUE', target: 4, progress: 0, completed_at: null },
          { type: 'LEARN_NEW', target: 5, progress: 0, completed_at: null },
        ],
      });
    const service = await makeService({ withUser: withUserOf(query) });

    const res = await service.today('user-1', undefined, new Date('2026-10-07T09:00:00Z'));

    expect(query.mock.calls[3][0]).toContain('speaking_items');
    expect(query.mock.calls[4][1]).toEqual(['user-1', '2026-10-07', 4, 5, 'SPEAK', 3]);
    expect(res.missions.map((m) => m.type)).toEqual(['REVIEW_DUE', 'LEARN_NEW', 'SPEAK']);
  });

  it('on a speak day with fewer than 3 speakable words the 3rd mission stays QUIZ', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ timezone: 'UTC' }] })
      .mockResolvedValueOnce({ rows: [{ n: '0' }] })
      .mockResolvedValueOnce({ rows: [{ n: '0' }] })
      .mockResolvedValueOnce({ rows: [{ n: '2' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const service = await makeService({ withUser: withUserOf(query) });

    await service.today('user-1', undefined, new Date('2026-10-07T09:00:00Z'));

    expect(query.mock.calls[4][1]).toEqual(['user-1', '2026-10-07', 0, 5, 'QUIZ', 1]);
  });

  it('today() does not re-create rows and reports a Golden Bloom when all 3 are done', async () => {
    const done = new Date();
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ timezone: 'UTC' }] }) // never set → detected tz
      .mockResolvedValueOnce({ rows: [{ n: '3' }] })
      .mockResolvedValueOnce({
        rows: ['REVIEW_DUE', 'LEARN_NEW', 'QUIZ'].map((type) => ({
          type,
          target: 1,
          progress: 1,
          completed_at: done,
        })),
      });
    const service = await makeService({ withUser: withUserOf(query) });

    const res = await service.today('user-1', 'America/New_York', NOW);

    expect(query).toHaveBeenCalledTimes(3);
    expect(res.date).toBe('2026-10-01');
    expect(res.goldenBloom).toBe(true);
  });

  it('week() returns 7 local days, oldest first, with done counts and Golden Blooms', async () => {
    const queryAs = jest
      .fn()
      .mockResolvedValueOnce([{ timezone: 'Asia/Ho_Chi_Minh' }])
      .mockResolvedValueOnce([
        { local_date: '2026-10-02', done: '3' },
        { local_date: '2026-09-28', done: '1' },
      ]);
    const service = await makeService({ queryAs });

    const week = await service.week('user-1', undefined, NOW);

    expect(queryAs.mock.calls[1][2]).toEqual(['user-1', '2026-09-26', '2026-10-02']);
    expect(week).toHaveLength(7);
    expect(week[0]).toEqual({ date: '2026-09-26', done: 0, goldenBloom: false });
    expect(week[2]).toEqual({ date: '2026-09-28', done: 1, goldenBloom: false });
    expect(week[6]).toEqual({ date: '2026-10-02', done: 3, goldenBloom: true });
  });
});
