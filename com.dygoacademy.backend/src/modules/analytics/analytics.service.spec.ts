import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { DatabaseService } from '../../database/database.service';
import { AnalyticsService } from './analytics.service';

async function makeService(queryAsMock: jest.Mock): Promise<AnalyticsService> {
  const moduleRef = await Test.createTestingModule({
    providers: [AnalyticsService, { provide: DatabaseService, useValue: { queryAs: queryAsMock } }],
  }).compile();
  return moduleRef.get(AnalyticsService);
}

describe('AnalyticsService.groupHeatmap', () => {
  it('throws ForbiddenException when the caller is not a group ADMIN, without querying the heatmap function', async () => {
    const queryAsMock = jest.fn().mockResolvedValueOnce([{ allowed: false }]);
    const service = await makeService(queryAsMock);

    await expect(service.groupHeatmap('user-1', 'group-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(queryAsMock).toHaveBeenCalledTimes(1); // stopped after the has_group_role check
  });

  it('checks has_group_role the same shape NotificationsService.triggerSprint uses', async () => {
    const queryAsMock = jest.fn().mockResolvedValueOnce([{ allowed: false }]);
    const service = await makeService(queryAsMock);

    await expect(service.groupHeatmap('user-1', 'group-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    const [userId, sql, params] = queryAsMock.mock.calls[0];
    expect(userId).toBe('user-1');
    expect(sql).toMatch(/has_group_role\(\$1, 'ADMIN'\)/);
    expect(params).toEqual(['group-1']);
  });

  it('queries public.group_word_heatmap and normalizes bigint-as-string columns to numbers', async () => {
    const queryAsMock = jest
      .fn()
      .mockResolvedValueOnce([{ allowed: true }])
      .mockResolvedValueOnce([
        {
          topic_word_id: 'tw-1',
          source_word: 'resilient',
          topic_id: 'topic-1',
          topic_title: 'Unit 1',
          attempts: '10', // pg returns bigint as a string
          failures: '4',
        },
      ]);
    const service = await makeService(queryAsMock);

    const result = await service.groupHeatmap('admin-1', 'group-1');

    expect(result).toEqual([
      expect.objectContaining({
        topic_word_id: 'tw-1',
        attempts: 10,
        failures: 4,
        failure_rate: 0.4,
      }),
    ]);
    const [, sql, params] = queryAsMock.mock.calls[1];
    expect(sql).toMatch(/public\.group_word_heatmap\(\$1\)/);
    expect(params).toEqual(['group-1']);
  });

  it('passes a caller-supplied limit through to the ranking step', async () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({
      topic_word_id: `tw-${i}`,
      source_word: `word${i}`,
      topic_id: 'topic-1',
      topic_title: 'Unit 1',
      attempts: '10',
      failures: '5',
    }));
    const queryAsMock = jest
      .fn()
      .mockResolvedValueOnce([{ allowed: true }])
      .mockResolvedValueOnce(rows);
    const service = await makeService(queryAsMock);

    const result = await service.groupHeatmap('admin-1', 'group-1', 2);

    expect(result).toHaveLength(2);
  });

  it('returns an empty array when the group has no review activity yet', async () => {
    const queryAsMock = jest
      .fn()
      .mockResolvedValueOnce([{ allowed: true }])
      .mockResolvedValueOnce([]);
    const service = await makeService(queryAsMock);

    const result = await service.groupHeatmap('admin-1', 'group-1');

    expect(result).toEqual([]);
  });
});
