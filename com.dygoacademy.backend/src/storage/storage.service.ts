import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';

/**
 * S3-compatible object storage — Cloudflare R2, always (tech spec §3,
 * "Audio Storage & CDN"). Used to fall back to local MinIO in dev; removed
 * 2026-09-16 so every environment writes to the same real R2 bucket (see
 * configuration.ts `storage`'s own comment for why).
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('storage.bucket', 'dygo-audio');
    this.publicUrl = this.config.get<string>('storage.publicUrl', '');
    this.client = new S3Client({
      endpoint: this.config.get<string>('storage.endpoint'),
      region: this.config.get<string>('storage.region', 'auto'),
      forcePathStyle: this.config.get<boolean>('storage.forcePathStyle', false),
      credentials: {
        accessKeyId: this.config.get<string>('storage.accessKeyId', ''),
        secretAccessKey: this.config.get<string>('storage.secretAccessKey', ''),
      },
    });
  }

  /**
   * The one place a word's audio object key is built (tech spec §4.2:
   * `audio/[lang]/[accent]/[normalized_word_md5].ext`). Deterministic, so the
   * same word always maps to the same object — which is what lets
   * `hasObject` find audio generated before a database reset.
   */
  static audioKeyFor(normalizedWord: string, languageCode: string): string {
    const hash = createHash('md5').update(normalizedWord).digest('hex');
    return `audio/${languageCode}/us/${hash}.wav`;
  }

  /** True if `key` already exists in the bucket (HEAD, no download). */
  async hasObject(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch (err) {
      const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (status === 404 || (err as { name?: string }).name === 'NotFound') return false;
      throw err;
    }
  }

  /** Public, browser-playable URL for `key` (see `upload`). */
  publicUrlFor(key: string): string {
    const base = this.publicUrl.replace(/\/+$/, '');
    // R2's public bucket domain already resolves to bucket root — no
    // bucket segment needed (forcePathStyle is always false now; see
    // configuration.ts).
    return this.config.get<boolean>('storage.forcePathStyle', false)
      ? `${base}/${this.bucket}/${key}`
      : `${base}/${key}`;
  }

  /**
   * Uploads `body` to `key` and returns the permanent public CDN URL,
   * matching the `master_lexicon.audio_url` contract (tech spec §4.2 —
   * `/audio/[lang]/[accent]/[normalized_word_md5].ext`, caller builds `key`).
   */
  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        // Audio assets are immutable once enriched (keyed by content hash) —
        // safe to cache aggressively at the edge.
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    const url = this.publicUrlFor(key);
    this.logger.debug(`uploaded ${key} -> ${url}`);
    return url;
  }
}
