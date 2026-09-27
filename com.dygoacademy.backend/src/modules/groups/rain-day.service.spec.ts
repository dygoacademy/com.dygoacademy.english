import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { DatabaseService } from '../../database/database.service';
import { RainDayService } from './rain-day.service';

async function makeService(queryAs: jest.Mock): Promise<RainDayService> {
  const moduleRef = await Test.createTestingModule({
    providers: [RainDayService, { provide: DatabaseService, useValue: { queryAs } }],
  }).compile();
  return moduleRef.get(RainDayService);
}

function pgError(code: string): Error {
  return Object.assign(new Error(`pg ${code}`), { code });
}

describe('RainDayService.start', () => {
  it('runs start_group_rain_day as the caller with a smallint cast and default 10 words', async () => {
    const endsAt = new Date('2026-09-27T16:59:59.999Z');
    const queryAs = jest
      .fn()
      .mockResolvedValue([{ id: 'rd-1', ends_at: endsAt, words_per_gardener: 10 }]);
    const service = await makeService(queryAs);

    const result = await service.start('admin-1', 'g1', undefined, '  Rain! ');

    const [userId, sql, params] = queryAs.mock.calls[0];
    expect(userId).toBe('admin-1');
    expect(sql).toMatch(/public\.start_group_rain_day\(\$1, \$2::smallint, \$3\)/);
    expect(params).toEqual(['g1', 10, 'Rain!']);
    expect(result).toEqual({ id: 'rd-1', endsAt: endsAt.toISOString(), wordsPerGardener: 10 });
  });

  it('maps 23505 to 409, 42501 to 403 and 22023 to 400', async () => {
    const cases: [string, unknown][] = [
      ['23505', ConflictException],
      ['42501', ForbiddenException],
      ['22023', BadRequestException],
    ];
    for (const [code, type] of cases) {
      const service = await makeService(jest.fn().mockRejectedValue(pgError(code)));
      await expect(service.start('u', 'g1', 5)).rejects.toBeInstanceOf(type as never);
    }
  });

  it('passes other errors through', async () => {
    const boom = new Error('connection lost');
    const service = await makeService(jest.fn().mockRejectedValue(boom));
    await expect(service.start('u', 'g1', 20)).rejects.toBe(boom);
  });
});

describe('RainDayService.status', () => {
  it('splits current and last and returns numbers, never a user id', async () => {
    const queryAs = jest.fn().mockResolvedValue([
      {
        id: 'rd-2',
        words_per_gardener: 10,
        starts_at: new Date('2026-09-27T01:00:00Z'),
        ends_at: new Date('2026-09-27T16:59:59Z'),
        is_current: true,
        gardeners: '5',
        done: '3',
        mine: '4',
      },
      {
        id: 'rd-1',
        words_per_gardener: 5,
        starts_at: new Date('2026-09-25T01:00:00Z'),
        ends_at: new Date('2026-09-25T16:59:59Z'),
        is_current: false,
        gardeners: '5',
        done: '5',
        mine: '7',
      },
    ]);
    const service = await makeService(queryAs);

    const result = await service.status('member-1', 'g1');

    expect(queryAs.mock.calls[0][0]).toBe('member-1');
    expect(queryAs.mock.calls[0][1]).toMatch(/public\.group_rain_day_status\(\$1\)/);
    expect(result.current).toEqual({
      id: 'rd-2',
      wordsPerGardener: 10,
      startsAt: '2026-09-27T01:00:00.000Z',
      endsAt: '2026-09-27T16:59:59.000Z',
      gardeners: 5,
      done: 3,
      mine: 4,
    });
    expect(result.last?.id).toBe('rd-1');
    expect(result.last?.done).toBe(5);
    expect(JSON.stringify(result)).not.toMatch(/user_id|userId|email|display_name/);
  });

  it('returns nulls when there is no rain day', async () => {
    const service = await makeService(jest.fn().mockResolvedValue([]));
    await expect(service.status('m', 'g1')).resolves.toEqual({ current: null, last: null });
  });

  it('maps 42501 (not a member) to 403', async () => {
    const service = await makeService(jest.fn().mockRejectedValue(pgError('42501')));
    await expect(service.status('m', 'g1')).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('RainDayService.cancel', () => {
  it('resolves when a rain day was cancelled', async () => {
    const queryAs = jest.fn().mockResolvedValue([{ cancelled: true }]);
    const service = await makeService(queryAs);
    await expect(service.cancel('admin-1', 'g1')).resolves.toBeUndefined();
    expect(queryAs.mock.calls[0][1]).toMatch(/public\.cancel_group_rain_day\(\$1\)/);
  });

  it('404 when nothing was running, 403 when not ADMIN', async () => {
    const none = await makeService(jest.fn().mockResolvedValue([{ cancelled: false }]));
    await expect(none.cancel('a', 'g1')).rejects.toBeInstanceOf(NotFoundException);
    const denied = await makeService(jest.fn().mockRejectedValue(pgError('42501')));
    await expect(denied.cancel('a', 'g1')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
