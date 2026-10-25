import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';

/**
 * S3-compatible media storage: RustFS on this Mac (public at
 * https://media.dygoacademy.com) since 2026-10-04, or Cloudflare R2 with
 * STORAGE_PROVIDER=r2 (config/storage-config.ts). Same keys either way.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('storage.bucket', 'media');
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
  static audioKeyFor(
    normalizedWord: string,
    languageCode: string,
    ext: 'm4a' | 'wav' = 'm4a',
    /**
     * What the clip was made from (voice, IPA). Part of the hash so a remade
     * clip is a new file: the old one is cached as immutable on phones and
     * the CDN. Omitted = the original md5(word) keys (Gemini TTS clips).
     */
    madeFrom?: string,
    /** The UK clip sits under `uk/`; US (and the older Gemini clips) under `us/`. */
    accent: 'UK' | 'US' = 'US',
  ): string {
    const hash = createHash('md5')
      .update(madeFrom ? `${madeFrom}|${normalizedWord}` : normalizedWord)
      .digest('hex');
    return `audio/${languageCode}/${accent.toLowerCase()}/${hash}.${ext}`;
  }

  /**
   * Phase 13 speaking clip key: `speaking/[lang]/[uk|us]/md5(voice|sentence).wav`.
   * Deterministic like `audioKeyFor`, and the voice is part of the hash, so
   * changing the voice makes new files instead of silently replacing old
   * ones. The timings JSON sits next to it (`.json`), so a database reset
   * can rebuild `speaking_items` without paying for TTS again.
   */
  static speakingAudioKeyFor(
    sentence: string,
    accent: 'UK' | 'US',
    voice: string,
    languageCode = 'en',
    ext: 'm4a' | 'wav' = 'm4a',
    speakingRate = 1,
  ): string {
    // A slower clip is a different file (the old one is cached as immutable);
    // rate 1 keeps the original keys.
    const made = speakingRate === 1 ? voice : `${voice}@${speakingRate}`;
    const hash = createHash('md5').update(`${made}|${sentence.trim()}`).digest('hex');
    return `speaking/${languageCode}/${accent.toLowerCase()}/${hash}.${ext}`;
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

  /**
   * Public, browser-playable URL for `key` (see `upload`). Both public hosts
   * (media.dygoacademy.com and R2's bucket domain) resolve to the bucket
   * root, so there's never a bucket segment.
   */
  /** The object at `key`, or null when it isn't there. */
  async getObject(key: string): Promise<Buffer | null> {
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      return res.Body ? Buffer.from(await res.Body.transformToByteArray()) : null;
    } catch (err) {
      const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (status === 404 || (err as { name?: string }).name === 'NoSuchKey') return null;
      throw err;
    }
  }

  /** The key of one of our public URLs (`publicUrlFor`), or null for any other URL. */
  keyForUrl(url: string | null | undefined): string | null {
    const base = `${this.publicUrl.replace(/\/+$/, '')}/`;
    return url && url.startsWith(base) ? url.slice(base.length) : null;
  }

  publicUrlFor(key: string): string {
    return `${this.publicUrl.replace(/\/+$/, '')}/${key}`;
  }

  /**
   * Uploads `body` to `key` and returns the permanent public CDN URL,
   * matching the `master_lexicon.audio_url_us` contract (tech spec §4.2 —
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
