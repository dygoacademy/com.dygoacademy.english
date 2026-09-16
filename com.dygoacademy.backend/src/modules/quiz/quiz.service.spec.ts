import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { GeminiEnrichmentService } from '../../ai/gemini-enrichment.service';
import { DatabaseService } from '../../database/database.service';
import { SrsService } from '../srs/srs.service';
import { QuizService } from './quiz.service';

function wordRow(overrides: Record<string, unknown> = {}) {
  return {
    topic_word_id: 'tw-1',
    topic_id: 'topic-1',
    source_word: 'resilient',
    audio_url: 'https://cdn.example/resilient.wav',
    ipa_us: '/rɪˈzɪljənt/',
    definition_en: 'able to recover quickly from difficulties.',
    synonyms: [{ word: 'tough', level: 'B1' }],
    antonyms: [{ word: 'fragile', level: 'B1' }],
    example_sentences: [
      { sentence: 'She remained resilient after the setback.', level: 'B1', translation_hint: '' },
    ],
    ...overrides,
  };
}

async function makeService(opts: {
  queryAsMock: jest.Mock;
  findLeechesMock?: jest.Mock;
  explainNuanceMock?: jest.Mock;
}): Promise<QuizService> {
  const moduleRef = await Test.createTestingModule({
    providers: [
      QuizService,
      { provide: DatabaseService, useValue: { queryAs: opts.queryAsMock } },
      { provide: SrsService, useValue: { findLeeches: opts.findLeechesMock ?? jest.fn() } },
      {
        provide: GeminiEnrichmentService,
        useValue: { explainNuance: opts.explainNuanceMock ?? jest.fn() },
      },
    ],
  }).compile();
  return moduleRef.get(QuizService);
}

describe('QuizService.generate', () => {
  it('returns [] with no candidate words, without querying for a distractor pool', async () => {
    const queryAsMock = jest.fn().mockResolvedValueOnce([]);
    const service = await makeService({ queryAsMock });

    const result = await service.generate('user-1', {});

    expect(result).toEqual([]);
    expect(queryAsMock).toHaveBeenCalledTimes(1);
  });

  it('builds up to `limit` items across the requested types, skipping ungradeable combinations', async () => {
    const queryAsMock = jest
      .fn()
      .mockResolvedValueOnce([wordRow()]) // candidate words
      .mockResolvedValueOnce([]); // pool.size (1) <= MIN_DISTRACTORS triggers the master_lexicon fallback query
    const service = await makeService({ queryAsMock });

    const result = await service.generate('user-1', { types: ['DICTATION', 'CLOZE'], limit: 10 });

    // Only DICTATION and CLOZE requested, neither needs distractors, so both should build successfully.
    expect(result.map((r) => r.type).sort()).toEqual(['CLOZE', 'DICTATION']);
  });

  it('scopes the candidate query to a topic when topicId is given', async () => {
    const queryAsMock = jest.fn().mockResolvedValueOnce([]);
    const service = await makeService({ queryAsMock });

    await service.generate('user-1', { topicId: 'topic-9' });

    const [, sql, params] = queryAsMock.mock.calls[0];
    expect(sql).toMatch(/tw\.topic_id = \$1/);
    expect(params).toEqual(['topic-9', 40]); // limit defaults to 10, candidateLimit = 10*4
  });

  it('stops requesting new items once `limit` is reached', async () => {
    const queryAsMock = jest
      .fn()
      .mockResolvedValueOnce([
        wordRow({ topic_word_id: 'tw-1' }),
        wordRow({ topic_word_id: 'tw-2' }),
      ])
      .mockResolvedValueOnce([]);
    const service = await makeService({ queryAsMock });

    const result = await service.generate('user-1', { types: ['DICTATION'], limit: 1 });

    expect(result).toHaveLength(1);
  });
});

describe('QuizService.answer', () => {
  it('throws NotFoundException for a malformed item id', async () => {
    const service = await makeService({ queryAsMock: jest.fn() });
    await expect(service.answer('user-1', 'not-an-id', { answer: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws NotFoundException when the word no longer exists or is not READY', async () => {
    const queryAsMock = jest.fn().mockResolvedValueOnce([]);
    const service = await makeService({ queryAsMock });
    await expect(service.answer('user-1', 'missing:CLOZE', { answer: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('grades a correct answer without calling Gemini', async () => {
    const queryAsMock = jest.fn().mockResolvedValueOnce([wordRow()]);
    const explainNuanceMock = jest.fn();
    const service = await makeService({ queryAsMock, explainNuanceMock });

    const result = await service.answer('user-1', 'tw-1:DICTATION', { answer: 'Resilient' });

    expect(result).toEqual({
      quizItemId: 'tw-1:DICTATION',
      correct: true,
      correctAnswer: 'resilient',
      hintUsed: false,
    });
    expect(explainNuanceMock).not.toHaveBeenCalled();
  });

  it('calls Gemini for a nuance explanation on a wrong answer', async () => {
    const queryAsMock = jest.fn().mockResolvedValueOnce([wordRow()]);
    const explainNuanceMock = jest
      .fn()
      .mockResolvedValueOnce('Close, but "brave" implies less endurance.');
    const service = await makeService({ queryAsMock, explainNuanceMock });

    const result = await service.answer('user-1', 'tw-1:MATCHING', { answer: 'brave' });

    expect(result.correct).toBe(false);
    expect(result.correctAnswer).toBe('tough');
    expect(result.nuanceExplanation).toBe('Close, but "brave" implies less endurance.');
    expect(explainNuanceMock).toHaveBeenCalledWith(
      'resilient',
      'tough',
      'brave',
      expect.any(String),
    );
  });

  it('degrades to a generic message if the Gemini call itself throws, rather than failing the request', async () => {
    const queryAsMock = jest.fn().mockResolvedValueOnce([wordRow()]);
    const explainNuanceMock = jest
      .fn()
      .mockRejectedValueOnce(new Error('GEMINI_API_KEY is not configured.'));
    const service = await makeService({ queryAsMock, explainNuanceMock });

    const result = await service.answer('user-1', 'tw-1:MATCHING', { answer: 'brave' });

    expect(result.correct).toBe(false);
    expect(result.nuanceExplanation).toContain('tough');
  });

  it('throws NotFoundException when the item type is no longer answerable (e.g. no synonyms/antonyms left)', async () => {
    const queryAsMock = jest.fn().mockResolvedValueOnce([wordRow({ synonyms: [], antonyms: [] })]);
    const service = await makeService({ queryAsMock });

    await expect(
      service.answer('user-1', 'tw-1:MATCHING', { answer: 'anything' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('echoes hintUsed back from the submitted answer', async () => {
    const queryAsMock = jest.fn().mockResolvedValueOnce([wordRow()]);
    const service = await makeService({ queryAsMock });

    const result = await service.answer('user-1', 'tw-1:DICTATION', {
      answer: 'resilient',
      hintUsed: true,
    });

    expect(result.hintUsed).toBe(true);
  });
});

describe('QuizService.hint', () => {
  it('throws NotFoundException for a malformed item id', async () => {
    const service = await makeService({ queryAsMock: jest.fn() });
    await expect(service.hint('user-1', 'not-an-id')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when the word no longer exists or is not READY', async () => {
    const queryAsMock = jest.fn().mockResolvedValueOnce([]);
    const service = await makeService({ queryAsMock });
    await expect(service.hint('user-1', 'missing:CLOZE')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns the IPA and definition for a valid item', async () => {
    const queryAsMock = jest.fn().mockResolvedValueOnce([wordRow()]);
    const service = await makeService({ queryAsMock });

    const result = await service.hint('user-1', 'tw-1:CLOZE');

    expect(result).toEqual({
      ipaUs: '/rɪˈzɪljənt/',
      definition: 'able to recover quickly from difficulties.',
    });
  });
});

describe('QuizService.leechDrill', () => {
  it('returns [] with no leeches, without querying word data', async () => {
    const queryAsMock = jest.fn();
    const findLeechesMock = jest.fn().mockResolvedValueOnce([]);
    const service = await makeService({ queryAsMock, findLeechesMock });

    const result = await service.leechDrill('user-1');

    expect(result).toEqual([]);
    expect(queryAsMock).not.toHaveBeenCalled();
  });

  it('prefers CONTEXTUAL_CHOICE, falling back through the preference order per word', async () => {
    const findLeechesMock = jest
      .fn()
      .mockResolvedValueOnce([
        { topic_word_id: 'tw-1', topic_id: 'topic-1', source_word: 'resilient' },
      ]);
    // Word has example sentences (CONTEXTUAL_CHOICE-capable) but no synonyms/antonyms.
    const queryAsMock = jest
      .fn()
      .mockResolvedValueOnce([wordRow()]) // the leech word itself
      .mockResolvedValueOnce([
        { source_word: 'brave' },
        { source_word: 'happy' },
        { source_word: 'sad' },
      ]); // distractor pool fallback (pool.size 1 <= MIN_DISTRACTORS)
    const service = await makeService({ queryAsMock, findLeechesMock });

    const result = await service.leechDrill('user-1');

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('CONTEXTUAL_CHOICE');
  });
});
