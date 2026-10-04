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
    // All the learner's words (no topic), 5 per session, due then new first.
    expect(calls[0].params).toEqual([null]);
    expect(calls[1].params).toEqual([null, 5]);
    expect(calls[1].text).toMatch(/order by w\.due_now desc, w\.is_new desc/);
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

describe('SpeakingService.createAttempt', () => {
  const dto = {
    item_id: 'item-1',
    accent: 'US' as const,
    score: 82,
    stage: 'bloom' as const,
    word_marks: [{ index: 5, ok: false, reason: 'stress_soft' as const }],
    user_duration_ms: 3100,
  };

  it('inserts as the learner (user_id comes from auth.uid(), not the body)', async () => {
    const queryAs = jest.fn().mockResolvedValue([{ id: 'att-1', ...dto, created_at: 'now' }]);
    const service = await makeService({ queryAs });

    const result = await service.createAttempt('user-1', dto);

    expect(result.id).toBe('att-1');
    const [userId, sql, params] = queryAs.mock.calls[0];
    expect(userId).toBe('user-1');
    expect(sql).not.toMatch(/user_id/);
    expect(params).toEqual([
      'item-1',
      'US',
      82,
      'bloom',
      JSON.stringify([{ index: 5, ok: false, reason: 'stress_soft' }]),
      3100,
    ]);
  });

  it('404s for an unknown item', async () => {
    const queryAs = jest.fn().mockRejectedValue(Object.assign(new Error('fk'), { code: '23503' }));
    const service = await makeService({ queryAs });
    await expect(service.createAttempt('user-1', dto)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rethrows other database errors', async () => {
    const queryAs = jest
      .fn()
      .mockRejectedValue(Object.assign(new Error('boom'), { code: '23514' }));
    const service = await makeService({ queryAs });
    await expect(service.createAttempt('user-1', dto)).rejects.toThrow('boom');
  });
});
