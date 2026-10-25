import { GeminiEnrichmentService, IPA_INSTRUCTION } from './gemini-enrichment.service';

describe('IPA_INSTRUCTION', () => {
  it('asks for real General American IPA, not a copy of the British one', () => {
    expect(IPA_INSTRUCTION).toMatch(/ipa_us is real General American, not a copy of ipa_uk/);
    expect(IPA_INSTRUCTION).toContain('t̬');
    expect(IPA_INSTRUCTION).toContain('ɚ');
    expect(IPA_INSTRUCTION).toContain('ipa_us /ˌɪnˈev.ə.t̬ə.bəl/');
  });
});

/**
 * pcmToWav is the one pure, dependency-free piece of this service — the
 * Gemini calls themselves need the live SDK/API key and aren't covered here
 * (no Docker/network-mocking harness in this sandbox pass; flagged in the
 * session report).
 */
describe('GeminiEnrichmentService.pcmToWav', () => {
  it('produces a well-formed 44-byte RIFF/WAVE header followed by the PCM payload', () => {
    const pcm = Buffer.from([1, 2, 3, 4, 5, 6]);
    const wav = GeminiEnrichmentService.pcmToWav(pcm, 24000, 1, 16);

    expect(wav.length).toBe(44 + pcm.length);
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
    expect(wav.toString('ascii', 8, 12)).toBe('WAVE');
    expect(wav.toString('ascii', 12, 16)).toBe('fmt ');
    expect(wav.readUInt32LE(24)).toBe(24000); // sample rate
    expect(wav.readUInt16LE(22)).toBe(1); // channels
    expect(wav.readUInt16LE(34)).toBe(16); // bits per sample
    expect(wav.readUInt32LE(40)).toBe(pcm.length); // data chunk size
    expect(wav.subarray(44)).toEqual(pcm);
  });
});
