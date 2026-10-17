import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { DatabaseService } from '../../database/database.service';
import { foldForSearch, TopicsService, topicFilterGroup } from './topics.service';

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
 * Phase 0 has exactly one live query (see docs/architecture/dygo_academy_api_surface.md
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
        focus_word_count: '1',
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
  it('joins user_word_srs and filters mastered_count on the same sticky mastered_at rule computeSrsSummary uses (Phase 10)', async () => {
    await service.findAllVisible('user-42');

    const [, sql] = queryAsMock.mock.calls[0];
    expect(sql).toMatch(/left join public\.user_word_srs/i);
    expect(sql).toMatch(/mastered_count/i);
    expect(sql).toMatch(/mastered_at is not null/i);
  });

  /**
   * Phase 12 UI-5 (Word Garden A6, 2026-09-26): stage / due counts, CEFR
   * range and the bed's kind. Same mocked-DB limitation as above; the SQL
   * itself was run against a real Postgres (PGlite) with sample rows when
   * it was written (see the 2026-09-26 session report).
   */
  it('adds the garden stage counts on the same uws join, using FSRS state and sticky mastery', async () => {
    await service.findAllVisible('user-42');

    const [, sql] = queryAsMock.mock.calls[0] as [string, string];
    for (const field of ['seed_count', 'sprout_count', 'flower_count', 'due_count']) {
      expect(sql).toMatch(new RegExp(`as ${field}`));
    }
    expect(sql).toMatch(/fsrs_state in \('Learning', 'Relearning'\)/);
    expect(sql).toMatch(/fsrs_state = 'Review'/);
    expect(sql).toMatch(/next_due_at <= now\(\)/);
    expect(sql).toMatch(/min\(ml\.cefr_level\)/);
    expect(sql).toMatch(/as kind/);
  });

  it("decides the bed's kind from the caller's own id, passed as a parameter", async () => {
    await service.findAllVisible('user-42');

    const [userId, sql, params] = queryAsMock.mock.calls[0] as [string, string, unknown[]];
    expect(userId).toBe('user-42');
    expect(params).toEqual(['user-42']);
    expect(sql).toMatch(/g\.owner_id = \$1/);
    expect(sql).toMatch(/me\.user_id = \$1/);
  });

  /**
   * A6 fixed filter groups (2026-10-17): `filter_group` from the bed's kind
   * and, for a library bed, its collection's `library_shelf`.
   */
  it.each([
    ['mine', null, 'mine'],
    ['mine', 'academic', 'mine'],
    ['group', null, 'shared'],
    ['library', 'academic', 'academic'],
    ['library', 'general', 'general'],
    ['library', 'work', 'work'],
    ['library', 'travel', 'travel'],
    ['library', null, null],
  ] as const)('maps kind %s with shelf %s to filter group %s', (kind, shelf, expected) => {
    expect(topicFilterGroup(kind, shelf)).toBe(expected);
  });

  it('adds filter_group from the library shelf and does not return library_shelf itself', async () => {
    queryAsMock.mockResolvedValueOnce([
      { id: 'lib', kind: 'library', collection_title: 'IELTS Academic', library_shelf: 'academic' },
      { id: 'life', kind: 'library', collection_title: 'Everyday life', library_shelf: null },
      { id: 'own', kind: 'mine', collection_title: null, library_shelf: null },
      { id: 'grp', kind: 'group', collection_title: null, library_shelf: null },
    ]);

    const result = await service.findAllVisible('user-42');

    expect(result.map((row) => [row.id, row.filter_group])).toEqual([
      ['lib', 'academic'],
      ['life', null],
      ['own', 'mine'],
      ['grp', 'shared'],
    ]);
    expect(result[0]).not.toHaveProperty('library_shelf');
    expect(result[0]).toMatchObject({ kind: 'library', collection_title: 'IELTS Academic' });
    const [, sql] = queryAsMock.mock.calls[0] as [string, string];
    expect(sql).toMatch(/then g\.library_shelf\s+end as library_shelf/);
  });

  it('passes mastered_count through unchanged, alongside word_count', async () => {
    const result = await service.findAllVisible('user-42');

    expect(result).toEqual([expect.objectContaining({ word_count: '3', mastered_count: '2' })]);
  });

  /**
   * Phase 9, "Topics as Collections" subtext (2026-09-21) — same
   * reasoning/limitation as the mastered_count pair above: the DB layer
   * is mocked, so this protects against the join/field or the `is_leech`
   * filter silently getting dropped, not the real counting logic.
   */
  it('filters focus_word_count on the same is_leech flag findLeeches already reads', async () => {
    await service.findAllVisible('user-42');

    const [, sql] = queryAsMock.mock.calls[0];
    expect(sql).toMatch(/focus_word_count/i);
    expect(sql).toMatch(/filter\s*\(\s*where uws\.is_leech\s*\)/i);
  });

  it('passes focus_word_count through unchanged, alongside word_count and mastered_count', async () => {
    const result = await service.findAllVisible('user-42');

    expect(result).toEqual([
      expect.objectContaining({ word_count: '3', mastered_count: '2', focus_word_count: '1' }),
    ]);
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

  it("without a group, puts the bed in the caller's personal group", async () => {
    const queryAsMock = jest
      .fn()
      .mockResolvedValueOnce([{ id: 'personal-1' }])
      .mockResolvedValueOnce([
        {
          id: 'topic-1',
          group_id: 'personal-1',
          title: 'Kitchen',
          description: null,
          is_public: false,
          created_at: new Date(),
        },
      ]);
    const service = await makeService(queryAsMock);

    await service.create('user-1', { title: 'Kitchen' });

    expect(queryAsMock.mock.calls[0][1]).toMatch(/public\.my_personal_group_id\(\)/);
    expect(queryAsMock.mock.calls[1][2]).toEqual(['personal-1', 'Kitchen', null, false]);
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

  it("joins the caller's own user_word_srs row onto each word, by the caller's id (U5-1)", async () => {
    const queryAsMock = jest
      .fn()
      .mockResolvedValueOnce([{ id: 'topic-1', group_id: 'g', title: 'T', description: null, is_public: false, created_at: new Date() }])
      .mockResolvedValueOnce([]);
    const service = await makeService(queryAsMock);

    await service.findById('user-1', 'topic-1');

    const [callerId, sql, params] = queryAsMock.mock.calls[1];
    expect(callerId).toBe('user-1');
    expect(sql).toMatch(/left join public\.user_word_srs uws\s+on uws\.topic_word_id = tw\.id and uws\.user_id = \$2/);
    expect(sql).toMatch(/uws\.fsrs_state::text as fsrs_state/);
    expect(sql).toMatch(/uws\.mastered_at/);
    expect(sql).toMatch(/uws\.is_leech/);
    expect(sql).toMatch(/uws\.next_due_at/);
    expect(params).toEqual(['topic-1', 'user-1']);
    // Still a left join: never-studied words must stay in the list.
    expect(sql).not.toMatch(/\binner join public\.user_word_srs/);
    expect(sql).not.toMatch(/where[^]*uws\./);
  });

  it('passes per-word SRS state through, null for a never-studied word', async () => {
    const due = new Date('2026-09-27T08:00:00Z');
    const queryAsMock = jest
      .fn()
      .mockResolvedValueOnce([{ id: 'topic-1', group_id: 'g', title: 'T', description: null, is_public: false, created_at: new Date() }])
      .mockResolvedValueOnce([
        { id: 'w1', source_word: 'resilient', language_code: 'en', status: 'READY', custom_note: null, failure_reason: null, created_at: new Date(),
          fsrs_state: 'Review', mastered_at: null, is_leech: true, next_due_at: due },
        { id: 'w2', source_word: 'novel', language_code: 'en', status: 'READY', custom_note: null, failure_reason: null, created_at: new Date(),
          fsrs_state: null, mastered_at: null, is_leech: null, next_due_at: null },
      ]);
    const service = await makeService(queryAsMock);

    const { words } = await service.findById('user-1', 'topic-1');

    expect(words[0]).toMatchObject({ fsrs_state: 'Review', is_leech: true, next_due_at: due, mastered_at: null });
    expect(words[1]).toMatchObject({ fsrs_state: null, is_leech: null, next_due_at: null, mastered_at: null });
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

/**
 * A6b word search (2026-10-17). Ranking and which beds count live in the
 * SQL, so these pin the parts of it that carry them; the query was also
 * run against the schema with seed fixtures (prefix before contains,
 * meaning match, another learner's private bed and an unstarted library
 * topic never returned).
 */
describe('TopicsService.searchWords', () => {
  async function run(query: string) {
    const queryAsMock = jest
      .fn()
      .mockResolvedValue([
        { word: 'environmental', topic_id: 'topic-1', topic_title: 'Environment', matched: 'word' },
      ]);
    const service = await makeService(queryAsMock);
    const result = await service.searchWords('user-42', query);
    const [userId, sql, params] = queryAsMock.mock.calls[0] as [string, string, unknown[]];
    return { result, userId, sql, params };
  }

  it('runs as the caller with the folded query', async () => {
    const { result, userId, params } = await run('  Môi ');
    expect(userId).toBe('user-42');
    expect(params).toEqual(['user-42', 'moi']);
    expect(result).toEqual([
      { word: 'environmental', topic_id: 'topic-1', topic_title: 'Environment', matched: 'word' },
    ]);
  });

  it('ranks word prefix before word contains before meaning, shorter word first, 3 results', async () => {
    const { sql } = await run('envi');
    const prefix = sql.indexOf("like $2 || '%' then 0");
    const contains = sql.indexOf("like '%' || $2 || '%' then 1");
    const meaning = sql.indexOf("like '%' || $2 || '%' then 2");
    expect(prefix).toBeGreaterThan(-1);
    expect(contains).toBeGreaterThan(prefix);
    expect(meaning).toBeGreaterThan(contains);
    expect(sql).toMatch(/order by rank, length\(word\)/);
    expect(sql).toMatch(/limit 3/);
  });

  it("matches the meaning in the learner's meaning language, else the English definition", async () => {
    const { sql } = await run('moi');
    expect(sql).toMatch(/coalesce\(wt\.meaning, ml\.definition_en\)/);
    expect(sql).toMatch(
      /wt\.locale = \(select p\.meaning_locale from public\.profiles p where p\.id = \$1\)/,
    );
    expect(sql).toMatch(/case when rank < 2 then 'word' else 'meaning' end as matched/);
  });

  it('searches own and shared beds and started library topics only, never the whole library', async () => {
    const { sql } = await run('envi');
    const beds = sql.slice(sql.indexOf('with beds as'), sql.indexOf('hits as'));
    expect(beds).toMatch(/g\.owner_id = \$1/);
    expect(beds).toMatch(
      /group_members me\s+where me\.group_id = t\.group_id and me\.user_id = \$1/,
    );
    expect(beds).toMatch(/user_word_srs su .*\s+where stw\.topic_id = t\.id and su\.user_id = \$1/);
    // A public topic qualifies only through one of the conditions above.
    expect(beds).not.toMatch(/or t\.is_public/);
  });
});

describe('foldForSearch', () => {
  it('strips Vietnamese marks and lower-cases', () => {
    expect(foldForSearch('Môi Trường')).toBe('moi truong');
    expect(foldForSearch('Đất')).toBe('dat');
  });

  it('escapes LIKE wildcards so they match literally', () => {
    expect(foldForSearch('50%_x')).toBe('50\\%\\_x');
  });
});
