import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { DatabaseService } from '../../database/database.service';
import { StorageService } from '../../storage/storage.service';
import { SpeakingService } from './speaking.service';

const TOPIC_ID = 'c0c0c0c0-0000-0000-0000-000000000005';
const TOPIC_WORD_ID = 'e0e0e0e0-0000-0000-0000-000000000100';
const TIMINGS = { duration: 3.3, words: [] };

function itemRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item-1',
    lexicon_id: 'lex-1',
    topic_word_id: 'tw-1',
    word: 'mitigate',
    part_of_speech: 'verb',
    cefr_level: 'C1',
    ipa_uk: '/ˈmɪt.ɪ.ɡeɪt/',
    ipa_us: '/ˈmɪt.ɪ.ɡeɪt/',
    definition_en: 'Make less severe.',
    meaning_locale: 'vi-VN',
    meaning_translation: 'giảm nhẹ',
    sentence: 'Planting more trees can help mitigate the effects of climate change.',
    target_index: 5,
    audio_uk_path: 'speaking/en/uk/abc.wav',
    audio_us_path: null,
    timings_uk: TIMINGS,
    timings_us: null,
    is_due: true,
    ...overrides,
  };
}

async function makeService(db: Partial<Record<'withUser' | 'queryAs', jest.Mock>>) {
  const moduleRef = await Test.createTestingModule({
    providers: [
      SpeakingService,
      { provide: DatabaseService, useValue: db },
      {
        provide: StorageService,
        useValue: { publicUrlFor: (key: string) => `https://cdn.test/${key}` },
      },
    ],
  }).compile();
  return moduleRef.get(SpeakingService);
}

/** withUser mock whose client returns `results` in order, recording each query. */
function withUserReturning(...results: unknown[][]) {
  const calls: { text: string; params: unknown[] }[] = [];
  const client = {
    query: jest.fn((text: string, params: unknown[]) => {
      calls.push({ text, params });
      return Promise.resolve({ rows: results[calls.length - 1] ?? [] });
    }),
  };
  const withUser = jest.fn((_userId: string, work: (c: typeof client) => unknown) =>
    Promise.resolve(work(client)),
  );
  return { withUser, calls };
}

describe('SpeakingService.session (The Pond)', () => {
  it('returns the count, default accent and items with public URLs, not R2 keys', async () => {
    const { withUser, calls } = withUserReturning(
      [{ item_count: '7' }],
      [itemRow()],
      [{ english_variety: 'en-GB' }],
    );
    const service = await makeService({ withUser });

    const session = await service.session('user-1');

    expect(withUser).toHaveBeenCalledWith('user-1', expect.any(Function));
    expect(session).toMatchObject({ item_count: 7, default_accent: 'UK' });
    expect(session.items).toHaveLength(1);
    expect(session.items[0]).toMatchObject({
      topic_word_id: 'tw-1',
      audio_uk_url: 'https://cdn.test/speaking/en/uk/abc.wav',
      audio_us_url: null,
      timings_uk: TIMINGS,
      target_index: 5,
    });
    expect(session.items[0]).not.toHaveProperty('audio_uk_path');
    // The learner's own words (no topic), 5 per session: due, then the
    // most recently planted, then new ones.
    expect(calls[0].params).toEqual([null]);
    expect(calls[1].params).toEqual([null, 5]);
    expect(calls[1].text).toMatch(/order by w\.due_now desc, w\.planted_at desc nulls last/);
    // Without a topic: planted words, or the first bed's (all words if none).
    expect(calls[1].text).toMatch(
      /\$1::uuid is not null or coalesce\(s\.fsrs_state <> 'New', false\)\s+or \(select p\.first_topic_id from public\.profiles p where p\.id = auth\.uid\(\)\) is null or tw\.topic_id = \(select p\.first_topic_id/,
    );
    expect(calls[0].text).toMatch(/\$1::uuid is not null or coalesce/);
    // One row per word, joined by lexicon_id (items belong to the word).
    expect(calls[1].text).toMatch(/distinct on \(tw\.lexicon_id\)/);
    expect(calls[1].text).toMatch(/si\.lexicon_id = w\.lexicon_id/);
  });

  it('narrows to one bed when topic_id is given; US unless the learner chose en-GB', async () => {
    const { withUser, calls } = withUserReturning(
      [{ item_count: '0' }],
      [],
      [{ english_variety: 'en-US' }],
    );
    const service = await makeService({ withUser });
    const session = await service.session('user-1', TOPIC_ID);
    expect(calls[1].params).toEqual([TOPIC_ID, 5]);
    expect(session).toEqual({ item_count: 0, default_accent: 'US', items: [] });
  });

  it('404s on a malformed topic id without querying', async () => {
    const withUser = jest.fn();
    const service = await makeService({ withUser });
    await expect(service.session('user-1', 'not-a-uuid')).rejects.toBeInstanceOf(NotFoundException);
    expect(withUser).not.toHaveBeenCalled();
  });
});

describe('SpeakingService.forWord ("Say this one?")', () => {
  it("returns the card word's item", async () => {
    const { withUser, calls } = withUserReturning([itemRow()], [{ english_variety: null }]);
    const service = await makeService({ withUser });
    const result = await service.forWord('user-1', TOPIC_WORD_ID);
    expect(calls[0].params).toEqual([TOPIC_WORD_ID]);
    expect(result.default_accent).toBe('US');
    expect(result.item).toMatchObject({ id: 'item-1', word: 'mitigate' });
  });

  it('404s when the word is unreadable or has no item', async () => {
    const { withUser } = withUserReturning([]);
    const service = await makeService({ withUser });
    await expect(service.forWord('user-1', TOPIC_WORD_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('404s on a malformed id without querying', async () => {
    const withUser = jest.fn();
    const service = await makeService({ withUser });
    await expect(service.forWord('user-1', 'x')).rejects.toBeInstanceOf(NotFoundException);
    expect(withUser).not.toHaveBeenCalled();
  });
});

describe('SpeakingService.lookupWords ("Say this one?" offers)', () => {
  const A = 'e0e0e0e0-0000-0000-0000-000000000101';
  const B = 'e0e0e0e0-0000-0000-0000-000000000102';

  it("returns item ids and spoken_today for the learner's local day", async () => {
    const { withUser, calls } = withUserReturning(
      [{ timezone: 'Asia/Ho_Chi_Minh' }],
      [{ topic_word_id: A, item_id: 'item-1', spoken_today: true }],
    );
    const service = await makeService({ withUser });

    const rows = await service.lookupWords('user-1', [A, B, A, 'bad'], 'Europe/London');

    expect(rows).toEqual([{ topic_word_id: A, item_id: 'item-1', spoken_today: true }]);
    expect(withUser).toHaveBeenCalledWith('user-1', expect.any(Function));
    // ids de-duplicated, malformed dropped; the profile timezone wins over tz.
    expect(calls[1].params).toEqual([[A, B], 'Asia/Ho_Chi_Minh']);
    expect(calls[1].text).toMatch(/a\.user_id = auth\.uid\(\)/);
    expect(calls[1].text).toMatch(/date_trunc\('day', now\(\) at time zone \$2\) at time zone \$2/);
    expect(calls[1].text).toMatch(/si\.lexicon_id = tw\.lexicon_id/);
  });

  it('uses tz when the profile has no timezone', async () => {
    const { withUser, calls } = withUserReturning([{ timezone: 'UTC' }], []);
    const service = await makeService({ withUser });
    await service.lookupWords('user-1', [A], 'Asia/Singapore');
    expect(calls[1].params).toEqual([[A], 'Asia/Singapore']);
  });

  it('asks nothing for no valid ids', async () => {
    const withUser = jest.fn();
    const service = await makeService({ withUser });
    expect(await service.lookupWords('user-1', ['x', ''])).toEqual([]);
    expect(withUser).not.toHaveBeenCalled();
  });
});

describe('SpeakingService.createAttempt', () => {
  const dto = {
    item_id: 'item-1',
    accent: 'US' as const,
    score: 82,
    stage: 'bloom' as const,
    word_marks: [{ index: 5, ok: false, reason: 'stress_soft' as const }],
    user_duration_ms: 3100,
  };

  /** Answers by SQL: timezone, spoken-today check, insert, missions, harvest. */
  function fakeClient(
    opts: { spoken?: boolean; harvestRows?: unknown[]; insertError?: Error } = {},
  ) {
    const answer = (sql: string): { rows: unknown[] } => {
      if (sql.includes('select timezone from public.profiles'))
        return { rows: [{ timezone: 'UTC' }] };
      if (sql.includes('as spoken')) return { rows: [{ spoken: opts.spoken ?? false }] };
      if (sql.includes('insert into public.speaking_attempts')) {
        if (opts.insertError) throw opts.insertError;
        return { rows: [{ id: 'att-1', ...dto, created_at: 'now' }] };
      }
      if (sql.includes('select count(*) as n from public.daily_missions'))
        return { rows: [{ n: '3' }] };
      if (sql.includes('insert into public.speaking_harvests'))
        return { rows: opts.harvestRows ?? [] };
      return { rows: [] };
    };
    const query = jest.fn((sql: string, params?: unknown[]) => {
      void params;
      try {
        return Promise.resolve(answer(sql));
      } catch (err) {
        return Promise.reject(err as Error);
      }
    });
    const withUser = jest.fn((_u: string, work: (c: { query: typeof query }) => unknown) =>
      work({ query }),
    );
    return { query, withUser };
  }

  it('inserts as the learner (user_id comes from auth.uid(), not the body)', async () => {
    const { query, withUser } = fakeClient();
    const service = await makeService({ withUser });

    const result = await service.createAttempt('user-1', dto);

    expect(result).toMatchObject({ id: 'att-1' });
    expect(withUser.mock.calls[0][0]).toBe('user-1');
    const insert = query.mock.calls.find(([sql]) =>
      sql.includes('insert into public.speaking_attempts'),
    )!;
    expect(insert[0]).not.toMatch(/user_id/);
    expect(insert[1]).toEqual([
      'item-1',
      'US',
      82,
      'bloom',
      JSON.stringify([{ index: 5, ok: false, reason: 'stress_soft' }]),
      3100,
    ]);
  });

  it("bumps the SPEAK mission on the day's first attempt at a sentence, not on a repeat", async () => {
    const first = fakeClient({ spoken: false });
    await (await makeService({ withUser: first.withUser })).createAttempt('user-1', dto);
    const bump = first.query.mock.calls.find(([sql]) =>
      sql.includes('update public.daily_missions'),
    );
    expect(bump?.[1]).toEqual(['user-1', expect.any(String), 'SPEAK']);

    const again = fakeClient({ spoken: true });
    await (await makeService({ withUser: again.withUser })).createAttempt('user-1', dto);
    expect(again.query.mock.calls.some(([sql]) => sql.includes('daily_missions'))).toBe(false);
  });

  it('never pollinates, even when an older app asks (Stepping stones Part 3)', async () => {
    const client = fakeClient({ harvestRows: [{ id: 'h1' }] });
    await (
      await makeService({ withUser: client.withUser })
    ).createAttempt('user-1', {
      ...dto,
      score: 95,
      stage: 'fruit' as const,
      harvest: true,
    });
    expect(
      client.query.mock.calls.some(([sql]) => sql.includes('insert into public.speaking_harvests')),
    ).toBe(false);
  });

  it('404s for an unknown item', async () => {
    const { withUser } = fakeClient({
      insertError: Object.assign(new Error('fk'), { code: '23503' }),
    });
    const service = await makeService({ withUser });
    await expect(service.createAttempt('user-1', dto)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rethrows other database errors', async () => {
    const { withUser } = fakeClient({
      insertError: Object.assign(new Error('boom'), { code: '23514' }),
    });
    const service = await makeService({ withUser });
    await expect(service.createAttempt('user-1', dto)).rejects.toThrow('boom');
  });
});

describe('SpeakingService.harvest (SE5)', () => {
  it("reads the bed's speakable words with the learner's harvests", async () => {
    const queryAs = jest.fn().mockResolvedValue([
      {
        topic_word_id: 'tw-1',
        item_id: 'item-1',
        harvested_score: 94,
        harvested_at: 'now',
        ipa_uk: '/ˈmɪt.ɪ.ɡeɪt/',
        ipa_us: null,
        word: 'mitigate',
      },
    ]);
    const service = await makeService({ queryAs });

    const rows = await service.harvest('user-1', TOPIC_ID);

    expect(rows).toEqual([
      {
        topic_word_id: 'tw-1',
        item_id: 'item-1',
        harvested_score: 94,
        harvested_at: 'now',
        ipa_uk: '/ˈmɪt.ɪ.ɡeɪt/',
        syllables: [
          { text: 'mi', stressed: true },
          { text: 'ti', stressed: false },
          { text: 'gate', stressed: false },
        ],
      },
    ]);
    expect(queryAs.mock.calls[0][1]).toContain('speaking_harvests');
    expect(queryAs.mock.calls[0][1]).toContain('ml.ipa_uk');
    expect(queryAs.mock.calls[0][2]).toEqual([TOPIC_ID]);
  });

  it('404s for a malformed topic id', async () => {
    const service = await makeService({ queryAs: jest.fn() });
    await expect(service.harvest('user-1', 'nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});
