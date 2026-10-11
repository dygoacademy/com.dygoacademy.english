/**
 * Phase 13 T2: pure helpers that turn a sentence + native clip into the
 * `speaking_items.timings_*` JSON (handover §2.1):
 *
 *   { duration, words: [{ text, start, end, syllables: [{ start, end, stressed }] }] }
 *
 * Word starts come from the TTS provider (Google Cloud TTS `<mark>`
 * timepoints, decision D1 = B) or, for the local fixture, from clips
 * spoken one word at a time. Word ends are the next word's start pulled
 * back over trailing silence, measured on the PCM. Syllables are only filled
 * for the target word: count and stress from its IPA, boundaries split
 * evenly inside the word (v1, handover §2.1).
 *
 * No I/O here, so it's unit-tested and shared by the content script
 * (`scripts/speaking-generate.ts`).
 */

export type SpeakingAccent = 'UK' | 'US';

export interface SyllableTiming {
  start: number;
  end: number;
  stressed: boolean;
}

export interface WordTiming {
  text: string;
  start: number;
  end: number;
  syllables: SyllableTiming[];
}

export interface SpeakingTimings {
  duration: number;
  words: WordTiming[];
  /**
   * The TTS speaking rate the clip was made at (1 = the voice's own pace).
   * Missing on older clips; the app slows those in the player instead.
   */
  speaking_rate?: number;
}

/** Decoded 16-bit PCM (mono or first channel of interleaved). */
export interface PcmClip {
  samples: Int16Array;
  sampleRate: number;
}

/** Below this RMS (−40 dBFS) a 10 ms frame counts as silence when trimming word edges. */
export const SILENCE_RMS = 0.01;
/** A trimmed word never gets shorter than this (s). */
export const MIN_WORD_SECONDS = 0.04;
const FRAME_SECONDS = 0.01;

/** Sentence tokens = whitespace-separated, punctuation kept (what the UI shows). */
export function tokenize(sentence: string): string[] {
  return sentence.trim().split(/\s+/).filter(Boolean);
}

/** Lower-case letters/apostrophes only: "Mitigate," → "mitigate". */
export function cleanToken(token: string): string {
  return token
    .toLowerCase()
    .replace(/[^a-z']/g, '')
    .replace(/^'+|'+$/g, '');
}

/** The word itself or an inflection: the word (or the word minus a final "e") plus ≤ 4 letters. */
function isInflectionOf(token: string, target: string): boolean {
  const stem = target.endsWith('e') ? target.slice(0, -1) : target;
  return (token.startsWith(target) || token.startsWith(stem)) && token.length - stem.length <= 4;
}

/**
 * Index of the target word in `tokens`, or -1. Matches the word itself, then
 * an inflection ("droughts", "mitigated", "deteriorating": the word, or the
 * word minus a final "e", followed by a short suffix).
 *
 * A multi-word entry ("food court", "french beans") matches its tokens in a
 * row, the last one possibly inflected, and returns the first token's index:
 * the phrase's first word is the target (phase 13 notes, S0 default).
 */
export function findTargetIndex(tokens: string[], word: string): number {
  const cleaned = tokens.map(cleanToken);
  const parts = word.toLowerCase().trim().split(/\s+/).map(cleanToken).filter(Boolean);
  if (parts.length === 0) return -1;
  if (parts.length > 1) {
    const last = parts.length - 1;
    return cleaned.findIndex((_, i) =>
      parts.every((p, k) => {
        const t = cleaned[i + k];
        if (t === undefined) return false;
        return k < last ? t === p : isInflectionOf(t, p);
      }),
    );
  }
  const target = parts[0];
  const exact = cleaned.indexOf(target);
  if (exact >= 0) return exact;
  return cleaned.findIndex((t) => isInflectionOf(t, target));
}

/**
 * The IPA used for the target's syllables. For a multi-word entry that's the
 * first word of the IPA ("/ˈfuːd ˌkɔːrt/" → "/ˈfuːd/"); if that word has no
 * primary stress, its secondary stress (or else its first syllable) is
 * promoted, so the target always has a stressed syllable.
 */
export function targetIpaFor(word: string, ipa: string | null | undefined): string | null {
  if (!ipa) return null;
  if (!/\s/.test(word.trim())) return ipa;
  const core = ipa
    .trim()
    .replace(/^[/[]+|[/\]]+$/g, '')
    .split(/[,;]/)[0]
    .trim();
  let first = core.split(/\s+/)[0] ?? '';
  if (!first) return null;
  if (!first.includes('ˈ')) first = first.includes('ˌ') ? first.replace('ˌ', 'ˈ') : `ˈ${first}`;
  return `/${first}/`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Mark name before token i, and after the last token. */
export const markName = (i: number) => `w${i}`;
export const END_MARK = 'end';

/** SSML with a `<mark>` before every token and one at the end. */
export function buildSsml(tokens: string[]): string {
  const body = tokens.map((t, i) => `<mark name="${markName(i)}"/>${escapeXml(t)}`).join(' ');
  return `<speak>${body}<mark name="${END_MARK}"/></speak>`;
}

/**
 * Turns `[{ markName, timeSeconds }]` into one start per token plus the end
 * mark time. Throws if a token's mark is missing (the clip can't be timed).
 */
export function startsFromTimepoints(
  tokenCount: number,
  timepoints: { markName: string; timeSeconds?: number }[],
): { starts: number[]; end: number | null } {
  const byName = new Map(timepoints.map((tp) => [tp.markName, tp.timeSeconds ?? 0]));
  const starts: number[] = [];
  for (let i = 0; i < tokenCount; i++) {
    const t = byName.get(markName(i));
    if (t === undefined) throw new Error(`no timepoint for mark ${markName(i)}`);
    starts.push(t);
  }
  const end = byName.get(END_MARK);
  return { starts, end: end === undefined ? null : end };
}

/**
 * Syllables of an IPA transcription: split on "." and before stress marks.
 * "/ˈmɪt.ɪ.ɡeɪt/" → [stressed, -, -]; "/ˌbaɪ.oʊ.daɪˈvɜːr.sə.ti/" → 6, the
 * 4th stressed. Secondary stress (ˌ) doesn't count as stressed. With no
 * primary stress mark and one syllable, that syllable is stressed.
 */
export function ipaSyllables(ipa: string | null | undefined): { stressed: boolean }[] {
  if (!ipa) return [];
  const core = ipa
    .trim()
    .replace(/^[/[]+|[/\]]+$/g, '')
    .split(/[,;]/)[0]
    .trim();
  if (!core) return [];
  const parts = core
    .split('.')
    .flatMap((chunk) => chunk.split(/(?=[ˈˌ])/))
    .map((p) => p.trim())
    .filter((p) => p.replace(/[ˈˌ]/g, '').length > 0);
  const out = parts.map((p) => ({ stressed: p.startsWith('ˈ') }));
  if (out.length === 1 && !out[0].stressed) out[0].stressed = true;
  return out;
}

/** RMS (0..1) of samples [from, to). */
function rms(samples: Int16Array, from: number, to: number): number {
  const a = Math.max(0, from);
  const b = Math.min(samples.length, to);
  if (b <= a) return 0;
  let sum = 0;
  for (let i = a; i < b; i++) {
    const v = samples[i] / 32768;
    sum += v * v;
  }
  return Math.sqrt(sum / (b - a));
}

/**
 * Pulls [start, end] in over leading/trailing silence, 10 ms at a time,
 * keeping at least MIN_WORD_SECONDS. Returns the input unchanged when the
 * whole range is silent.
 */
export function trimSilence(
  clip: PcmClip,
  start: number,
  end: number,
): { start: number; end: number } {
  const frame = Math.max(1, Math.round(FRAME_SECONDS * clip.sampleRate));
  const toSample = (s: number) => Math.round(s * clip.sampleRate);
  let a = toSample(start);
  let b = toSample(end);
  const min = Math.round(MIN_WORD_SECONDS * clip.sampleRate);
  while (b - a > min && rms(clip.samples, b - frame, b) < SILENCE_RMS) b -= frame;
  while (b - a > min && rms(clip.samples, a, a + frame) < SILENCE_RMS) a += frame;
  if (rms(clip.samples, a, b) < SILENCE_RMS) return { start, end };
  return { start: a / clip.sampleRate, end: b / clip.sampleRate };
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Builds the timings JSON. `starts[i]` is token i's start (s); a word ends
 * where the next starts (or at `end` / the clip's end), then both edges are
 * trimmed over silence. The target word gets IPA syllables split evenly.
 */
export function buildTimings(input: {
  tokens: string[];
  starts: number[];
  end?: number | null;
  clip: PcmClip;
  targetIndex: number;
  targetIpa: string | null | undefined;
}): SpeakingTimings {
  const { tokens, starts, clip, targetIndex } = input;
  if (starts.length !== tokens.length) {
    throw new Error(`expected ${tokens.length} word starts, got ${starts.length}`);
  }
  const duration = clip.samples.length / clip.sampleRate;
  const lastEnd = Math.min(duration, input.end ?? duration);
  const words: WordTiming[] = tokens.map((text, i) => {
    const rawStart = Math.min(starts[i], duration);
    const rawEnd = Math.max(
      rawStart,
      Math.min(i + 1 < starts.length ? starts[i + 1] : lastEnd, duration),
    );
    const { start, end } = trimSilence(clip, rawStart, rawEnd);
    let syllables: SyllableTiming[] = [];
    if (i === targetIndex) {
      const syl = ipaSyllables(input.targetIpa);
      const step = (end - start) / Math.max(1, syl.length);
      syllables = syl.map((s, k) => ({
        start: round3(start + k * step),
        end: round3(k === syl.length - 1 ? end : start + (k + 1) * step),
        stressed: s.stressed,
      }));
    }
    return { text, start: round3(start), end: round3(end), syllables };
  });
  return { duration: round3(duration), words };
}

/**
 * Full shape check (the database only checks the outer shape). Returns a
 * list of problems; empty = valid. `tokenCount` / `targetIndex` also check
 * that the timings match the item.
 */
export function validateTimings(
  value: unknown,
  expect?: { tokenCount?: number; targetIndex?: number },
): string[] {
  const errors: string[] = [];
  const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return ['timings: not an object'];
  const t = value as Record<string, unknown>;
  if (!isNum(t.duration) || t.duration === 0) errors.push('duration: must be a positive number');
  if (!Array.isArray(t.words)) return [...errors, 'words: not an array'];
  const duration = isNum(t.duration) ? t.duration : Infinity;
  let prevStart = -1;
  t.words.forEach((w, i) => {
    const at = `words[${i}]`;
    if (typeof w !== 'object' || w === null) return errors.push(`${at}: not an object`);
    const word = w as Record<string, unknown>;
    if (typeof word.text !== 'string' || !word.text) errors.push(`${at}.text: empty`);
    if (!isNum(word.start) || !isNum(word.end))
      return errors.push(`${at}: start/end must be numbers >= 0`);
    if (word.end < word.start) errors.push(`${at}: end before start`);
    if (word.end > duration + 0.001) errors.push(`${at}: ends after the clip`);
    if (word.start < prevStart) errors.push(`${at}: starts before the previous word`);
    prevStart = word.start;
    if (!Array.isArray(word.syllables)) return errors.push(`${at}.syllables: not an array`);
    word.syllables.forEach((s, k) => {
      const sy = s as Record<string, unknown>;
      if (!isNum(sy?.start) || !isNum(sy?.end) || typeof sy?.stressed !== 'boolean') {
        errors.push(`${at}.syllables[${k}]: needs start, end, stressed`);
      } else if (
        sy.start < (word.start as number) - 0.001 ||
        sy.end > (word.end as number) + 0.001
      ) {
        errors.push(`${at}.syllables[${k}]: outside the word`);
      }
    });
  });
  if (expect?.tokenCount !== undefined && t.words.length !== expect.tokenCount) {
    errors.push(`words: expected ${expect.tokenCount}, got ${t.words.length}`);
  }
  if (expect?.targetIndex !== undefined) {
    const target = t.words[expect.targetIndex] as WordTiming | undefined;
    if (!target) errors.push(`target word ${expect.targetIndex}: missing`);
    else if (!target.syllables?.length)
      errors.push(`target word ${expect.targetIndex}: no syllables`);
    else if (!target.syllables.some((s) => s.stressed))
      errors.push(`target word ${expect.targetIndex}: no stressed syllable`);
  }
  return errors;
}

/**
 * Reads a PCM WAV (Google's LINEAR16 output carries a WAV header; so does
 * macOS `say --data-format=LEI16`). 16-bit only; keeps the first channel.
 */
export function parseWav(buf: Buffer): PcmClip {
  if (
    buf.length < 12 ||
    buf.toString('ascii', 0, 4) !== 'RIFF' ||
    buf.toString('ascii', 8, 12) !== 'WAVE'
  ) {
    throw new Error('not a WAV file');
  }
  let offset = 12;
  let sampleRate = 0;
  let channels = 1;
  let bits = 0;
  while (offset + 8 <= buf.length) {
    const id = buf.toString('ascii', offset, offset + 4);
    let size = buf.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === 'fmt ') {
      channels = buf.readUInt16LE(body + 2);
      sampleRate = buf.readUInt32LE(body + 4);
      bits = buf.readUInt16LE(body + 14);
    } else if (id === 'data') {
      if (bits !== 16) throw new Error(`expected 16-bit PCM, got ${bits}-bit`);
      // Streaming encoders may write 0 / 0xFFFFFFFF as the data size.
      if (size === 0 || body + size > buf.length) size = buf.length - body;
      const frames = Math.floor(size / (2 * channels));
      const samples = new Int16Array(frames);
      for (let i = 0; i < frames; i++) samples[i] = buf.readInt16LE(body + i * 2 * channels);
      return { samples, sampleRate };
    }
    offset = body + size + (size % 2);
  }
  throw new Error('WAV has no data chunk');
}

/** Wraps mono 16-bit PCM in a WAV container. */
export function encodeWav(clip: PcmClip): Buffer {
  const data = Buffer.alloc(clip.samples.length * 2);
  clip.samples.forEach((v, i) => data.writeInt16LE(v, i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(clip.sampleRate, 24);
  header.writeUInt32LE(clip.sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}
