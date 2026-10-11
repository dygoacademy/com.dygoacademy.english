import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBucketCommand,
  DeleteObjectsCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

/**
 * The private bucket for donated recordings (VOICE_DONATION_BUCKET, default
 * `voice-donations`) on the same S3 store as the media (RustFS on this Mac,
 * or R2), with the same credentials. It is never made public and nothing in
 * the app links to it; objects are already encrypted (voice-donation.crypto).
 * The bucket is created on first use.
 */
@Injectable()
export class VoiceDonationStorage {
  private readonly logger = new Logger(VoiceDonationStorage.name);
  private readonly client: S3Client;
  readonly bucket: string;
  private ready: Promise<void> | null = null;

  constructor(config: ConfigService) {
    this.bucket = config.get<string>('voiceDonation.bucket', 'voice-donations');
    this.client = new S3Client({
      endpoint: config.get<string>('storage.endpoint'),
      region: config.get<string>('storage.region', 'auto'),
      forcePathStyle: config.get<boolean>('storage.forcePathStyle', false),
      credentials: {
        accessKeyId: config.get<string>('storage.accessKeyId', ''),
        secretAccessKey: config.get<string>('storage.secretAccessKey', ''),
      },
    });
  }

  async put(key: string, body: Buffer): Promise<void> {
    await this.ensureBucket();
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: 'application/octet-stream',
        CacheControl: 'private, no-store',
      }),
    );
  }

  /** Deletes up to 1000 keys per call; a missing key is not an error. */
  async deleteMany(keys: string[]): Promise<void> {
    for (let i = 0; i < keys.length; i += 1000) {
      const batch = keys.slice(i, i + 1000);
      const res = await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
        }),
      );
      const failed = (res.Errors ?? []).filter((e) => e.Code !== 'NoSuchKey');
      if (failed.length > 0) {
        throw new Error(`could not delete ${failed.length} donated file(s): ${failed[0].Code}`);
      }
    }
  }

  private ensureBucket(): Promise<void> {
    this.ready ??= (async () => {
      try {
        await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      } catch {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`created private bucket ${this.bucket}`);
      }
    })().catch((err) => {
      this.ready = null;
      throw err;
    });
    return this.ready;
  }
}
