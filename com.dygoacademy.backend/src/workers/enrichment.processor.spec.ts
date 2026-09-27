import { Test } from '@nestjs/testing';
import { Job } from 'bullmq';

import { GeminiEnrichmentService, LexiconEntry } from '../ai/gemini-enrichment.service';
import { DatabaseService } from '../database/database.service';
import { AudioBackfillJob, WordEnrichmentJob } from '../queues/queue.constants';
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
  let hasObjectMock: jest.Mock;

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
      name: 'enrich-word',
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
    hasObjectMock = jest.fn().mockResolvedValue(false); // default: no audio in R2 yet

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
        {
          provide: StorageService,
          useValue: {
            upload: uploadMock,
            hasObject: hasObjectMock,
            publicUrlFor: (key: string) => `https://audio.example/${key}`,
          },
        },
      ],
    }).compile();

    processor = moduleRef.get(EnrichmentProcessor);
  });

  it('cache hit: resolves lexicon_id from master_lexicon and never calls Gemini', async () => {
    queryMock.mockResolvedValueOnce([{ id: 'lex-1', audio_url: 'https://audio.example/x.wav' }]); // dedup lookup
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

  // ---------------------------------------------------------------------------
  // Missing-audio handling (2026-09-25): seed words used to ship fake
  // cdn.dygo.academy links, and a cache hit used to skip audio entirely.
  // ---------------------------------------------------------------------------

  function backfillJob(overrides: Partial<AudioBackfillJob> = {}): Job<AudioBackfillJob> {
    return {
      name: 'audio-backfill',
      data: { lexiconId: 'lex-9', word: 'polite', languageCode: 'en', ...overrides },
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as unknown as Job<AudioBackfillJob>;
  }

  it('cache hit on a word with NO audio fills it in (still no text AI call), then marks READY', async () => {
    queryMock.mockResolvedValueOnce([{ id: 'lex-1', audio_url: null }]); // dedup lookup
    queryMock.mockResolvedValueOnce([{ id: 'lex-1', audio_url: null }]); // ensureAudio re-check
    queryMock.mockResolvedValueOnce([]); // audio_url update
    queryMock.mockResolvedValueOnce([]); // topic_words update

    await processor.process(makeJob());

    expect(enrichWordMock).not.toHaveBeenCalled();
    expect(synthesizeSpeechMock).toHaveBeenCalledWith('ephemeral');
    expect(queryMock.mock.calls[2][0]).toMatch(/update public\.master_lexicon\s+set audio_url/i);
    expect(queryMock.mock.calls[2][1]).toEqual([
      'lex-1',
      'http://localhost:9000/dygo-audio/audio/en/us/abc.wav',
    ]);
    expect(queryMock.mock.calls[3][1]).toEqual(['lex-1', 'tw-1']);
  });

  it('cache hit: a TTS failure while filling audio does not stop the word becoming READY', async () => {
    queryMock.mockResolvedValueOnce([{ id: 'lex-1', audio_url: null }]);
    queryMock.mockResolvedValueOnce([{ id: 'lex-1', audio_url: null }]);
    synthesizeSpeechMock.mockRejectedValue(new Error('TTS quota exceeded'));
    queryMock.mockResolvedValueOnce([]); // topic_words update

    await processor.process(makeJob());

    const last = queryMock.mock.calls[queryMock.mock.calls.length - 1];
    expect(last[0]).toMatch(/update public\.topic_words/i);
    expect(last[1]).toEqual(['lex-1', 'tw-1']);
  });

  it('audio-backfill job: reuses audio already in R2 (from before a reset) without calling TTS', async () => {
    hasObjectMock.mockResolvedValue(true);
    queryMock.mockResolvedValueOnce([{ id: 'lex-9', audio_url: null }]); // re-check
    queryMock.mockResolvedValueOnce([]); // update

    await processor.process(backfillJob());

    expect(synthesizeSpeechMock).not.toHaveBeenCalled();
    expect(uploadMock).not.toHaveBeenCalled();
    const [, params] = queryMock.mock.calls[1];
    expect(params[0]).toBe('lex-9');
    expect(params[1]).toMatch(/^https:\/\/audio\.example\/audio\/en\/us\/[0-9a-f]{32}\.wav$/);
  });

  it('audio-backfill job: generates audio with TTS when R2 has none', async () => {
    queryMock.mockResolvedValueOnce([{ id: 'lex-9', audio_url: null }]);
    queryMock.mockResolvedValueOnce([]);

    await processor.process(backfillJob());

    expect(synthesizeSpeechMock).toHaveBeenCalledWith('polite');
    expect(uploadMock).toHaveBeenCalledWith(
      expect.stringMatching(/^audio\/en\/us\/[0-9a-f]{32}\.wav$/),
      expect.any(Buffer),
      'audio/wav',
    );
  });

  it('audio-backfill job: an old placeholder cdn.dygo.academy link counts as missing', async () => {
    queryMock.mockResolvedValueOnce([
      { id: 'lex-9', audio_url: 'https://cdn.dygo.academy/audio/en/us/polite.mp3' },
    ]);
    queryMock.mockResolvedValueOnce([]);

    await processor.process(backfillJob());

    expect(synthesizeSpeechMock).toHaveBeenCalled();
    expect(queryMock).toHaveBeenCalledTimes(2);
  });

  it('audio-backfill job: a word that already has real audio is a no-op', async () => {
    queryMock.mockResolvedValueOnce([{ id: 'lex-9', audio_url: 'https://audio.example/real.wav' }]);

    await processor.process(backfillJob());

    expect(hasObjectMock).not.toHaveBeenCalled();
    expect(synthesizeSpeechMock).not.toHaveBeenCalled();
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it('audio-backfill job: a TTS failure rethrows so BullMQ retries it', async () => {
    queryMock.mockResolvedValueOnce([{ id: 'lex-9', audio_url: null }]);
    synthesizeSpeechMock.mockRejectedValue(new Error('TTS quota exceeded'));

    await expect(processor.process(backfillJob())).rejects.toThrow('TTS quota exceeded');
  });
});
