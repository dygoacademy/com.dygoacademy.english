import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { DatabaseService } from '../../database/database.service';
import { NotificationsService } from './notifications.service';
import { PushDispatchService } from './push-dispatch.service';

async function makeService(opts: {
  queryAsMock: jest.Mock;
  sendToUserMock?: jest.Mock;
  vapidPublicKeyMock?: jest.Mock;
}) {
  const moduleRef = await Test.createTestingModule({
    providers: [
      NotificationsService,
      { provide: DatabaseService, useValue: { queryAs: opts.queryAsMock } },
      {
        provide: PushDispatchService,
        useValue: {
          sendToUser: opts.sendToUserMock ?? jest.fn(),
          vapidPublicKey: opts.vapidPublicKeyMock ?? jest.fn().mockReturnValue('pub'),
        },
      },
      {
        provide: ConfigService,
        useValue: { get: jest.fn().mockReturnValue('http://localhost:3000') },
      },
    ],
  }).compile();
  return moduleRef.get(NotificationsService);
}

describe('NotificationsService', () => {
  it('subscribe upserts on the endpoint conflict target', async () => {
    const queryAsMock = jest.fn().mockResolvedValue([{ id: 'sub-1' }]);
    const service = await makeService({ queryAsMock });

    const result = await service.subscribe('user-1', {
      endpoint: 'https://push.example/1',
      keys: { p256dh: 'p1', auth: 'a1' },
    });

    expect(result).toEqual({ id: 'sub-1' });
    expect(queryAsMock.mock.calls[0][1]).toMatch(/on conflict \(endpoint\)/i);
  });

  it('unsubscribe throws NotFoundException when no row matched', async () => {
    const queryAsMock = jest.fn().mockResolvedValue([]);
    const service = await makeService({ queryAsMock });

    await expect(service.unsubscribe('user-1', 'https://push.example/1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('upsertSchedule defaults isEnabled to true', async () => {
    const queryAsMock = jest
      .fn()
      .mockResolvedValue([
        { id: 's-1', reminder_time: '20:00:00', timezone: 'UTC', is_enabled: true },
      ]);
    const service = await makeService({ queryAsMock });

    await service.upsertSchedule('user-1', { reminderTime: '20:00', timezone: 'UTC' });

    expect(queryAsMock.mock.calls[0][2]).toEqual(['user-1', '20:00', 'UTC', true]);
  });

  it('deleteSchedule throws NotFoundException when no row matched', async () => {
    const queryAsMock = jest.fn().mockResolvedValue([]);
    const service = await makeService({ queryAsMock });

    await expect(service.deleteSchedule('user-1', 'sched-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  describe('triggerSprint', () => {
    it('throws ForbiddenException when the caller is not a group ADMIN', async () => {
      const queryAsMock = jest.fn().mockResolvedValueOnce([{ allowed: false }]);
      const service = await makeService({ queryAsMock });

      await expect(service.triggerSprint('user-1', 'group-1', {})).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('throws ConflictException when the group has no other members', async () => {
      const queryAsMock = jest
        .fn()
        .mockResolvedValueOnce([{ allowed: true }])
        .mockResolvedValueOnce([]);
      const service = await makeService({ queryAsMock });

      await expect(service.triggerSprint('user-1', 'group-1', {})).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('dispatches to every other member and aggregates results', async () => {
      const queryAsMock = jest
        .fn()
        .mockResolvedValueOnce([{ allowed: true }])
        .mockResolvedValueOnce([{ user_id: 'member-1' }, { user_id: 'member-2' }]);
      const sendToUserMock = jest
        .fn()
        .mockResolvedValueOnce({ sent: 1, pruned: 0, failed: 0 })
        .mockResolvedValueOnce({ sent: 0, pruned: 1, failed: 0 });
      const service = await makeService({ queryAsMock, sendToUserMock });

      const result = await service.triggerSprint('user-1', 'group-1', {
        message: 'Quiz tomorrow!',
      });

      expect(result).toEqual({ recipients: 2, sent: 1, pruned: 1 });
      expect(sendToUserMock).toHaveBeenCalledTimes(2);
      expect(sendToUserMock.mock.calls[0][1].body).toBe('Quiz tomorrow!');
    });
  });
});
