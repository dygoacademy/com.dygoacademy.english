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

describe('AnalyticsService.tenantHeatmap', () => {
  it('throws ForbiddenException when the caller is not a tenant admin, without querying the heatmap function', async () => {
    const queryAsMock = jest
      .fn()
      .mockResolvedValueOnce([{ tenant_id: 'tenant-1', allowed: false }]);
    const service = await makeService(queryAsMock);

    await expect(service.tenantHeatmap('user-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(queryAsMock).toHaveBeenCalledTimes(1); // stopped after the is_tenant_admin check
  });

  it('throws ForbiddenException without querying the heatmap function when the caller has no tenant at all', async () => {
    // Defensive-only path: 006_solo_tenant_provisioning.sql means every real
    // signup has a tenant_id, but current_user_tenant_id() returning null
    // must never be treated as "allowed".
    const queryAsMock = jest.fn().mockResolvedValueOnce([{ tenant_id: null, allowed: false }]);
    const service = await makeService(queryAsMock);

    await expect(service.tenantHeatmap('user-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(queryAsMock).toHaveBeenCalledTimes(1);
  });

  it('resolves the tenant and admin check in one round trip, using CURRENT_USER_TENANT_ID for both', async () => {
    const queryAsMock = jest
      .fn()
      .mockResolvedValueOnce([{ tenant_id: 'tenant-1', allowed: false }]);
    const service = await makeService(queryAsMock);

    await expect(service.tenantHeatmap('user-1')).rejects.toBeInstanceOf(ForbiddenException);

    const [userId, sql, params] = queryAsMock.mock.calls[0];
    expect(userId).toBe('user-1');
    expect(sql).toMatch(/current_user_tenant_id\(\)/);
    expect(sql).toMatch(/is_tenant_admin\(public\.current_user_tenant_id\(\)\)/);
    expect(params).toEqual([]);
  });

  it('queries public.tenant_word_heatmap with the resolved tenant id, normalizes bigint-as-string columns, and attributes each row to its group', async () => {
    const queryAsMock = jest
      .fn()
      .mockResolvedValueOnce([{ tenant_id: 'tenant-1', allowed: true }])
      .mockResolvedValueOnce([
        {
          group_id: 'group-1',
          group_name: 'IELTS Band 8.0 Masterclass',
          topic_word_id: 'tw-1',
          source_word: 'resilient',
          topic_id: 'topic-1',
          topic_title: 'Unit 1',
          attempts: '10', // pg returns bigint as a string
          failures: '4',
        },
      ]);
    const service = await makeService(queryAsMock);

    const result = await service.tenantHeatmap('admin-1');

    expect(result).toEqual([
      expect.objectContaining({
        group_id: 'group-1',
        group_name: 'IELTS Band 8.0 Masterclass',
        topic_word_id: 'tw-1',
        attempts: 10,
        failures: 4,
        failure_rate: 0.4,
      }),
    ]);
    const [userId, sql, params] = queryAsMock.mock.calls[1];
    expect(userId).toBe('admin-1');
    expect(sql).toMatch(/public\.tenant_word_heatmap\(\$1\)/);
    expect(params).toEqual(['tenant-1']);
  });

  it('ranks worst-first across groups and passes a caller-supplied limit through to the ranking step', async () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({
      group_id: i % 2 === 0 ? 'group-1' : 'group-2',
      group_name: i % 2 === 0 ? 'Group One' : 'Group Two',
      topic_word_id: `tw-${i}`,
      source_word: `word${i}`,
      topic_id: 'topic-1',
      topic_title: 'Unit 1',
      attempts: '10',
      failures: '5',
    }));
    const queryAsMock = jest
      .fn()
      .mockResolvedValueOnce([{ tenant_id: 'tenant-1', allowed: true }])
      .mockResolvedValueOnce(rows);
    const service = await makeService(queryAsMock);

    const result = await service.tenantHeatmap('admin-1', 2);

    expect(result).toHaveLength(2);
  });

  it('returns an empty array when the tenant has no review activity yet', async () => {
    const queryAsMock = jest
      .fn()
      .mockResolvedValueOnce([{ tenant_id: 'tenant-1', allowed: true }])
      .mockResolvedValueOnce([]);
    const service = await makeService(queryAsMock);

    const result = await service.tenantHeatmap('admin-1');

    expect(result).toEqual([]);
  });
});
