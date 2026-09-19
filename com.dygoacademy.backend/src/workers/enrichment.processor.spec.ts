import { Test } from '@nestjs/testing';
import { Job } from 'bullmq';

import { GeminiEnrichmentService, LexiconEntry } from '../ai/gemini-enrichment.service';
import { DatabaseService } from '../database/database.service';
import { WordEnrichmentJob } from '../queues/queue.constants';
import { StorageService } from '../storage/storage.service';
import { EnrichmentProcessor } from './enrichment.processor';

/**
 * Covers the three outcomes that matter for the enrichment worker (tech spec
 * §4.2): a master_lexicon cache hit skips Gemini entirely (the >85% KPI),
 * a cache miss calls Gemini + TTS + storage and upserts the row, and a
 * terminal failure (last BullMQ attempt) records FAILED with a reason
 * instead of silently dropping the word.
 */
describe('EnrichmentProcessor', () => {
  let processor: EnrichmentProcessor;
  let queryMock: jest.Mock;
  let enrichWordMock: jest.Mock;
  let synthesizeSpeechMock: jest.Mock;
  let uploadMock: jest.Mock;

  const entry: LexiconEntry = {
    part_of_speech: 'adjective',
    ipa_us: '/ɪˈfem.ər.əl/',
    ipa_uk: '/ɪˈfem.ər.əl/',
    cefr_level: 'C1',
    definition_en: 'Lasting for a very short time.',
    synonyms: [{ word: 'transient', level: 'C1' }],
    antonyms: [{ word: 'permanent', level: 'B1' }],
    example_sentences: [
      { sentence: 'Fame is often ephemeral.', level: 'B2', translation_hint: 'short-lived' },
    ],
  };

  function makeJob(
    overrides: Partial<WordEnrichmentJob> = {},
    attemptsMade = 0,
  ): Job<WordEnrichmentJob> {
    return {
      data: {
        topicWordId: 'tw-1',
        word: 'ephemeral',
        languageCode: 'en',
        triggeredByUserId: 'user-1',
        ...overrides,
      },
      attemptsMade,
      opts: { attempts: 3 },
    } as unknown as Job<WordEnrichmentJob>;
  }

  beforeEach(async () => {
    queryMock = jest.fn();
    enrichWordMock = jest.fn().mockResolvedValue(entry);
    synthesizeSpeechMock = jest
      .fn()
      .mockResolvedValue({ pcm: Buffer.from('x'), sampleRateHz: 24000 });
    uploadMock = jest
      .fn()
      .mockResolvedValue('http://localhost:9000/dygo-audio/audio/en/us/abc.wav');

    const moduleRef = await Test.createTestingModule({
      providers: [
        EnrichmentProcessor,
        // queryAsService, not query() — EnrichmentProcessor's three db calls
        // (dedup lookup, master_lexicon upsert, FAILED-status write) all run
        // as service_role (see database.service.ts / migration 014's own
        // comment: authenticator, query()'s role, has zero grants on
        // master_lexicon/topic_words by design). Spec was stale relative to
        // that fix until now — caught 2026-09-16 running the full suite
        // while unrelated env-profile work was in progress.
        { provide: DatabaseService, useValue: { queryAsService: queryMock } },
        {
          provide: GeminiEnrichmentService,
          useValue: { enrichWord: enrichWordMock, synthesizeSpeech: synthesizeSpeechMock },
        },
        { provide: StorageService, useValue: { upload: uploadMock } },
      ],
    }).compile();

    processor = moduleRef.get(EnrichmentProcessor);
  });

  it('cache hit: resolves lexicon_id from master_lexicon and never calls Gemini', async () => {
    queryMock.mockResolvedValueOnce([{ id: 'lex-1' }]); // dedup lookup
    queryMock.mockResolvedValueOnce([]); // topic_words update

    await processor.process(makeJob());

    expect(enrichWordMock).not.toHaveBeenCalled();
    expect(synthesizeSpeechMock).not.toHaveBeenCalled();
    const updateCall = queryMock.mock.calls[1];
    expect(updateCall[0]).toMatch(/update public\.topic_words/i);
    expect(updateCall[1]).toEqual(['lex-1', 'tw-1']);
  });

  it('cache miss: calls Gemini + TTS + storage, upserts master_lexicon, marks READY', async () => {
    queryMock.mockResolvedValueOnce([]); // dedup lookup — miss
    queryMock.mockResolvedValueOnce([{ id: 'lex-2' }]); // master_lexicon upsert
    queryMock.mockResolvedValueOnce([]); // topic_words update

    await processor.process(makeJob());

    expect(enrichWordMock).toHaveBeenCalledWith('ephemeral', 'en', undefined);
    expect(synthesizeSpeechMock).toHaveBeenCalledWith('ephemeral');
    expect(uploadMock).toHaveBeenCalledWith(
      expect.stringMatching(/^audio\/en\/us\/.+\.wav$/),
      expect.any(Buffer),
      'audio/wav',
    );

    const upsertCall = queryMock.mock.calls[1];
    expect(upsertCall[0]).toMatch(/insert into public\.master_lexicon/i);
    expect(upsertCall[0]).toMatch(/on conflict/i);

    const updateCall = queryMock.mock.calls[2];
    expect(updateCall[1]).toEqual(['lex-2', 'tw-1']);
  });

  it('cache miss with TTS failure: still upserts master_lexicon with a null audio_url', async () => {
    queryMock.mockResolvedValueOnce([]); // dedup lookup — miss
    synthesizeSpeechMock.mockRejectedValue(new Error('TTS quota exceeded'));
    queryMock.mockResolvedValueOnce([{ id: 'lex-3' }]); // master_lexicon upsert
    queryMock.mockResolvedValueOnce([]); // topic_words update

    await processor.process(makeJob());

    expect(uploadMock).not.toHaveBeenCalled();
    const upsertParams = queryMock.mock.calls[1][1];
    expect(upsertParams[7]).toBeNull(); // audio_url param
  });

  it('non-final attempt failure: rethrows without marking FAILED', async () => {
    queryMock.mockRejectedValueOnce(new Error('connection reset'));

    await expect(processor.process(makeJob({}, 0))).rejects.toThrow('connection reset');

    expect(queryMock).toHaveBeenCalledTimes(1); // only the dedup lookup — no FAILED write
  });

  it('final attempt failure: rethrows and records FAILED with the reason', async () => {
    queryMock.mockRejectedValueOnce(new Error('gemini 500'));
    queryMock.mockResolvedValueOnce([]); // FAILED update

    await expect(processor.process(makeJob({}, 2))).rejects.toThrow('gemini 500');

    const failedCall = queryMock.mock.calls[1];
    expect(failedCall[0]).toMatch(/status = 'FAILED'/);
    expect(failedCall[1]).toEqual(['gemini 500', 'tw-1']);
  });
});
