import { existsSync } from 'node:fs';

import { encodeWav } from '../modules/speaking/speaking-timings';
import { encodeForWeb, filesToStore } from './audio-encode';

/** 1 s of a 220 Hz tone, 24 kHz mono 16-bit, like Gemini TTS output. */
function toneWav(): Buffer {
  const rate = 24000;
  const samples = new Int16Array(rate);
  for (let i = 0; i < rate; i++)
    samples[i] = Math.round(12000 * Math.sin((2 * Math.PI * 220 * i) / rate));
  return encodeWav({ samples, sampleRate: rate });
}

const hasFfmpeg = ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg', process.env.FFMPEG_PATH]
  .filter(Boolean)
  .some((p) => existsSync(p as string));

describe('encodeForWeb', () => {
  (hasFfmpeg ? it : it.skip)('turns WAV into a much smaller AAC .m4a (runs ffmpeg)', async () => {
    const wav = toneWav();
    const out = await encodeForWeb(wav);
    expect(out.fallback).toBeUndefined();
    expect(out.primary).toBe('m4a');
    expect(out.wav).toBe(wav);
    // MP4 container: "ftyp" box right after the 4-byte size.
    expect(out.m4a!.toString('ascii', 4, 8)).toBe('ftyp');
    expect(out.m4a!.length).toBeLessThan(wav.length / 4);
  });

  (hasFfmpeg ? it : it.skip)('falls back to the input as WAV when ffmpeg rejects it', async () => {
    const junk = Buffer.from('definitely not audio');
    const out = await encodeForWeb(junk);
    expect(out.primary).toBe('wav');
    expect(out.m4a).toBeNull();
    expect(out.wav).toBe(junk);
    expect(out.fallback).toBeTruthy();
  });
});

describe('filesToStore', () => {
  const key = (ext: string) => `audio/en/us/abc.${ext}`;

  it('stores the .m4a first, then the WAV copy at the same key (KEEP_WAV_COPY)', () => {
    const files = filesToStore(
      { primary: 'm4a', m4a: Buffer.from('a'), wav: Buffer.from('w') },
      key,
    );
    expect(files.map((f) => [f.key, f.contentType])).toEqual([
      ['audio/en/us/abc.m4a', 'audio/mp4'],
      ['audio/en/us/abc.wav', 'audio/wav'],
    ]);
  });

  it('stores only the WAV when there is no AAC', () => {
    const files = filesToStore({ primary: 'wav', m4a: null, wav: Buffer.from('w') }, key);
    expect(files.map((f) => f.key)).toEqual(['audio/en/us/abc.wav']);
  });
});
