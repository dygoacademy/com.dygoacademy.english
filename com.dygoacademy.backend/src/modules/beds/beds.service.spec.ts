import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { DatabaseService } from '../../database/database.service';
import { BedsService } from './beds.service';
import { FIRST_BED_TITLES } from '../profiles/profiles.service';

const NEXT = 'cccccccc-0000-0000-0000-000000000002';
const OLD = 'cccccccc-0000-0000-0000-000000000009';

/** A fake withUser whose client answers `query` from `answers` in order. */
function fakeDb(answers: unknown[][]) {
  const query = jest.fn();
  for (const rows of answers) query.mockResolvedValueOnce({ rows, rowCount: rows.length });
  const withUser = jest.fn((_userId: string, work: (client: unknown) => Promise<unknown>) =>
    work({ query }),
  );
  return { query, withUser };
}

async function makeService(db: ReturnType<typeof fakeDb>) {
  const moduleRef = await Test.createTestingModule({
    providers: [BedsService, { provide: DatabaseService, useValue: db }],
  }).compile();
  return moduleRef.get(BedsService);
}

const state = (topic_id: string, word_count: number, unplanted_count: number) => ({
  topic_id,
  title: topic_id,
  word_count,
  unplanted_count,
});

describe('BedsService.active', () => {
  it('reads the active bed and whether it is ready to harvest', async () => {
    const db = fakeDb([[{ topic_id: OLD }], [state(OLD, 5, 0)]]);
    const service = await makeService(db);
    await expect(service.active('user-1')).resolves.toEqual({
      ...state(OLD, 5, 0),
      harvest_ready: true,
    });
    expect(db.query.mock.calls[0][0]).toMatch(
      /from public\.user_beds ub where ub\.user_id = auth\.uid\(\) and ub\.status = 'active'/,
    );
  });

  it('is null without a bed, and an empty bed is not ready', async () => {
    const service = await makeService(fakeDb([[{ topic_id: null }]]));
    await expect(service.active('user-1')).resolves.toBeNull();
    const empty = await makeService(fakeDb([[{ topic_id: OLD }], [state(OLD, 0, 0)]]));
    await expect(empty.active('user-1')).resolves.toMatchObject({ harvest_ready: false });
  });
});

describe('BedsService.plant (S3 Plant <bed>)', () => {
  it('harvests a fully planted bed and makes the packet the active bed', async () => {
    const db = fakeDb([[state(NEXT, 30, 30)], [{ topic_id: OLD }], [state(OLD, 5, 0)], [], []]);
    const service = await makeService(db);
    await expect(service.plant('user-1', NEXT)).resolves.toMatchObject({ topic_id: NEXT });
    const [leaveSql, leaveParams] = db.query.mock.calls[3];
    expect(leaveSql).toMatch(/insert into public\.user_beds/);
    expect(leaveParams).toEqual([OLD, 'harvested']);
    const [plantSql, plantParams] = db.query.mock.calls[4];
    expect(plantSql).toMatch(/set status = 'active', harvested_at = null/);
    expect(plantParams).toEqual([NEXT]);
  });

  it('rests a bed that still has seeds', async () => {
    const db = fakeDb([[state(NEXT, 30, 30)], [{ topic_id: OLD }], [state(OLD, 5, 2)], [], []]);
    await (await makeService(db)).plant('user-1', NEXT);
    expect(db.query.mock.calls[3][1]).toEqual([OLD, 'resting']);
  });

  it('only plants when there was no bed, and does nothing for the active bed', async () => {
    const none = fakeDb([[state(NEXT, 30, 30)], [{ topic_id: null }], []]);
    await (await makeService(none)).plant('user-1', NEXT);
    expect(none.query).toHaveBeenCalledTimes(3);
    const same = fakeDb([[state(NEXT, 30, 30)], [{ topic_id: NEXT }]]);
    await (await makeService(same)).plant('user-1', NEXT);
    expect(same.query).toHaveBeenCalledTimes(2);
  });

  it('is a 404 for a bed RLS hides', async () => {
    const service = await makeService(fakeDb([[]]));
    await expect(service.plant('user-1', NEXT)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('BedsService.harvest (S2)', () => {
  it('counts the stages and knows a first harvest', async () => {
    const words = [
      { topic_word_id: 'w1', word: 'mitigate', stage: 'fruit' },
      { topic_word_id: 'w2', word: 'emission', stage: 'ripe' },
      { topic_word_id: 'w3', word: 'drought', stage: 'growing' },
      { topic_word_id: 'w4', word: 'habitat', stage: 'growing' },
    ];
    const db = fakeDb([[state(OLD, 4, 0)], words, [{ n: 0 }]]);
    const harvest = await (await makeService(db)).harvest('user-1', OLD);
    expect(harvest).toMatchObject({
      harvest_ready: true,
      first_harvest: true,
      fruit: 1,
      ripe: 1,
      growing: 2,
    });
    expect(harvest.words).toHaveLength(4);
    expect(db.query.mock.calls[1][0]).toMatch(/when uws\.mastered_at is not null then 'fruit'/);
  });

  it('is a 404 for a bed RLS hides', async () => {
    const service = await makeService(fakeDb([[]]));
    await expect(service.harvest('user-1', OLD)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('BedsService.packets (S3)', () => {
  it('passes the goal title pattern and returns the packets with a level line', async () => {
    const db = fakeDb([
      [{ cefr_level: 'B2', study_goal: 'IELTS', target_band: 7 }],
      [
        {
          topic_id: NEXT,
          title: 'Climate policy',
          collection: 'IELTS Academic',
          shelf: 'academic',
          word_count: 32,
          known_count: 6,
          levels: ['B2', 'B2', 'B2', 'B2'],
          fits_goal: false,
        },
      ],
      [{ shelf: 'academic', active: true }],
    ]);
    const result = await (await makeService(db)).packets('user-1');
    expect(db.query.mock.calls[1][1]).toEqual([FIRST_BED_TITLES.IELTS]);
    expect(result).toEqual({
      packets: [
        {
          kind: 'bee',
          topic_id: NEXT,
          title: 'Climate policy',
          collection: 'IELTS Academic',
          level: 'B2',
          word_count: 32,
          known_count: 6,
        },
      ],
      study_goal: 'IELTS',
      target_band: 7,
    });
  });
});
