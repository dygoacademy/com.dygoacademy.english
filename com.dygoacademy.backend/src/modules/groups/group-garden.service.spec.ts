import { ForbiddenException, GoneException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { DatabaseService } from '../../database/database.service';
import { GroupGardenService, safeTimeZone } from './group-garden.service';

async function makeService(queryAs: jest.Mock, withUser?: jest.Mock): Promise<GroupGardenService> {
  const moduleRef = await Test.createTestingModule({
    providers: [
      GroupGardenService,
      { provide: DatabaseService, useValue: { queryAs, withUser: withUser ?? jest.fn() } },
    ],
  }).compile();
  return moduleRef.get(GroupGardenService);
}

/** Fakes DatabaseService.withUser: hands the callback a stub pg client. */
function withUserOf(query: jest.Mock): jest.Mock {
  return jest.fn((_userId: string, work: (client: { query: jest.Mock }) => unknown) =>
    work({ query }),
  );
}

/** Columns a response must never carry: who someone is, or their own progress rows. */
const PERSONAL_KEYS = [
  'user_id',
  'email',
  'display_name',
  'fsrs_state',
  'next_due_at',
  'mastered_at',
];

function expectNoPersonalKeys(value: unknown) {
  const json = JSON.stringify(value);
  for (const key of PERSONAL_KEYS) expect(json).not.toContain(`"${key}"`);
}

describe('safeTimeZone', () => {
  it('keeps a real IANA zone and turns anything else into UTC', () => {
    expect(safeTimeZone('Asia/Ho_Chi_Minh')).toBe('Asia/Ho_Chi_Minh');
    expect(safeTimeZone('Mars/Olympus')).toBe('UTC');
    expect(safeTimeZone("UTC'; drop table x; --")).toBe('UTC');
    expect(safeTimeZone(undefined)).toBe('UTC');
  });
});

describe('GroupGardenService.countsForMine (GR1)', () => {
  it('runs as the caller, counts through group_garden_counts, and my due words from my own rows', async () => {
    const queryAs = jest
      .fn()
      .mockResolvedValue([
        { group_id: 'g1', member_count: '5', bed_count: '3', word_count: '126', my_due_count: '5' },
      ]);
    const service = await makeService(queryAs);

    const result = await service.countsForMine('user-1');

    const [userId, sql, params] = queryAs.mock.calls[0];
    expect(userId).toBe('user-1');
    expect(sql).toMatch(/public\.group_garden_counts\(g\.id\)/);
    expect(sql).toMatch(
      /join public\.group_members gm on gm\.group_id = g\.id and gm\.user_id = \$1/,
    );
    expect(sql).toMatch(/where s\.user_id = \$1/);
    expect(params).toEqual(['user-1']);
    expect(result).toEqual([
      { group_id: 'g1', member_count: 5, bed_count: 3, word_count: 126, my_due_count: 5 },
    ]);
    expectNoPersonalKeys(result);
  });
});

describe('GroupGardenService.garden (GR2)', () => {
  function clientQuery(headRows: unknown[]) {
    return jest
      .fn()
      .mockResolvedValueOnce({ rows: headRows })
      .mockResolvedValueOnce({ rows: [{ watered_count: '4', ripe_count: '412' }] })
      .mockResolvedValueOnce({
        rows: [
          {
            topic_id: 't1',
            title: 'Environment',
            word_count: '48',
            due_count: '5',
            seed_count: '11',
            sprout_count: '11',
            flower_count: '7',
            tree_count: '19',
          },
          {
            topic_id: 't2',
            title: 'Education',
            word_count: '40',
            due_count: '0',
            seed_count: '4',
            sprout_count: '5',
            flower_count: '9',
            tree_count: '22',
          },
        ],
      });
  }
  const head = {
    id: 'g1',
    name: 'IELTS Sprint · Week 3',
    description: null,
    is_public: false,
    role: 'ADMIN',
    member_count: '5',
    bed_count: '3',
    word_count: '126',
  };

  it('returns group totals and my own beds, and nothing personal about anyone', async () => {
    const query = clientQuery([head]);
    const service = await makeService(jest.fn(), withUserOf(query));

    const garden = await service.garden('user-1', 'g1', 'Asia/Ho_Chi_Minh');

    expect(garden).toMatchObject({
      id: 'g1',
      role: 'ADMIN',
      member_count: 5,
      word_count: 126,
      watered_today: 4,
      ripe_plants: 412,
      total_plants: 630,
      my_due_count: 5,
    });
    expect(garden.beds[0]).toEqual({
      topic_id: 't1',
      title: 'Environment',
      word_count: 48,
      due_count: 5,
      seed_count: 11,
      sprout_count: 11,
      flower_count: 7,
      tree_count: 19,
    });
    expectNoPersonalKeys(garden);
  });

  it("counts 'watered today' from midnight in the learner's zone, via the aggregate function", async () => {
    const query = clientQuery([head]);
    const service = await makeService(jest.fn(), withUserOf(query));

    await service.garden('user-1', 'g1', 'Asia/Ho_Chi_Minh');

    const [sql, params] = query.mock.calls[1];
    expect(sql).toMatch(
      /public\.group_garden_activity\(\$1, \(date_trunc\('day', now\(\) at time zone \$2\) at time zone \$2\)\)/,
    );
    expect(params).toEqual(['g1', 'Asia/Ho_Chi_Minh']);
  });

  it('never passes an unknown zone to Postgres', async () => {
    const query = clientQuery([head]);
    const service = await makeService(jest.fn(), withUserOf(query));

    await service.garden('user-1', 'g1', 'nowhere');

    expect(query.mock.calls[1][1]).toEqual(['g1', 'UTC']);
  });

  it("reads the beds' stage and due counts only from the caller's own SRS rows", async () => {
    const query = clientQuery([head]);
    const service = await makeService(jest.fn(), withUserOf(query));

    await service.garden('user-1', 'g1');

    const [sql, params] = query.mock.calls[2];
    expect(sql).toMatch(
      /left join public\.user_word_srs s on s\.topic_word_id = tw\.id and s\.user_id = \$2/,
    );
    expect(params).toEqual(['g1', 'user-1']);
  });

  it('is a 404 for a non-member (no membership row)', async () => {
    const query = jest.fn().mockResolvedValueOnce({ rows: [] });
    const service = await makeService(jest.fn(), withUserOf(query));

    await expect(service.garden('user-9', 'g1')).rejects.toBeInstanceOf(NotFoundException);
    expect(query).toHaveBeenCalledTimes(1);
  });
});

describe('GroupGardenService.trickyPatches (GR3)', () => {
  it('is 403 for a non-admin and never reaches the aggregate', async () => {
    const queryAs = jest.fn().mockResolvedValueOnce([{ allowed: false }]);
    const service = await makeService(queryAs);

    await expect(service.trickyPatches('user-1', 'g1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(queryAs).toHaveBeenCalledTimes(1);
  });

  it('returns totals for the last 7 days by default, clamping days and limit', async () => {
    const queryAs = jest
      .fn()
      .mockResolvedValueOnce([{ allowed: true }])
      .mockResolvedValueOnce([
        { topic_word_id: 'w1', source_word: 'deteriorate', misses: '14', gardeners: '4' },
      ]);
    const service = await makeService(queryAs);

    const rows = await service.trickyPatches('user-1', 'g1');
    expect(rows).toEqual([
      { topic_word_id: 'w1', source_word: 'deteriorate', misses: 14, gardeners: 4 },
    ]);
    const [, sql, params] = queryAs.mock.calls[1];
    expect(sql).toMatch(
      /public\.group_tricky_patches\(\$1, now\(\) - make_interval\(days => \$2\), \$3\)/,
    );
    expect(params).toEqual(['g1', 7, 5]);
    expectNoPersonalKeys(rows);

    queryAs.mockResolvedValueOnce([{ allowed: true }]).mockResolvedValueOnce([]);
    await service.trickyPatches('user-1', 'g1', '9999', '-3');
    expect(queryAs.mock.calls[3][2]).toEqual(['g1', 90, 1]);
  });
});

describe('GroupGardenService.invitePreview (GR6)', () => {
  it('returns the preview without member data', async () => {
    const queryAs = jest.fn().mockResolvedValue([
      {
        group_id: 'g1',
        group_name: 'IELTS Sprint · Week 3',
        group_description: 'Band 7',
        inviter_name: 'Minh',
        grant_role: 'READ',
        member_count: '5',
        bed_count: '3',
        word_count: '126',
        already_member: false,
      },
    ]);
    const service = await makeService(queryAs);

    const preview = await service.invitePreview('user-2', 'tok');

    expect(queryAs.mock.calls[0][1]).toMatch(/from public\.group_invite_preview\(\$1\)/);
    expect(queryAs.mock.calls[0][2]).toEqual(['tok']);
    expect(preview).toEqual({
      group_id: 'g1',
      group_name: 'IELTS Sprint · Week 3',
      group_description: 'Band 7',
      inviter_name: 'Minh',
      grant_role: 'READ',
      member_count: 5,
      bed_count: 3,
      word_count: 126,
      already_member: false,
    });
    expectNoPersonalKeys(preview);
  });

  it('maps an unknown token to 404 and a dead one to 410, like redeem', async () => {
    const notFound = await makeService(jest.fn().mockRejectedValue({ code: 'P0002' }));
    await expect(notFound.invitePreview('u', 'x')).rejects.toBeInstanceOf(NotFoundException);

    const gone = await makeService(
      jest.fn().mockRejectedValue({ code: '22023', message: 'invite has expired' }),
    );
    await expect(gone.invitePreview('u', 'x')).rejects.toBeInstanceOf(GoneException);
  });
});
