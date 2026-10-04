/**
 * Where the app's own media (word and speaking audio) is stored and served
 * from. One function so the Nest config (`configuration.ts`) and the
 * offline scripts (`scripts/*.ts`) can't drift apart.
 *
 * Decided 2026-10-04 (Dylan, "option 2"): RustFS on this Mac is the store,
 * served publicly at https://media.dygoacademy.com through the Cloudflare
 * Tunnel and cached by Cloudflare (README "Cloudflare dashboard rules").
 * `STORAGE_PROVIDER=r2` switches back to Cloudflare R2 (the store until
 * then); object keys are the same in both, so only the host changes.
 */
export type StorageProvider = 'rustfs' | 'r2';

export interface StorageConfig {
  provider: StorageProvider;
  /** S3 API endpoint the backend writes to. */
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region: string;
  forcePathStyle: boolean;
  /** Public base URL; a file's URL is `${publicUrl}/${key}` (no bucket segment). */
  publicUrl: string;
}

type Env = Record<string, string | undefined>;

export function storageConfigFrom(env: Env): StorageConfig {
  if (env.STORAGE_PROVIDER === 'r2') {
    return {
      provider: 'r2',
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      accessKeyId: env.R2_ACCESS_KEY_ID ?? '',
      secretAccessKey: env.R2_SECRET_ACCESS_KEY ?? '',
      bucket: env.R2_BUCKET_NAME ?? 'dygo-audio',
      region: env.STORAGE_REGION ?? 'auto',
      forcePathStyle: false,
      // R2's public bucket domain resolves to the bucket root.
      publicUrl: env.R2_PUBLIC_URL ?? '',
    };
  }
  return {
    provider: 'rustfs',
    // docker-compose publishes RustFS's S3 API on 127.0.0.1:9100 (php-fpm
    // holds 9000); the backend runs on the host under pm2.
    endpoint: env.RUSTFS_ENDPOINT ?? 'http://127.0.0.1:9100',
    accessKeyId: env.RUSTFS_ACCESS_KEY ?? '',
    secretAccessKey: env.RUSTFS_SECRET_KEY ?? '',
    bucket: env.MEDIA_BUCKET ?? 'media',
    region: 'us-east-1',
    // Path style for the backend's own (signed) requests; the public
    // hostname maps to the bucket by virtual-host style
    // (RUSTFS_SERVER_DOMAINS in docker-compose.yml).
    forcePathStyle: true,
    publicUrl: env.MEDIA_PUBLIC_URL ?? 'https://media.dygoacademy.com',
  };
}
