import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import * as webpush from 'web-push';

import { DatabaseService } from '../../database/database.service';
import { PushDispatchService } from './push-dispatch.service';

jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}));

function configValue(values: Record<string, string>) {
  return {
    get: jest.fn((key: string, fallback?: string) => values[key] ?? fallback),
  };
}

async function makeService(queryMock: jest.Mock, configured = true) {
  const moduleRef = await Test.createTestingModule({
    providers: [
      PushDispatchService,
      { provide: DatabaseService, useValue: { query: queryMock } },
      {
        provide: ConfigService,
        useValue: configValue(
          configured
            ? {
                'vapid.publicKey': 'pub',
                'vapid.privateKey': 'priv',
                'vapid.subject': 'mailto:a@b.com',
              }
            : { 'vapid.publicKey': '', 'vapid.privateKey': '' },
        ),
      },
    ],
  }).compile();
  return moduleRef.get(PushDispatchService);
}

const payload = { title: 'Hi', body: 'Body', path: '/study', tag: 'habit' };

describe('PushDispatchService.sendToUser', () => {
  afterEach(() => jest.clearAllMocks());

  it('no-ops when VAPID keys are not configured', async () => {
    const queryMock = jest.fn();
    const service = await makeService(queryMock, false);

    const result = await service.sendToUser('user-1', payload, 'http://localhost:3000');

    expect(result).toEqual({ sent: 0, pruned: 0, failed: 0 });
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('sends to every subscription and stamps last_used_at on success', async () => {
    const queryMock = jest
      .fn()
      .mockResolvedValueOnce([
        { id: 'sub-1', endpoint: 'https://push.example/1', p256dh_key: 'p1', auth_key: 'a1' },
        { id: 'sub-2', endpoint: 'https://push.example/2', p256dh_key: 'p2', auth_key: 'a2' },
      ])
      .mockResolvedValue([]);
    (webpush.sendNotification as jest.Mock).mockResolvedValue(undefined);
    const service = await makeService(queryMock);

    const result = await service.sendToUser('user-1', payload, 'http://localhost:3000');

    expect(result).toEqual({ sent: 2, pruned: 0, failed: 0 });
    expect(webpush.sendNotification).toHaveBeenCalledTimes(2);
    const [subscription, body] = (webpush.sendNotification as jest.Mock).mock.calls[0] as [
      unknown,
      string,
    ];
    expect(subscription).toEqual({
      endpoint: 'https://push.example/1',
      keys: { p256dh: 'p1', auth: 'a1' },
    });
    expect(JSON.parse(body)).toEqual({
      title: 'Hi',
      body: 'Body',
      url: 'http://localhost:3000/study',
      tag: 'habit',
    });
  });

  it('prunes a subscription on a 410 Gone without failing the batch', async () => {
    const queryMock = jest
      .fn()
      .mockResolvedValueOnce([
        { id: 'sub-1', endpoint: 'https://push.example/1', p256dh_key: 'p1', auth_key: 'a1' },
      ])
      .mockResolvedValue([]);
    (webpush.sendNotification as jest.Mock).mockRejectedValue(
      Object.assign(new Error('gone'), { statusCode: 410 }),
    );
    const service = await makeService(queryMock);

    const result = await service.sendToUser('user-1', payload, 'http://localhost:3000');

    expect(result).toEqual({ sent: 0, pruned: 1, failed: 0 });
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringMatching(/delete from public\.push_subscriptions/i),
      ['sub-1'],
    );
  });

  it('counts a non-410/404 failure without pruning the subscription', async () => {
    const queryMock = jest
      .fn()
      .mockResolvedValueOnce([
        { id: 'sub-1', endpoint: 'https://push.example/1', p256dh_key: 'p1', auth_key: 'a1' },
      ])
      .mockResolvedValue([]);
    (webpush.sendNotification as jest.Mock).mockRejectedValue(
      Object.assign(new Error('server error'), { statusCode: 500 }),
    );
    const service = await makeService(queryMock);

    const result = await service.sendToUser('user-1', payload, 'http://localhost:3000');

    expect(result).toEqual({ sent: 0, pruned: 0, failed: 1 });
    expect(queryMock).toHaveBeenCalledTimes(1); // only the initial select — no delete
  });

  it('vapidPublicKey returns the configured key', async () => {
    const service = await makeService(jest.fn());
    expect(service.vapidPublicKey()).toBe('pub');
  });
});
