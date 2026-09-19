import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

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

    const base = this.publicUrl.replace(/\/+$/, '');
    // R2's public bucket domain already resolves to bucket root — no
    // bucket segment needed (forcePathStyle is always false now; see
    // configuration.ts).
    const url = this.config.get<boolean>('storage.forcePathStyle', false)
      ? `${base}/${this.bucket}/${key}`
      : `${base}/${key}`;

    this.logger.debug(`uploaded ${key} -> ${url}`);
    return url;
  }
}
