import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

/** Mono AAC-LC bitrate: speech stays clear, ~6× smaller than 24 kHz 16-bit WAV. */
export const AAC_BITRATE = '48k';

/**
 * Store the WAV next to the .m4a (same key, `.wav`), as Dylan asked
 * (2026-10-04): AAC is what the app links to, the WAV stays available for
 * the support period (older clients, other tools, re-encoding later). Turn
 * off when WAV support ends; the .m4a URLs don't change.
 */
export const KEEP_WAV_COPY = true;

/** One clip in the formats to store. URLs point at `primary`. */
export interface EncodedAudio {
  primary: 'm4a' | 'wav';
  /** AAC in .m4a; null when ffmpeg is missing or failed (then WAV is primary). */
  m4a: Buffer | null;
  wav: Buffer;
  /** Why there's no .m4a, for the caller to log. */
  fallback?: string;
}

export const CONTENT_TYPES = { m4a: 'audio/mp4', wav: 'audio/wav' } as const;

/** The files to upload for `audio`, primary first; `key(ext)` builds each key. */
export function filesToStore(
  audio: EncodedAudio,
  key: (ext: 'm4a' | 'wav') => string,
): { key: string; body: Buffer; contentType: string }[] {
  const files = [];
  if (audio.m4a) files.push({ key: key('m4a'), body: audio.m4a, contentType: CONTENT_TYPES.m4a });
  if (!audio.m4a || KEEP_WAV_COPY) {
    files.push({ key: key('wav'), body: audio.wav, contentType: CONTENT_TYPES.wav });
  }
  return files;
}

function ffmpegPath(): string | null {
  const candidates = [process.env.FFMPEG_PATH, '/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg'];
  for (const c of candidates) if (c && existsSync(c)) return c;
  return process.env.PATH?.split(':').some((dir) => existsSync(join(dir, 'ffmpeg')))
    ? 'ffmpeg'
    : null;
}

/**
 * WAV → AAC in an .m4a container (`-movflags +faststart`, so playback can
 * start before the whole file arrives). ffmpeg writes an edit list for the
 * encoder's priming samples, so the decoded clip lines up with the WAV
 * (measured: 0 ms shift), and word timings measured on the WAV stay valid.
 * Without ffmpeg, or if it fails, the WAV is the only (primary) format.
 */
export async function encodeForWeb(wav: Buffer): Promise<EncodedAudio> {
  const ffmpeg = ffmpegPath();
  if (!ffmpeg) return { primary: 'wav', m4a: null, wav, fallback: 'ffmpeg not found' };
  const dir = await mkdtemp(join(tmpdir(), 'dygo-aac-'));
  try {
    const input = join(dir, 'in.wav');
    const output = join(dir, 'out.m4a');
    await writeFile(input, wav);
    await run(ffmpeg, [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-i',
      input,
      '-ac',
      '1',
      '-c:a',
      'aac',
      '-b:a',
      AAC_BITRATE,
      '-movflags',
      '+faststart',
      output,
    ]);
    return { primary: 'm4a', m4a: await readFile(output), wav };
  } catch (err) {
    return { primary: 'wav', m4a: null, wav, fallback: (err as Error).message };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
