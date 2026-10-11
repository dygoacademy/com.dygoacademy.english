import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Donated recordings are encrypted before they leave the API (AES-256-GCM,
 * key VOICE_DONATION_KEY, 32 bytes base64), so the bucket only ever holds
 * ciphertext whatever the storage provider does. Layout: "DYV1" | 12-byte
 * IV | 16-byte tag | ciphertext.
 */
const MAGIC = Buffer.from('DYV1');
const IV_BYTES = 12;
const TAG_BYTES = 16;

/** The 32-byte key from its base64 form; null when missing or the wrong size. */
export function parseDonationKey(base64: string | undefined): Buffer | null {
  if (!base64) return null;
  const key = Buffer.from(base64.trim(), 'base64');
  return key.length === 32 ? key : null;
}

export function encryptDonation(plain: Buffer, key: Buffer): Buffer {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), body]);
}

/** For the training export and tests; throws on a wrong key or a changed file. */
export function decryptDonation(sealed: Buffer, key: Buffer): Buffer {
  if (sealed.length < MAGIC.length + IV_BYTES + TAG_BYTES || !sealed.subarray(0, 4).equals(MAGIC)) {
    throw new Error('not a donated recording');
  }
  const iv = sealed.subarray(4, 4 + IV_BYTES);
  const tag = sealed.subarray(4 + IV_BYTES, 4 + IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(sealed.subarray(4 + IV_BYTES + TAG_BYTES)),
    decipher.final(),
  ]);
}
