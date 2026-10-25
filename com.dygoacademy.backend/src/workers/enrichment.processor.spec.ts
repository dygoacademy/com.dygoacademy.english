import { Test } from '@nestjs/testing';
import { Job, UnrecoverableError } from 'bullmq';

import { GeminiEnrichmentService, LexiconEntry } from '../ai/gemini-enrichment.service';
import { GoogleWordTtsService } from '../ai/google-word-tts.service';
import { PronDataService, type PronData } from '../ai/pron-data.service';
import { UsageCapExceededError } from '../ai/usage-cap.service';
import { DatabaseService } from '../database/database.service';
import {
  AudioBackfillJob,
  TranslationsBackfillJob,
  WordEnrichmentJob,
} from '../queues/queue.constants';
import { encodeForWeb } from '../storage/audio-encode';
import { StorageService } from '../storage/storage.service';
import { EnrichmentProcessor } from './enrichment.processor';

// Unit tests don't shell out to ffmpeg: the encoder returns a fake .m4a.
jest.mock('../storage/audio-encode', () => ({
  ...jest.requireActual<typeof import('../storage/audio-encode')>('../storage/audio-encode'),
  encodeForWeb: jest.fn(),
}));
const encodeForWebMock = encodeForWeb as jest.MockedFunction<typeof encodeForWeb>;

/**
 * Covers the three outcomes that matter for the enrichment worker (tech spec
 * §4.2): a master_lexicon cache hit skips Gemini entirely (the >85% KPI),
 * a cache miss calls Gemini + TTS + storage and upserts the row, and a
 * terminal failure (last BullMQ attempt) records FAILED with a reason
 * instead of silently dropping the word.
 */
const PRON_DATA: PronData = {
  syllables_us: [{ text: 'e', stressed: false, start_ms: 0, end_ms: 100 }],
  syllables_uk: null,
  pron_tip: { 'en-US': 'tip', 'vi-VN': 'tip', 'zh-CN': 'tip' },
  audio_slow_url_us: null,
  audio_slow_url_uk: null,
};

describe('EnrichmentProcessor', () => {
  let processor: EnrichmentProcessor;
  let queryMock: jest.Mock;
  let enrichWordMock: jest.Mock;
  let translateMeaningMock: jest.Mock;
  let synthesizeSpeechMock: jest.Mock;
  let synthesizeWordMock: jest.Mock;
  let googleConfigured: boolean;
  let uploadMock: jest.Mock;
  let hasObjectMock: jest.Mock;
  let pronMakeMock: jest.Mock;

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
    translations: {
      'vi-VN': {
        meaning: 'chỉ tồn tại trong thời gian ngắn',
        example_translation: 'Danh vọng thường chỉ tồn tại trong thời gian ngắn.',
      },
      'zh-CN': { meaning: '短暂的', example_translation: '名声往往是短暂的。' },
    },
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
    translateMeaningMock = jest.fn().mockResolvedValue({
      'vi-VN': { meaning: 'lịch sự', example_translation: 'Cô ấy luôn lịch sự.' },
      'zh-CN': { meaning: '礼貌的', example_translation: '她总是很礼貌。' },
    });
    synthesizeSpeechMock = jest
      .fn()
      .mockResolvedValue({ pcm: Buffer.from('x'), sampleRateHz: 24000 });
    // Default: no Google key, so the older tests cover the Gemini TTS path.
    googleConfigured = false;
    synthesizeWordMock = jest.fn().mockResolvedValue(Buffer.from('RIFFwav'));
    uploadMock = jest
      .fn()
      .mockResolvedValue('http://localhost:9000/dygo-audio/audio/en/us/abc.wav');
    hasObjectMock = jest.fn().mockResolvedValue(false); // default: no audio in storage yet
    pronMakeMock = jest.fn().mockResolvedValue(PRON_DATA);
    encodeForWebMock.mockReset();
    encodeForWebMock.mockResolvedValue({
      primary: 'm4a',
      m4a: Buffer.from('m4a'),
      wav: Buffer.from('wav'),
    });

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
          useValue: {
            enrichWord: enrichWordMock,
            translateMeaning: translateMeaningMock,
            synthesizeSpeech: synthesizeSpeechMock,
          },
        },
        {
          provide: GoogleWordTtsService,
          useValue: {
            isConfigured: () => googleConfigured,
            synthesizeWord: synthesizeWordMock,
          },
        },
        { provide: PronDataService, useValue: { make: pronMakeMock } },
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
    queryMock.mockResolvedValueOnce([{ id: 'lex-1', audio_url_us: 'https://audio.example/x.wav' }]); // dedup lookup
    queryMock.mockResolvedValueOnce([]); // topic_words update

    await processor.process(makeJob());

    expect(enrichWordMock).not.toHaveBeenCalled();
    expect(synthesizeSpeechMock).not.toHaveBeenCalled();
    const updateCall = queryMock.mock.calls[1];
    expect(updateCall[0]).toMatch(/update public\.topic_words/i);
    expect(updateCall[1]).toEqual(['lex-1', 'tw-1']);
  });

  it('pronunciation v2: after READY, a word missing its stones gets them (and the row is written)', async () => {
    const row = {
      id: 'lex-1',
      normalized_word: 'ephemeral',
      language_code: 'en',
      ipa_us: null,
      ipa_uk: null,
      audio_url_us: null,
      audio_url_uk: null,
      has_data: false,
    };
    queryMock.mockResolvedValueOnce([{ id: 'lex-1', audio_url_us: 'https://audio.example/x.wav' }]);
    queryMock.mockResolvedValueOnce([]); // topic_words update (READY)
    queryMock.mockResolvedValueOnce([row]); // pron data read
    queryMock.mockResolvedValueOnce([]); // pron data write

    await processor.process(makeJob());

    const sql = queryMock.mock.calls.map((c) => String(c[0]));
    const ready = sql.findIndex((q) => /update public\.topic_words/i.test(q));
    const write = sql.findIndex((q) => /set syllables_us = \$2::jsonb/.test(q));
    expect(ready).toBeGreaterThanOrEqual(0);
    expect(write).toBeGreaterThan(ready); // the learner never waits for it
    expect(pronMakeMock).toHaveBeenCalledWith(row);
    expect(queryMock.mock.calls[write][1][1]).toBe(JSON.stringify(PRON_DATA.syllables_us));
  });

  it('pronunciation v2: a word that has its data is left alone; a failure never fails the word', async () => {
    queryMock.mockResolvedValueOnce([{ id: 'lex-1', audio_url_us: 'https://audio.example/x.wav' }]);
    queryMock.mockResolvedValueOnce([]);
    queryMock.mockResolvedValueOnce([{ id: 'lex-1', has_data: true }]);
    await processor.process(makeJob());
    expect(pronMakeMock).not.toHaveBeenCalled();

    queryMock.mockReset();
    queryMock.mockResolvedValueOnce([{ id: 'lex-1', audio_url_us: 'https://audio.example/x.wav' }]);
    queryMock.mockResolvedValueOnce([]);
    queryMock.mockResolvedValueOnce([
      { id: 'lex-1', normalized_word: 'ephemeral', has_data: false },
    ]);
    pronMakeMock.mockRejectedValueOnce(new Error('Daily google_tts limit reached'));
    await expect(processor.process(makeJob())).resolves.toBeUndefined();
  });

  it('cache miss: calls Gemini + TTS + storage, upserts master_lexicon, marks READY', async () => {
    queryMock.mockResolvedValueOnce([]); // dedup lookup — miss
    queryMock.mockResolvedValueOnce([{ id: 'lex-2' }]); // master_lexicon upsert
    queryMock.mockResolvedValueOnce([]); // word_translations upsert
    queryMock.mockResolvedValueOnce([]); // topic_words update

    await processor.process(makeJob());

    expect(enrichWordMock).toHaveBeenCalledWith('ephemeral', 'en', undefined);
    expect(synthesizeSpeechMock).toHaveBeenCalledWith('ephemeral');
    expect(uploadMock).toHaveBeenCalledWith(
      expect.stringMatching(/^audio\/en\/us\/.+\.m4a$/),
      expect.any(Buffer),
      'audio/mp4',
    );

    const upsertCall = queryMock.mock.calls[1];
    expect(upsertCall[0]).toMatch(/insert into public\.master_lexicon/i);
    expect(upsertCall[0]).toMatch(/on conflict/i);

    const translationsCall = queryMock.mock.calls[2];
    expect(translationsCall[0]).toMatch(/insert into public\.word_translations/i);
    expect(translationsCall[0]).toMatch(/on conflict/i);
    expect(translationsCall[1]).toEqual([
      'lex-2',
      'vi-VN',
      'chỉ tồn tại trong thời gian ngắn',
      'Danh vọng thường chỉ tồn tại trong thời gian ngắn.',
      'lex-2',
      'zh-CN',
      '短暂的',
      '名声往往是短暂的。',
    ]);

    const updateCall = queryMock.mock.calls[3];
    expect(updateCall[1]).toEqual(['lex-2', 'tw-1']);
  });

  it('cache miss with TTS failure: still upserts master_lexicon with a null audio_url_us', async () => {
    queryMock.mockResolvedValueOnce([]); // dedup lookup — miss
    synthesizeSpeechMock.mockRejectedValue(new Error('TTS quota exceeded'));
    queryMock.mockResolvedValueOnce([{ id: 'lex-3' }]); // master_lexicon upsert
    queryMock.mockResolvedValueOnce([]); // word_translations upsert
    queryMock.mockResolvedValueOnce([]); // topic_words update

    await processor.process(makeJob());

    expect(uploadMock).not.toHaveBeenCalled();
    const upsertParams = queryMock.mock.calls[1][1];
    expect(upsertParams[7]).toBeNull(); // audio_url_us param
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

  it('over the daily Gemini cap (S13): FAILED on the first attempt, not retried', async () => {
    queryMock.mockResolvedValueOnce([]); // dedup lookup: cache miss
    enrichWordMock.mockRejectedValueOnce(new UsageCapExceededError('gemini', 1000));
    queryMock.mockResolvedValueOnce([]); // FAILED update

    const run = processor.process(makeJob({}, 0));
    await expect(run).rejects.toBeInstanceOf(UnrecoverableError);
    await expect(run).rejects.toThrow('Daily gemini limit reached (1000)');

    const failedCall = queryMock.mock.calls[1];
    expect(failedCall[0]).toMatch(/status = 'FAILED'/);
    expect(failedCall[1][0]).toMatch(/Daily gemini limit reached/);
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
    queryMock.mockResolvedValueOnce([{ id: 'lex-1', audio_url_us: null }]); // dedup lookup
    queryMock.mockResolvedValueOnce([{ id: 'lex-1', audio_url_us: null }]); // ensureAudio re-check
    queryMock.mockResolvedValueOnce([]); // audio_url_us update
    queryMock.mockResolvedValueOnce([]); // topic_words update

    await processor.process(makeJob());

    expect(enrichWordMock).not.toHaveBeenCalled();
    expect(synthesizeSpeechMock).toHaveBeenCalledWith('ephemeral');
    expect(queryMock.mock.calls[2][0]).toMatch(/update public\.master_lexicon\s+set audio_url_us/i);
    expect(queryMock.mock.calls[2][1]).toEqual([
      'lex-1',
      'http://localhost:9000/dygo-audio/audio/en/us/abc.wav',
    ]);
    expect(queryMock.mock.calls[3][1]).toEqual(['lex-1', 'tw-1']);
  });

  it('cache hit: a TTS failure while filling audio does not stop the word becoming READY', async () => {
    queryMock.mockResolvedValueOnce([{ id: 'lex-1', audio_url_us: null }]);
    queryMock.mockResolvedValueOnce([{ id: 'lex-1', audio_url_us: null }]);
    synthesizeSpeechMock.mockRejectedValue(new Error('TTS quota exceeded'));
    queryMock.mockResolvedValueOnce([]); // topic_words update

    await processor.process(makeJob());

    const ready = queryMock.mock.calls.find((c) =>
      /update public\.topic_words/i.test(String(c[0])),
    );
    expect(ready?.[1]).toEqual(['lex-1', 'tw-1']);
  });

  it('audio-backfill job: reuses audio already in storage (from before a reset) without calling TTS', async () => {
    hasObjectMock.mockResolvedValue(true);
    queryMock.mockResolvedValueOnce([{ id: 'lex-9', audio_url_us: null }]); // re-check
    queryMock.mockResolvedValueOnce([]); // update

    await processor.process(backfillJob());

    expect(synthesizeSpeechMock).not.toHaveBeenCalled();
    expect(uploadMock).not.toHaveBeenCalled();
    const [, params] = queryMock.mock.calls[1];
    expect(params[0]).toBe('lex-9');
    expect(params[1]).toMatch(/^https:\/\/audio\.example\/audio\/en\/us\/[0-9a-f]{32}\.m4a$/);
  });

  it('audio-backfill job: reuses an older .wav when there is no .m4a', async () => {
    hasObjectMock.mockImplementation((key: string) => Promise.resolve(key.endsWith('.wav')));
    queryMock.mockResolvedValueOnce([{ id: 'lex-9', audio_url_us: null }]);
    queryMock.mockResolvedValueOnce([]);

    await processor.process(backfillJob());

    expect(synthesizeSpeechMock).not.toHaveBeenCalled();
    expect(queryMock.mock.calls[1][1][1]).toMatch(/\.wav$/);
  });

  it('audio-backfill job: stores WAV when the AAC encoder is unavailable', async () => {
    encodeForWebMock.mockResolvedValue({
      primary: 'wav',
      m4a: null,
      wav: Buffer.from('wav'),
      fallback: 'ffmpeg not found',
    });
    queryMock.mockResolvedValueOnce([{ id: 'lex-9', audio_url_us: null }]);
    queryMock.mockResolvedValueOnce([]);

    await processor.process(backfillJob());

    expect(uploadMock).toHaveBeenCalledWith(
      expect.stringMatching(/^audio\/en\/us\/[0-9a-f]{32}\.wav$/),
      expect.any(Buffer),
      'audio/wav',
    );
  });

  it('audio-backfill job: stores both .m4a and the .wav copy, and links the .m4a', async () => {
    uploadMock.mockImplementation((key: string) => Promise.resolve(`https://audio.example/${key}`));
    queryMock.mockResolvedValueOnce([{ id: 'lex-9', audio_url_us: null }]);
    queryMock.mockResolvedValueOnce([]);

    await processor.process(backfillJob());

    expect(uploadMock).toHaveBeenCalledTimes(2);
    expect(uploadMock.mock.calls[0][0]).toMatch(/^audio\/en\/us\/[0-9a-f]{32}\.m4a$/);
    expect(uploadMock.mock.calls[0][2]).toBe('audio/mp4');
    const m4aKey = uploadMock.mock.calls[0][0] as string;
    expect(uploadMock.mock.calls[1][0]).toBe(m4aKey.replace(/\.m4a$/, '.wav'));
    expect(uploadMock.mock.calls[1][2]).toBe('audio/wav');
    expect(queryMock.mock.calls[1][1][1]).toMatch(/\.m4a$/);
  });

  it('audio-backfill job: generates AAC audio with TTS when storage has none', async () => {
    queryMock.mockResolvedValueOnce([{ id: 'lex-9', audio_url_us: null }]);
    queryMock.mockResolvedValueOnce([]);

    await processor.process(backfillJob());

    expect(synthesizeSpeechMock).toHaveBeenCalledWith('polite');
    expect(uploadMock).toHaveBeenCalledWith(
      expect.stringMatching(/^audio\/en\/us\/[0-9a-f]{32}\.m4a$/),
      expect.any(Buffer),
      'audio/mp4',
    );
  });

  it('audio-backfill job: an old placeholder cdn.dygo.academy link counts as missing', async () => {
    queryMock.mockResolvedValueOnce([
      { id: 'lex-9', audio_url_us: 'https://cdn.dygo.academy/audio/en/us/polite.mp3' },
    ]);
    queryMock.mockResolvedValueOnce([]);

    await processor.process(backfillJob());

    expect(synthesizeSpeechMock).toHaveBeenCalled();
    expect(queryMock).toHaveBeenCalledTimes(2);
  });

  it('audio-backfill job: a word that already has real audio is a no-op', async () => {
    queryMock.mockResolvedValueOnce([
      { id: 'lex-9', audio_url_us: 'https://audio.example/real.wav' },
    ]);

    await processor.process(backfillJob());

    expect(hasObjectMock).not.toHaveBeenCalled();
    expect(synthesizeSpeechMock).not.toHaveBeenCalled();
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it('audio-backfill job: a TTS failure rethrows so BullMQ retries it', async () => {
    queryMock.mockResolvedValueOnce([{ id: 'lex-9', audio_url_us: null }]);
    synthesizeSpeechMock.mockRejectedValue(new Error('TTS quota exceeded'));

    await expect(processor.process(backfillJob())).rejects.toThrow('TTS quota exceeded');
  });

  // ---------------------------------------------------------------------------
  // Word audio from Google TTS said from the IPA (2026-10-18: Gemini TTS said
  // "counterfeit" ending in "sit").
  // ---------------------------------------------------------------------------

  it('cache miss with Google TTS: says the word from its IPA, keyed apart from the Gemini clip', async () => {
    googleConfigured = true;
    queryMock.mockResolvedValueOnce([]); // dedup lookup — miss
    queryMock.mockResolvedValueOnce([{ id: 'lex-2' }]); // master_lexicon upsert
    queryMock.mockResolvedValueOnce([]); // word_translations upsert
    queryMock.mockResolvedValueOnce([]); // topic_words update

    await processor.process(makeJob());

    expect(synthesizeWordMock).toHaveBeenCalledWith('ephemeral', '/ɪˈfem.ər.əl/', 'US');
    expect(synthesizeSpeechMock).not.toHaveBeenCalled();
    const key = uploadMock.mock.calls[0][0] as string;
    expect(key).toMatch(/^audio\/en\/us\/[0-9a-f]{32}\.m4a$/);
    expect(key).not.toBe(StorageService.audioKeyFor('ephemeral', 'en'));
  });

  it('cache miss with Google TTS: also makes the UK clip from ipa_uk, stored under uk/', async () => {
    googleConfigured = true;
    enrichWordMock.mockResolvedValue({ ...entry, ipa_us: '/ˈwɔː.t̬ɚ/', ipa_uk: '/ˈwɔː.tə/' });
    uploadMock.mockImplementation((key: string) => Promise.resolve(`https://audio.example/${key}`));
    queryMock.mockResolvedValueOnce([]); // dedup lookup — miss
    queryMock.mockResolvedValueOnce([{ id: 'lex-2' }]); // master_lexicon upsert
    queryMock.mockResolvedValueOnce([]); // word_translations upsert
    queryMock.mockResolvedValueOnce([]); // topic_words update

    await processor.process(makeJob({ word: 'water' }));

    expect(synthesizeWordMock).toHaveBeenCalledWith('water', '/ˈwɔː.t̬ɚ/', 'US');
    expect(synthesizeWordMock).toHaveBeenCalledWith('water', '/ˈwɔː.tə/', 'UK');
    const [sql, params] = queryMock.mock.calls[1];
    expect(sql).toMatch(/audio_url_uk/);
    expect(params[7]).toMatch(/^https:\/\/audio\.example\/audio\/en\/us\/[0-9a-f]{32}\.m4a$/);
    expect(params[11]).toMatch(/^https:\/\/audio\.example\/audio\/en\/uk\/[0-9a-f]{32}\.m4a$/);
  });

  it('cache miss with Google TTS: a UK failure keeps the US clip and leaves audio_url_uk null', async () => {
    googleConfigured = true;
    synthesizeWordMock.mockImplementation((_w: string, _ipa: string, accent: string) =>
      accent === 'UK'
        ? Promise.reject(new Error('Google TTS 500'))
        : Promise.resolve(Buffer.from('w')),
    );
    queryMock.mockResolvedValueOnce([]);
    queryMock.mockResolvedValueOnce([{ id: 'lex-2' }]);
    queryMock.mockResolvedValueOnce([]);
    queryMock.mockResolvedValueOnce([]);

    await processor.process(makeJob());

    const params = queryMock.mock.calls[1][1];
    expect(params[7]).not.toBeNull();
    expect(params[11]).toBeNull();
    expect(synthesizeSpeechMock).not.toHaveBeenCalled(); // no Gemini (American) stand-in for UK
  });

  it('cache hit missing only the UK clip fills in audio_url_uk alone', async () => {
    googleConfigured = true;
    const us = 'https://audio.example/audio/en/us/x.m4a';
    queryMock.mockResolvedValueOnce([{ id: 'lex-1', audio_url_us: us, audio_url_uk: null }]);
    queryMock.mockResolvedValueOnce([
      { id: 'lex-1', audio_url_us: us, audio_url_uk: null, ipa_us: '/ɪˈfem.ɚ.əl/', ipa_uk: null },
    ]);
    queryMock.mockResolvedValueOnce([]); // audio_url_uk update
    queryMock.mockResolvedValueOnce([]); // topic_words update

    await processor.process(makeJob());

    expect(synthesizeWordMock).toHaveBeenCalledTimes(1);
    // No ipa_uk: falls back to the US IPA (ipaForPhoneme maps ɚ for the UK voice).
    expect(synthesizeWordMock).toHaveBeenCalledWith('ephemeral', '/ɪˈfem.ɚ.əl/', 'UK');
    expect(queryMock.mock.calls[2][0]).toMatch(/set audio_url_uk = \$2/);
    expect(queryMock.mock.calls[2][0]).toMatch(/audio_url_uk is null/);
    expect(queryMock.mock.calls[3][0]).toMatch(/update public\.topic_words/i);
  });

  it('without a Google key the UK clip is not attempted', async () => {
    const us = 'https://audio.example/audio/en/us/x.m4a';
    queryMock.mockResolvedValueOnce([{ id: 'lex-9', audio_url_us: us, audio_url_uk: null }]);

    await processor.process(backfillJob());

    expect(synthesizeSpeechMock).not.toHaveBeenCalled();
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it('Google TTS failure falls back to Gemini TTS for the US clip', async () => {
    googleConfigured = true;
    synthesizeWordMock.mockImplementation((_w: string, _ipa: string, accent: string) =>
      accent === 'US'
        ? Promise.reject(new Error('Google TTS 500'))
        : Promise.resolve(Buffer.from('w')),
    );
    queryMock.mockResolvedValueOnce([
      {
        id: 'lex-9',
        audio_url_us: null,
        audio_url_uk: 'https://audio.example/uk.m4a',
        ipa_us: '/ˈpə.laɪt/',
      },
    ]);
    queryMock.mockResolvedValueOnce([]);

    await processor.process(backfillJob());

    expect(synthesizeSpeechMock).toHaveBeenCalledWith('polite');
    expect(uploadMock.mock.calls[0][0]).toBe(StorageService.audioKeyFor('polite', 'en'));
  });

  it('a UK Google TTS failure rethrows (no Gemini stand-in) after the US clip is written', async () => {
    googleConfigured = true;
    synthesizeWordMock.mockImplementation((_w: string, _ipa: string, accent: string) =>
      accent === 'UK'
        ? Promise.reject(new Error('Google TTS 500'))
        : Promise.resolve(Buffer.from('w')),
    );
    queryMock.mockResolvedValueOnce([{ id: 'lex-9', audio_url_us: null, audio_url_uk: null }]);
    queryMock.mockResolvedValueOnce([]); // audio_url_us update

    await expect(processor.process(backfillJob())).rejects.toThrow('Google TTS 500');
    expect(synthesizeSpeechMock).not.toHaveBeenCalled();
    expect(queryMock.mock.calls[1][0]).toMatch(/set audio_url_us = \$2/);
  });

  it('over the Google TTS cap: rethrows instead of spending Gemini calls', async () => {
    googleConfigured = true;
    synthesizeWordMock.mockRejectedValue(new UsageCapExceededError('google_tts', 10));
    queryMock.mockResolvedValueOnce([{ id: 'lex-9', audio_url_us: null, ipa_us: '/ˈpə.laɪt/' }]);

    await expect(processor.process(backfillJob())).rejects.toThrow(UsageCapExceededError);
    expect(synthesizeSpeechMock).not.toHaveBeenCalled();
  });

  it('remake: replaces a word that already has audio with a clip made from its IPA', async () => {
    googleConfigured = true;
    uploadMock.mockImplementation((key: string) => Promise.resolve(`https://audio.example/${key}`));
    queryMock.mockResolvedValueOnce([
      {
        id: 'lex-9',
        audio_url_us: 'https://audio.example/audio/en/us/old.m4a',
        ipa_us: '/ˈkaʊn.tɚ.fɪt/',
      },
    ]);
    queryMock.mockResolvedValueOnce([]);

    queryMock.mockResolvedValueOnce([]);

    await processor.process(backfillJob({ word: 'counterfeit', remake: true }));

    expect(synthesizeWordMock).toHaveBeenCalledWith('counterfeit', '/ˈkaʊn.tɚ.fɪt/', 'US');
    // No ipa_uk on the row: the UK clip is made from the US IPA.
    expect(synthesizeWordMock).toHaveBeenCalledWith('counterfeit', '/ˈkaʊn.tɚ.fɪt/', 'UK');
    const [sql, params] = queryMock.mock.calls[1];
    expect(sql).not.toMatch(/audio_url_us is null/);
    expect(params[1]).toMatch(/^https:\/\/audio\.example\/audio\/en\/us\/[0-9a-f]{32}\.m4a$/);
    expect(params[1]).not.toBe('https://audio.example/audio/en/us/old.m4a');
    const [ukSql, ukParams] = queryMock.mock.calls[2];
    expect(ukSql).toMatch(/set audio_url_uk = \$2/);
    expect(ukParams[1]).toMatch(/^https:\/\/audio\.example\/audio\/en\/uk\/[0-9a-f]{32}\.m4a$/);
  });

  it('remake that comes out as the same clip leaves the row alone', async () => {
    hasObjectMock.mockResolvedValue(true); // the Gemini clip is in storage
    const same = `https://audio.example/${StorageService.audioKeyFor('polite', 'en')}`;
    queryMock.mockResolvedValueOnce([{ id: 'lex-9', audio_url_us: same, ipa_us: null }]);

    await processor.process(backfillJob({ remake: true }));

    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // translations-backfill (2026-09-29): repairs word_translations rows left
  // incomplete by the pre-fix array-based Gemini schema (vi-VN written,
  // zh-CN silently dropped) — queued by scripts/translations-backfill.js.
  // ---------------------------------------------------------------------------

  function translationsBackfillJob(
    overrides: Partial<TranslationsBackfillJob> = {},
  ): Job<TranslationsBackfillJob> {
    return {
      name: 'translations-backfill',
      data: {
        lexiconId: 'lex-9',
        missingLocales: ['zh-CN'],
        definitionEn: 'Having or showing good manners.',
        exampleSentence: 'She is always polite.',
        ...overrides,
      },
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as unknown as Job<TranslationsBackfillJob>;
  }

  it('translations-backfill job: writes only the missing locale, not the one already present', async () => {
    queryMock.mockResolvedValueOnce([]); // word_translations upsert

    await processor.process(translationsBackfillJob());

    expect(translateMeaningMock).toHaveBeenCalledWith(
      'Having or showing good manners.',
      'She is always polite.',
    );
    expect(queryMock).toHaveBeenCalledTimes(1);
    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toMatch(/insert into public\.word_translations/i);
    expect(params).toEqual(['lex-9', 'zh-CN', '礼貌的', '她总是很礼貌。']);
  });

  it('translations-backfill job: writes both locales when both are missing', async () => {
    queryMock.mockResolvedValueOnce([]); // word_translations upsert

    await processor.process(translationsBackfillJob({ missingLocales: ['vi-VN', 'zh-CN'] }));

    const [, params] = queryMock.mock.calls[0];
    expect(params).toEqual([
      'lex-9',
      'vi-VN',
      'lịch sự',
      'Cô ấy luôn lịch sự.',
      'lex-9',
      'zh-CN',
      '礼貌的',
      '她总是很礼貌。',
    ]);
  });

  it('translations-backfill job: no missing locales is a no-op (no Gemini call, no query)', async () => {
    await processor.process(translationsBackfillJob({ missingLocales: [] }));

    expect(translateMeaningMock).not.toHaveBeenCalled();
    expect(queryMock).not.toHaveBeenCalled();
  });
});
