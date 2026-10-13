import { randomBytes } from 'node:crypto';

import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

import { DatabaseService } from '../../database/database.service';
import { decryptDonation, encryptDonation, parseDonationKey } from './voice-donation.crypto';
import { DonationMeta, VoiceDonationService } from './voice-donation.service';
import { VoiceDonationStorage } from './voice-donation.storage';
import { deviceFromUserAgent, VOICE_DONATION_TEXT_VERSION } from './voice-donation.types';

const KEY = randomBytes(32);
const AUDIO = { buffer: Buffer.from('fake m4a bytes'), mimetype: 'audio/mp4', filename: 'r.m4a' };
const DONOR = {
  donor_code: 'c',
  region: null,
  ui_locale: null,
  prompt_count: '0',
  today_count: '0',
};
const SENTENCE: DonationMeta = {
  kind: 'sentence',
  text: 'I think so.',
  targetIpa: null,
  accent: 'US',
  device: 'phone',
  scores: {
    total: 92,
    heard_text: 'I think so',
    duration_ms: 1500,
    voiced_ms: 900,
    gopt: { total: 90 },
    words: [{ status: 'ok' }, { status: 'ok' }, { status: 'ok' }],
  },
};
const META: DonationMeta = {
  kind: 'word',
  text: 'mitigate',
  targetIpa: '/ˈmɪt.ɪ.ɡeɪt/',
  accent: 'UK',
  device: 'phone',
  scores: { status: 'ok', total: 95 },
};

function make({
  enabled = true,
  key = KEY.toString('base64'),
  queryAs = jest.fn(),
  clientQuery = jest.fn().mockResolvedValue({ rows: [] }),
  queryAsService = jest.fn().mockResolvedValue([]),
}: {
  enabled?: boolean;
  key?: string;
  queryAs?: jest.Mock;
  clientQuery?: jest.Mock;
  queryAsService?: jest.Mock;
} = {}) {
  const values: Record<string, unknown> = {
    'voiceDonation.enabled': enabled,
    'voiceDonation.key': key,
  };
  const config = { get: (k: string, d?: unknown) => values[k] ?? d } as unknown as ConfigService;
  const client = { query: clientQuery };
  const db = {
    queryAs,
    queryAsService,
    withUser: jest.fn((_u: string, work: (c: typeof client) => unknown) => work(client)),
    withServiceRole: jest.fn((work: (c: typeof client) => unknown) => work(client)),
  } as unknown as DatabaseService;
  const storage = {
    put: jest.fn().mockResolvedValue(undefined),
    deleteMany: jest.fn().mockResolvedValue(undefined),
  };
  const queue = { add: jest.fn().mockResolvedValue({}) };
  const service = new VoiceDonationService(
    db,
    storage as unknown as VoiceDonationStorage,
    config,
    queue as unknown as Queue,
  );
  return { service, db, storage, queue, clientQuery, queryAs, queryAsService };
}

describe('voice donation crypto', () => {
  it('round-trips with the key and refuses a wrong key or a changed file', () => {
    const sealed = encryptDonation(Buffer.from('hello'), KEY);
    expect(sealed.subarray(0, 4).toString()).toBe('DYV1');
    expect(sealed.includes(Buffer.from('hello'))).toBe(false);
    expect(decryptDonation(sealed, KEY).toString()).toBe('hello');
    expect(() => decryptDonation(sealed, randomBytes(32))).toThrow();
    const changed = Buffer.from(sealed);
    changed[changed.length - 1] ^= 1;
    expect(() => decryptDonation(changed, KEY)).toThrow();
  });

  it('accepts only a 32-byte base64 key', () => {
    expect(parseDonationKey(KEY.toString('base64'))?.length).toBe(32);
    expect(parseDonationKey(randomBytes(16).toString('base64'))).toBeNull();
    expect(parseDonationKey('')).toBeNull();
    expect(parseDonationKey(undefined)).toBeNull();
  });
});

describe('deviceFromUserAgent', () => {
  it('tells phones, tablets and computers apart', () => {
    expect(
      deviceFromUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148'),
    ).toBe('phone');
    expect(deviceFromUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari')).toBe(
      'phone',
    );
    expect(deviceFromUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe('tablet');
    expect(deviceFromUserAgent('Mozilla/5.0 (Linux; Android 14; SM-X710) Safari')).toBe('tablet');
    expect(deviceFromUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe('desktop');
    expect(deviceFromUserAgent(undefined)).toBe('desktop');
  });
});

describe('VoiceDonationService', () => {
  it('flag off: the routes are 404 and nothing is kept', async () => {
    const { service, queryAs, storage } = make({ enabled: false });
    await expect(service.status('u')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.set('u', { donating: true })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.deleteRecordings('u')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.keep('u', AUDIO, META)).resolves.toBe(false);
    expect(queryAs).not.toHaveBeenCalled();
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('status: on with the consent date, count and region', async () => {
    const since = new Date('2026-10-12T08:00:00Z');
    const { service } = make({
      queryAs: jest.fn().mockResolvedValue([{ since, region: 'south', count: '38' }]),
    });
    await expect(service.status('u')).resolves.toEqual({
      donating: true,
      since: since.toISOString(),
      count: 38,
      region: 'south',
    });
  });

  it('turning on records the consent with the text version, then the donor code and region', async () => {
    const { service, clientQuery } = make({
      queryAs: jest.fn().mockResolvedValue([{ since: new Date(), region: 'north', count: '0' }]),
    });
    await service.set('u', {
      donating: true,
      method: 'register',
      region: 'north',
      locale: 'vi-VN',
    });
    const [consentSql, consentArgs] = clientQuery.mock.calls[0];
    expect(consentSql).toContain('insert into public.voice_donation_consents');
    expect(consentArgs).toEqual(['u', VOICE_DONATION_TEXT_VERSION, 'register', 'vi-VN']);
    expect(clientQuery.mock.calls[1][0]).toContain('insert into public.voice_donors');
    expect(clientQuery.mock.calls[1][1]).toEqual(['u', 'north']);
  });

  it('turning off only withdraws the consent', async () => {
    const { service, clientQuery } = make({
      queryAs: jest.fn().mockResolvedValue([{ since: null, region: null, count: '3' }]),
    });
    const status = await service.set('u', { donating: false });
    expect(clientQuery).toHaveBeenCalledTimes(1);
    expect(clientQuery.mock.calls[0][0]).toContain('set withdrawn_at = now()');
    expect(status).toMatchObject({ donating: false, count: 3 });
  });

  it('delete: withdraws, drops the donor link and queues the cleanup at once', async () => {
    const clientQuery = jest
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '38' }] })
      .mockResolvedValueOnce({ rows: [] });
    const { service, queue } = make({ clientQuery });
    await expect(service.deleteRecordings('u')).resolves.toEqual({ deleting: 38 });
    expect(clientQuery.mock.calls[0][0]).toContain('withdrawn_at = now()');
    expect(clientQuery.mock.calls[2][0]).toContain('delete from public.voice_donors');
    expect(queue.add).toHaveBeenCalledWith('voice-donation-cleanup', {}, expect.anything());
  });

  it('keep: no active consent, nothing kept', async () => {
    const { service, storage } = make({ queryAs: jest.fn().mockResolvedValue([]) });
    await expect(service.keep('u', AUDIO, META)).resolves.toBe(false);
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('keep: no key, nothing kept even with consent', async () => {
    const { service, queryAs, storage } = make({ key: '' });
    await expect(service.keep('u', AUDIO, META)).resolves.toBe(false);
    expect(queryAs).not.toHaveBeenCalled();
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('keep: encrypted audio and metadata under the donor code, no account id', async () => {
    const queryAs = jest
      .fn()
      .mockResolvedValueOnce([
        { ...DONOR, donor_code: 'code-1', region: 'south', ui_locale: 'vi-VN' },
      ])
      .mockResolvedValueOnce([]);
    const { service, storage } = make({ queryAs });
    service.random = () => 0; // picked as the 1-in-5 sample
    await expect(service.keep('user-uuid', AUDIO, META)).resolves.toBe(true);

    const [[audioKey, audioBody], [metaKey, metaBody]] = storage.put.mock.calls as [
      string,
      Buffer,
    ][];
    expect(audioKey).toMatch(/^donations\/code-1\/\d{4}-\d{2}\/[0-9a-f-]{36}\.audio\.enc$/);
    expect(metaKey).toBe(audioKey.replace('.audio.enc', '.json.enc'));
    expect(decryptDonation(audioBody, KEY)).toEqual(AUDIO.buffer);
    const meta = JSON.parse(decryptDonation(metaBody, KEY).toString());
    expect(meta).toMatchObject({
      donor_code: 'code-1',
      kind: 'word',
      text: 'mitigate',
      target_ipa: '/ˈmɪt.ɪ.ɡeɪt/',
      accent: 'UK',
      app_locale: 'vi-VN',
      device: 'phone',
      region: 'south',
      audio_type: 'audio/mp4',
      text_version: VOICE_DONATION_TEXT_VERSION,
      kept_reason: 'sample',
    });
    expect(JSON.stringify(meta)).not.toContain('user-uuid');

    const [, insertSql, insertArgs] = queryAs.mock.calls[1] as [string, string, unknown[]];
    expect(insertSql).toContain('insert into public.voice_donations');
    expect(insertArgs).toEqual([
      'code-1',
      audioKey.replace('.audio.enc', ''),
      'word',
      'mitigate',
      'south',
      'sample',
    ]);
  });

  it('keep: a storage failure is swallowed (the check result is unaffected)', async () => {
    const { service, storage } = make({ queryAs: jest.fn().mockResolvedValue([DONOR]) });
    service.random = () => 0;
    storage.put.mockRejectedValue(new Error('rustfs down'));
    await expect(service.keep('u', AUDIO, META)).resolves.toBe(false);
  });

  describe('keep: quality rules', () => {
    const sentence = (scores: object): DonationMeta => ({
      ...SENTENCE,
      scores: { ...(SENTENCE.scores as object), ...scores },
    });

    it('a recording that cannot be labelled is dropped before any database call', async () => {
      const { service, queryAs, storage } = make();
      const notHeard = { ...META, scores: { status: 'not_heard', total: 0 } };
      await expect(service.keep('u', AUDIO, notHeard)).resolves.toBe(false);
      await expect(service.keep('u', AUDIO, sentence({ voiced_ms: 200 }))).resolves.toBe(false);
      await expect(service.keep('u', AUDIO, sentence({ heard_text: 'hello there' }))).resolves.toBe(
        false,
      );
      expect(queryAs).not.toHaveBeenCalled();
      expect(storage.put).not.toHaveBeenCalled();
    });

    it('counts attempts per prompt by the normalised text, and today in Vietnam time', async () => {
      const queryAs = jest.fn().mockResolvedValue([{ ...DONOR, prompt_count: '2' }]);
      const { service, storage } = make({ queryAs });
      await expect(service.keep('u', AUDIO, SENTENCE)).resolves.toBe(false);
      expect(queryAs.mock.calls[0][2]).toEqual(['u', 'sentence', 'i think so', 'Asia/Ho_Chi_Minh']);
      expect(storage.put).not.toHaveBeenCalled();
    });

    it('stops at 20 a day', async () => {
      const { service, storage } = make({
        queryAs: jest.fn().mockResolvedValue([{ ...DONOR, today_count: '20' }]),
      });
      service.random = () => 0;
      await expect(service.keep('u', AUDIO, SENTENCE)).resolves.toBe(false);
      expect(storage.put).not.toHaveBeenCalled();
    });

    it('keeps 1 in 5 clear passes', async () => {
      const { service, storage } = make({ queryAs: jest.fn().mockResolvedValue([DONOR]) });
      service.random = () => 0.5;
      await expect(service.keep('u', AUDIO, SENTENCE)).resolves.toBe(false);
      service.random = () => 0.1;
      await expect(service.keep('u', AUDIO, SENTENCE)).resolves.toBe(true);
      expect(storage.put).toHaveBeenCalledTimes(2);
    });

    it('always keeps a flagged word, past the region quota', async () => {
      const queryAs = jest.fn().mockResolvedValue([DONOR]);
      const queryAsService = jest.fn().mockResolvedValue([{ count: '99' }]);
      const { service } = make({ queryAs, queryAsService });
      service.random = () => 0.99;
      const flagged = sentence({
        words: [{ status: 'ok' }, { status: 'unclear' }, { status: 'ok' }],
      });
      await expect(service.keep('u', AUDIO, flagged)).resolves.toBe(true);
      expect(queryAsService).not.toHaveBeenCalled();
      expect(queryAs.mock.calls[1][2][5]).toBe('flagged');
    });

    it('an uncertain score is kept until the prompt has 30 from the region', async () => {
      const queryAsService = jest
        .fn()
        .mockResolvedValueOnce([{ count: '29' }])
        .mockResolvedValueOnce([{ count: '30' }]);
      const { service } = make({
        queryAs: jest.fn().mockResolvedValue([{ ...DONOR, region: 'north' }]),
        queryAsService,
      });
      const unsure = sentence({ total: 60, gopt: { total: 62 } });
      await expect(service.keep('u', AUDIO, unsure)).resolves.toBe(true);
      await expect(service.keep('u', AUDIO, unsure)).resolves.toBe(false);
      expect(queryAsService.mock.calls[0][1]).toEqual(['sentence', 'i think so', 'north']);
    });
  });

  it('cleanup: deletes both files of each queued code, marks it done, then the expired ones', async () => {
    const queryAsService = jest
      .fn()
      .mockResolvedValueOnce([{ donor_code: 'gone' }])
      .mockResolvedValueOnce([{ object_key: 'donations/gone/2026-10/a' }])
      .mockResolvedValueOnce([{ object_key: 'donations/old/2023-01/b' }])
      .mockResolvedValueOnce([]);
    const { service, storage, clientQuery } = make({ queryAsService });
    await expect(service.cleanup()).resolves.toEqual({ codes: 1, files: 1, expired: 1 });
    expect(storage.deleteMany).toHaveBeenNthCalledWith(1, [
      'donations/gone/2026-10/a.audio.enc',
      'donations/gone/2026-10/a.json.enc',
    ]);
    expect(clientQuery.mock.calls[1][0]).toContain('set done_at = now()');
    expect(storage.deleteMany).toHaveBeenNthCalledWith(2, [
      'donations/old/2023-01/b.audio.enc',
      'donations/old/2023-01/b.json.enc',
    ]);
    expect(queryAsService.mock.calls[2][1]).toEqual([3]);
  });

  it('cleanup: a code whose files could not be deleted stays queued', async () => {
    const queryAsService = jest
      .fn()
      .mockResolvedValueOnce([{ donor_code: 'gone' }])
      .mockResolvedValueOnce([{ object_key: 'donations/gone/2026-10/a' }])
      .mockResolvedValueOnce([]);
    const { service, storage, clientQuery } = make({ queryAsService });
    storage.deleteMany.mockRejectedValueOnce(new Error('rustfs down'));
    await expect(service.cleanup()).resolves.toEqual({ codes: 0, files: 0, expired: 0 });
    expect(clientQuery).not.toHaveBeenCalled();
  });
});
