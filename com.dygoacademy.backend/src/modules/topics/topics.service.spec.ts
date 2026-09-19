import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { DatabaseService } from '../../database/database.service';
import { TopicsService } from './topics.service';

/** Builds a fresh TopicsService wired to stubbed DatabaseService methods. */
async function makeService(
  queryAsMock: jest.Mock,
  withUserMock?: jest.Mock,
): Promise<TopicsService> {
  const moduleRef = await Test.createTestingModule({
    providers: [
      TopicsService,
      {
        provide: DatabaseService,
        useValue: { queryAs: queryAsMock, withUser: withUserMock ?? jest.fn() },
      },
    ],
  }).compile();
  return moduleRef.get(TopicsService);
}

/**
 * Phase 0 has exactly one live query (see dygo_academy_api_surface.md
 * §"Live today"), so this suite is small on purpose. What it protects
 * against: (1) someone adding a tenant/group WHERE clause to "help"
 * filtering, which would duplicate — and could contradict — the RLS
 * policy in 002_rls_policies.sql, and (2) the query silently stopping
 * calling queryAs with the caller's userId, which would run it outside
 * RLS entirely (see DatabaseService.query vs queryAs).
 */
describe('TopicsService', () => {
  let service: TopicsService;
  let queryAsMock: jest.Mock;

  beforeEach(async () => {
    queryAsMock = jest.fn().mockResolvedValue([
      {
        id: 'topic-1',
        group_id: 'group-1',
        title: 'Phrasal Verbs',
        description: null,
        is_public: true,
        word_count: '3',
        mastered_count: '2',
        created_at: new Date('2026-08-01T00:00:00Z'),
      },
    ]);

    const moduleRef = await Test.createTestingModule({
      providers: [TopicsService, { provide: DatabaseService, useValue: { queryAs: queryAsMock } }],
    }).compile();

    service = moduleRef.get(TopicsService);
  });

  it('scopes the query through queryAs with the caller id, not a raw query', async () => {
    await service.findAllVisible('user-42');

    expect(queryAsMock).toHaveBeenCalledTimes(1);
    const [userId] = queryAsMock.mock.calls[0];
    expect(userId).toBe('user-42');
  });

  it('does not add its own tenant/group filter — RLS is the only gate', async () => {
    await service.findAllVisible('user-42');

    // Phase 3 Module 19 added a legitimate `filter (where ...)` clause on
    // the mastered_count aggregate -- strip that before asserting, since
    // this test's actual concern is a WHERE clause on the topics query
    // itself (duplicating/contradicting RLS), not the aggregate's own
    // per-row filter.
    const [, sql] = queryAsMock.mock.calls[0] as [string, string];
    const sqlWithoutAggregateFilters = sql.replace(/filter\s*\(\s*where[^)]*\)/gi, '');
    expect(sqlWithoutAggregateFilters).not.toMatch(/where/i);
  });

  it('returns the rows from the database layer unchanged', async () => {
    const result = await service.findAllVisible('user-42');

    expect(result).toEqual([expect.objectContaining({ id: 'topic-1', title: 'Phrasal Verbs' })]);
  });

  /**
   * Phase 3 Module 19 (FR-19.1) — the DB layer is fully mocked in this
   * suite (no live Postgres in this sandbox, same standing limitation as
   * every other backend suite in this repo), so the query's actual
   * counting logic can't be asserted against real rows here. What these
   * two tests protect against instead: someone silently dropping the new
   * join/field, or drifting the mastery threshold away from the one
   * `computeSrsSummary` already defines.
   */
  it('joins user_word_srs and filters mastered_count on the same repetitions >= 4 threshold computeSrsSummary uses', async () => {
    await service.findAllVisible('user-42');

    const [, sql] = queryAsMock.mock.calls[0];
    expect(sql).toMatch(/left join public\.user_word_srs/i);
    expect(sql).toMatch(/mastered_count/i);
    expect(sql).toMatch(/repetitions >= 4/i);
  });

  it('passes mastered_count through unchanged, alongside word_count', async () => {
    const result = await service.findAllVisible('user-42');

    expect(result).toEqual([expect.objectContaining({ word_count: '3', mastered_count: '2' })]);
  });
});

describe('TopicsService — create', () => {
  it('maps an RLS violation (no WRITE on the group) to ForbiddenException', async () => {
    const queryAsMock = jest.fn().mockRejectedValue({ code: '42501', message: 'rls violation' });
    const service = await makeService(queryAsMock);

    await expect(
      service.create('user-1', { groupId: 'group-1', title: 'New Topic' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('trims the title and defaults isPublic to false', async () => {
    const queryAsMock = jest.fn().mockResolvedValue([
      {
        id: 'topic-1',
        group_id: 'group-1',
        title: 'New Topic',
        description: null,
        is_public: false,
        created_at: new Date(),
      },
    ]);
    const service = await makeService(queryAsMock);

    await service.create('user-1', { groupId: 'group-1', title: '  New Topic  ' });

    const [, , params] = queryAsMock.mock.calls[0];
    expect(params).toEqual(['group-1', 'New Topic', null, false]);
  });
});

describe('TopicsService — findById', () => {
  it('throws NotFoundException when the topic query returns zero rows', async () => {
    const queryAsMock = jest.fn().mockResolvedValue([]);
    const service = await makeService(queryAsMock);

    await expect(service.findById('user-1', 'topic-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('attaches words from a second RLS-scoped query, not a join', async () => {
    const queryAsMock = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'topic-1',
          group_id: 'group-1',
          title: 'T',
          description: null,
          is_public: true,
          created_at: new Date(),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'word-1',
          source_word: 'resilient',
          language_code: 'en',
          status: 'READY',
          custom_note: null,
          created_at: new Date(),
        },
      ]);
    const service = await makeService(queryAsMock);

    const result = await service.findById('user-1', 'topic-1');

    expect(queryAsMock).toHaveBeenCalledTimes(2);
    expect(result.words).toHaveLength(1);
    expect(result.words[0].source_word).toBe('resilient');
  });
});

describe('TopicsService — update', () => {
  it('throws NotFoundException on zero rows (no WRITE, or missing)', async () => {
    const queryAsMock = jest.fn().mockResolvedValue([]);
    const service = await makeService(queryAsMock);

    await expect(service.update('user-1', 'topic-1', { title: 'X' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('TopicsService — remove', () => {
  it('throws NotFoundException on zero rows (ADMIN required, or missing)', async () => {
    const queryAsMock = jest.fn().mockResolvedValue([]);
    const service = await makeService(queryAsMock);

    await expect(service.remove('user-1', 'topic-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('TopicsService — clone', () => {
  /** Fakes DatabaseService.withUser by handing the callback a stub pg client. */
  function withUserOf(queryMock: jest.Mock): jest.Mock {
    return jest.fn((_userId: string, work: (client: { query: jest.Mock }) => unknown) =>
      work({ query: queryMock }),
    );
  }

  it('throws NotFoundException when the source topic is not public', async () => {
    const queryMock = jest.fn().mockResolvedValueOnce({ rows: [] });
    const service = await makeService(jest.fn(), withUserOf(queryMock));

    await expect(service.clone('user-1', 'topic-1', 'group-2')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(queryMock).toHaveBeenCalledTimes(1); // never attempted the insert
  });

  it('copies title/description into a new private topic, then copies words, in one transaction', async () => {
    const queryMock = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ title: 'AWL Set 1', description: 'Academic words' }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'topic-new',
            group_id: 'group-2',
            title: 'AWL Set 1',
            description: 'Academic words',
            is_public: false,
            created_at: new Date(),
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] }); // the topic_words copy
    const service = await makeService(jest.fn(), withUserOf(queryMock));

    const result = await service.clone('user-1', 'topic-1', 'group-2');

    expect(result.id).toBe('topic-new');
    expect(result.is_public).toBe(false); // clones start private, regardless of the source
    expect(queryMock).toHaveBeenCalledTimes(3);
    const [insertTopicSql, insertTopicParams] = queryMock.mock.calls[1];
    expect(insertTopicSql).toMatch(/insert into public\.topics/i);
    expect(insertTopicParams).toEqual(['group-2', 'AWL Set 1', 'Academic words']);
    const [copyWordsSql, copyWordsParams] = queryMock.mock.calls[2];
    expect(copyWordsSql).toMatch(/insert into public\.topic_words/i);
    expect(copyWordsSql).not.toMatch(/custom_note/i); // notes are personal, not copied
    expect(copyWordsParams).toEqual(['topic-new', 'user-1', 'topic-1']);
  });

  it('maps an RLS violation on the target group to ForbiddenException', async () => {
    const queryMock = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ title: 'AWL Set 1', description: null }] })
      .mockRejectedValueOnce({ code: '42501', message: 'rls violation' });
    const service = await makeService(jest.fn(), withUserOf(queryMock));

    await expect(service.clone('user-1', 'topic-1', 'group-2')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
