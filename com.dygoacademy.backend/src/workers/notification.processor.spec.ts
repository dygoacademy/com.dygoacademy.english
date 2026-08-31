import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Job } from 'bullmq';

import { DatabaseService } from '../database/database.service';
import { PushDispatchService } from '../modules/notifications/push-dispatch.service';
import { NotificationCronJob } from '../queues/queue.constants';
import { NotificationProcessor } from './notification.processor';

function makeJob(tickAt = '2026-09-01T20:00:00.000Z'): Job<NotificationCronJob> {
  return { data: { tickAt } } as unknown as Job<NotificationCronJob>;
}

describe('NotificationProcessor', () => {
  let queryMock: jest.Mock;
  let sendToUserMock: jest.Mock;
  let processor: NotificationProcessor;

  beforeEach(async () => {
    queryMock = jest.fn();
    sendToUserMock = jest.fn().mockResolvedValue({ sent: 1, pruned: 0, failed: 0 });

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationProcessor,
        { provide: DatabaseService, useValue: { query: queryMock } },
        { provide: PushDispatchService, useValue: { sendToUser: sendToUserMock } },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:3000') },
        },
      ],
    }).compile();

    processor = moduleRef.get(NotificationProcessor);
  });

  it('does nothing when no schedule bucket matches this tick', async () => {
    queryMock.mockResolvedValueOnce([]); // due-schedules query

    await processor.process(makeJob());

    expect(sendToUserMock).not.toHaveBeenCalled();
  });

  it('skips a matched user with nothing due and no leeches (buildReminderPayload -> null)', async () => {
    queryMock
      .mockResolvedValueOnce([{ user_id: 'user-1' }]) // due schedules
      .mockResolvedValueOnce([{ due_now: '0', leech_count: '0' }]) // stats
      .mockResolvedValueOnce([]); // streak dates

    await processor.process(makeJob());

    expect(sendToUserMock).not.toHaveBeenCalled();
  });

  it('dispatches a leech-priority push for a matched user with due leeches', async () => {
    queryMock
      .mockResolvedValueOnce([{ user_id: 'user-1' }])
      .mockResolvedValueOnce([{ due_now: '5', leech_count: '2' }])
      .mockResolvedValueOnce([]);

    await processor.process(makeJob());

    expect(sendToUserMock).toHaveBeenCalledTimes(1);
    const [userId, payload, frontendUrl] = sendToUserMock.mock.calls[0];
    expect(userId).toBe('user-1');
    expect(payload.tag).toBe('leech');
    expect(frontendUrl).toBe('http://localhost:3000');
  });

  it('isolates a per-user failure — one bad stats query does not stop the tick', async () => {
    // buildPayload fires its stats + streak queries together via
    // Promise.all, so each user consumes two queue slots, not one — the
    // failing user's *stats* query rejects; its streak query still gets
    // called (and must resolve to something) before the rejection is
    // observed by the caller.
    queryMock
      .mockResolvedValueOnce([{ user_id: 'user-1' }, { user_id: 'user-2' }]) // due schedules
      .mockRejectedValueOnce(new Error('db down')) // user-1 stats query fails
      .mockResolvedValueOnce([]) // user-1 streak query (result discarded — Promise.all already rejects)
      .mockResolvedValueOnce([{ due_now: '3', leech_count: '0' }]) // user-2 stats
      .mockResolvedValueOnce([]); // user-2 streak

    await processor.process(makeJob());

    expect(sendToUserMock).toHaveBeenCalledTimes(1);
    expect(sendToUserMock.mock.calls[0][0]).toBe('user-2');
  });
});
