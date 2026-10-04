import { ConfigService } from '@nestjs/config';

import { StorageService } from '../storage/storage.service';
import { storageConfigFrom } from './storage-config';

describe('storageConfigFrom', () => {
  it('defaults to RustFS served at media.dygoacademy.com', () => {
    const c = storageConfigFrom({ RUSTFS_ACCESS_KEY: 'ak', RUSTFS_SECRET_KEY: 'sk' });
    expect(c).toEqual({
      provider: 'rustfs',
      endpoint: 'http://127.0.0.1:9100',
      accessKeyId: 'ak',
      secretAccessKey: 'sk',
      bucket: 'media',
      region: 'us-east-1',
      forcePathStyle: true,
      publicUrl: 'https://media.dygoacademy.com',
    });
  });

  it('STORAGE_PROVIDER=r2 switches back to Cloudflare R2', () => {
    const c = storageConfigFrom({
      STORAGE_PROVIDER: 'r2',
      R2_ACCOUNT_ID: 'acc',
      R2_ACCESS_KEY_ID: 'ak',
      R2_SECRET_ACCESS_KEY: 'sk',
      R2_BUCKET_NAME: 'dygo-audio',
      R2_PUBLIC_URL: 'https://pub-x.r2.dev',
    });
    expect(c).toMatchObject({
      provider: 'r2',
      endpoint: 'https://acc.r2.cloudflarestorage.com',
      bucket: 'dygo-audio',
      forcePathStyle: false,
      publicUrl: 'https://pub-x.r2.dev',
    });
  });
});

describe('StorageService.publicUrlFor', () => {
  const service = (publicUrl: string) =>
    new StorageService({
      get: (k: string, d?: unknown) =>
        ({ 'storage.publicUrl': publicUrl, 'storage.forcePathStyle': true })[k] ?? d,
    } as unknown as ConfigService);

  it('has no bucket segment even though the S3 client uses path style', () => {
    expect(service('https://media.dygoacademy.com/').publicUrlFor('audio/en/us/abc.m4a')).toBe(
      'https://media.dygoacademy.com/audio/en/us/abc.m4a',
    );
  });
});

describe('StorageService key builders', () => {
  it('default to .m4a and keep the .wav copy at the same path', () => {
    const m4a = StorageService.audioKeyFor('ephemeral', 'en');
    expect(m4a).toMatch(/^audio\/en\/us\/[0-9a-f]{32}\.m4a$/);
    expect(StorageService.audioKeyFor('ephemeral', 'en', 'wav')).toBe(m4a.replace(/m4a$/, 'wav'));
    const s = StorageService.speakingAudioKeyFor('Hi there.', 'UK', 'en-GB-Neural2-C');
    expect(s).toMatch(/^speaking\/en\/uk\/[0-9a-f]{32}\.m4a$/);
  });
});
