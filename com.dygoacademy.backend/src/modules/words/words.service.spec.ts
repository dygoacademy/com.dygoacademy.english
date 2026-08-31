import { ConflictException, ForbiddenException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';

import { DatabaseService } from '../../database/database.service';
import { ENRICHMENT_QUEUE } from '../../queues/queue.constants';
import { CreateWordDto } from './dto/create-word.dto';
import { WordsService } from './words.service';

/**
 * Covers the three outcomes that matter for POST /words (tech spec §3.4):
 * the happy path enqueues enrichment after the row commits, a duplicate
 * word in the same topic is a 409 (not a 500), and an RLS rejection (the
 * caller lacks WRITE on the topic) is a 403 — see topic_words_insert_write
 * in 002_rls_policies.sql, which this service intentionally does not
 * re-implement in application code.
 */
describe('WordsService', () => {
  let service: WordsService;
  let queryAsMock: jest.Mock;
  let queueAddMock: jest.Mock;

  const dto: CreateWordDto = { topicId: 'topic-1', word: '  resilient  ' };

  beforeEach(async () => {
    queryAsMock = jest.fn();
    queueAddMock = jest.fn().mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      providers: [
        WordsService,
        { provide: DatabaseService, useValue: { queryAs: queryAsMock } },
        { provide: getQueueToken(ENRICHMENT_QUEUE), useValue: { add: queueAddMock } },
      ],
    }).compile();

    service = moduleRef.get(WordsService);
  });

  it('inserts the trimmed word, then enqueues enrichment with the new row id', async () => {
    const created = {
      id: 'word-1',
      topic_id: 'topic-1',
      source_word: 'resilient',
      language_code: 'en',
      status: 'ENRICHING' as const,
      created_at: new Date('2026-09-01T00:00:00Z'),
    };
    queryAsMock.mockResolvedValue([created]);

    const result = await service.ingest('user-1', dto);

    expect(result).toEqual(created);
    // Scoped through queryAs (RLS-enforced), not a raw db.query.
    const [userId, sql, params] = queryAsMock.mock.calls[0];
    expect(userId).toBe('user-1');
    expect(sql).toMatch(/insert into public\.topic_words/i);
    expect(params).toEqual(['topic-1', 'resilient', 'en', 'user-1']);

    expect(queueAddMock).toHaveBeenCalledTimes(1);
    const [jobName, payload] = queueAddMock.mock.calls[0];
    expect(jobName).toBe('enrich-word');
    expect(payload).toMatchObject({
      topicWordId: 'word-1',
      word: 'resilient',
      languageCode: 'en',
      triggeredByUserId: 'user-1',
    });
  });

  it('maps a unique-constraint violation to ConflictException and never enqueues', async () => {
    queryAsMock.mockRejectedValue({ code: '23505', message: 'duplicate key' });

    await expect(service.ingest('user-1', dto)).rejects.toBeInstanceOf(ConflictException);
    expect(queueAddMock).not.toHaveBeenCalled();
  });

  it('maps an RLS policy violation to ForbiddenException and never enqueues', async () => {
    queryAsMock.mockRejectedValue({ code: '42501', message: 'row-level security violation' });

    await expect(service.ingest('user-1', dto)).rejects.toBeInstanceOf(ForbiddenException);
    expect(queueAddMock).not.toHaveBeenCalled();
  });
});
