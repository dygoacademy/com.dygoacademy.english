import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

/**
 * S3-compatible object storage — Cloudflare R2 in production, MinIO locally
 * (tech spec §3, "Audio Storage & CDN"). Both speak the S3 API, so one
 * client handles both; only the endpoint/credentials differ (configuration.ts
 * `storage`).
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('storage.bucket', 'dygo-audio');
    this.publicUrl = this.config.get<string>('storage.publicUrl', 'http://localhost:9000');
    this.client = new S3Client({
      endpoint: this.config.get<string>('storage.endpoint'),
      region: this.config.get<string>('storage.region', 'auto'),
      forcePathStyle: this.config.get<boolean>('storage.forcePathStyle', true),
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
    // Path-style local (MinIO) needs the bucket in the URL; R2's public
    // bucket domain already resolves to bucket root.
    const url = this.config.get<boolean>('storage.forcePathStyle', true)
      ? `${base}/${this.bucket}/${key}`
      : `${base}/${key}`;

    this.logger.debug(`uploaded ${key} -> ${url}`);
    return url;
  }
}
