import { GoogleWordTtsService, markedWordSsml, voicedSpan } from './google-word-tts.service';
import { PronDataService, pronDataUpdate, type PronDataRow } from './pron-data.service';
import { StorageService } from '../storage/storage.service';

jest.mock('../storage/audio-encode', () => ({
  encodeForWeb: jest.fn().mockResolvedValue({ primary: 'm4a', m4a: Buffer.from('m4a'), wav: null }),
  filesToStore: (_a: unknown, key: (e: string) => string) => [
    { key: key('m4a'), body: Buffer.from('m4a'), contentType: 'audio/mp4' },
  ],
}));

/** A 24 kHz mono 16-bit WAV: silence, a tone from `from` to `to` seconds, silence to `len`. */
function wav(from: number, to: number, len = 1): Buffer {
  const rate = 24000;
  const n = Math.round(len * rate);
  const b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0, 'ascii');
  b.writeUInt32LE(36 + n * 2, 4);
  b.write('WAVEfmt ', 8, 'ascii');
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36, 'ascii');
  b.writeUInt32LE(n * 2, 40);
  for (let i = Math.round(from * rate); i < Math.round(to * rate); i++)
    b.writeInt16LE(8000, 44 + i * 2);
  return b;
}

describe('voicedSpan', () => {
  it('first to last loud sample, in seconds', () => {
    const v = voicedSpan(wav(0.1, 0.5));
    expect(v?.start).toBeCloseTo(0.1, 3);
    expect(v?.end).toBeCloseTo(0.5, 3);
    expect(voicedSpan(wav(0, 0))).toBeNull();
    expect(voicedSpan(Buffer.from('not a wav'))).toBeNull();
  });
});

describe('markedWordSsml', () => {
  it('one phoneme per stone with a mark before each and at the end', () => {
    expect(markedWordSsml(['mi', 'ti'], ['ˈmɪ', 'tɪ'])).toBe(
      '<speak><mark name="s0"/><phoneme alphabet="ipa" ph="ˈmɪ">mi</phoneme><mark name="s1"/><phoneme alphabet="ipa" ph="tɪ">ti</phoneme><mark name="end"/></speak>',
    );
    expect(markedWordSsml(['mi'], [''])).toBeNull();
  });
});

describe('PronDataService', () => {
  const row: PronDataRow = {
    id: 'lex-1',
    normalized_word: 'mitigate',
    language_code: 'en',
    ipa_us: '/ˈmɪt̬.ə.ɡeɪt/',
    ipa_uk: '/ˈmɪt.ɪ.ɡeɪt/',
    audio_url_us: 'https://media.test/audio/en/us/a.m4a',
    audio_url_uk: 'https://media.test/audio/en/uk/b.m4a',
  };

  function make(configured = true) {
    const tts = {
      isConfigured: () => configured,
      synthesizeWord: jest.fn().mockResolvedValue(wav(0.03, 0.8)),
      synthesizeMarked: jest.fn().mockResolvedValue({
        wav: wav(0.03, 1.018, 1.3),
        marks: { s0: 0.015, s1: 0.26, s2: 0.55, end: 1.27 },
      }),
    };
    const storage = {
      keyForUrl: (u: string) => u.replace('https://media.test/', ''),
      getObject: jest.fn().mockResolvedValue(wav(0.031, 0.8)),
      hasObject: jest.fn().mockResolvedValue(false),
      upload: jest.fn((key: string) => Promise.resolve(`https://media.test/${key}`)),
      publicUrlFor: (k: string) => `https://media.test/${k}`,
    };
    const svc = new PronDataService(
      tts as unknown as GoogleWordTtsService,
      storage as unknown as StorageService,
    );
    return { svc, tts, storage };
  }

  it('stones per accent with spans in the word clip (read from its .wav copy), slow clips, the tip', async () => {
    const { svc, tts, storage } = make();
    const d = await svc.make(row);
    expect(storage.getObject).toHaveBeenCalledWith('audio/en/us/a.wav');
    expect(tts.synthesizeWord).toHaveBeenCalledWith('mitigate', row.ipa_us, 'US', 0.7); // slow clip only
    expect(d.syllables_us?.map((s) => s.text)).toEqual(['mi', 'ti', 'gate']);
    expect(d.syllables_us?.[0]).toMatchObject({ stressed: true, start_ms: 31, end_ms: 210 });
    expect(d.syllables_us?.[2].end_ms).toBe(800);
    expect(d.syllables_uk).toHaveLength(3);
    expect(d.audio_slow_url_us).toMatch(/^https:\/\/media\.test\/audio\/en\/us\/.+\.m4a$/);
    expect(d.audio_slow_url_uk).toMatch(/\/uk\//);
    expect(d.pron_tip?.['en-US']).toContain('<b>MI</b>');
  });

  it('reuses a slow clip already in storage (no TTS)', async () => {
    const { svc, tts, storage } = make();
    storage.hasObject.mockResolvedValue(true);
    await svc.make(row);
    expect(tts.synthesizeWord).not.toHaveBeenCalled();
  });

  it('no stones: syllables null (the word is blocked), still a slow clip', async () => {
    const { svc } = make();
    const d = await svc.make({
      ...row,
      normalized_word: 'flat tyre',
      ipa_us: '/flæt ˈtaɪɚ/',
      ipa_uk: '/flæt ˈtaɪə/',
    });
    expect(d.syllables_us).toBeNull();
    expect(d.syllables_uk).toBeNull();
    expect(d.pron_tip).toBeNull();
    expect(d.audio_slow_url_us).not.toBeNull();
  });

  it('without Google TTS: US stones without spans, no UK, no slow clip', async () => {
    const { svc, tts } = make(false);
    const d = await svc.make(row);
    expect(d.syllables_us?.every((s) => s.start_ms === null)).toBe(true);
    expect(d.syllables_uk).toBeNull();
    expect(d.audio_slow_url_us).toBeNull();
    expect(tts.synthesizeMarked).not.toHaveBeenCalled();
  });

  it('writes the row, keeping slow clips it did not make', () => {
    const u = pronDataUpdate('lex-1', {
      syllables_us: null,
      syllables_uk: null,
      pron_tip: null,
      audio_slow_url_us: null,
      audio_slow_url_uk: null,
    });
    expect(u.text).toMatch(/audio_slow_url_us = coalesce\(\$5, audio_slow_url_us\)/);
    expect(u.params).toEqual(['lex-1', null, null, null, null, null]);
  });
});
