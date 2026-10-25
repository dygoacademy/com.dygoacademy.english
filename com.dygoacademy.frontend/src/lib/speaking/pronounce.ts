import { apiClient } from '@/lib/api-client';
import type { ClipSpan } from '@/hooks/usePlayer';
import type {
  SpeakingAccent,
  SpeakingCheckQueued,
  SpeakingCheckState,
  SpeakingSessionItem,
  SpeakingSyllable,
  SpeakingTimings,
  SpeakingWordCheckResult,
} from '@/types';

import {
  CHECK_POLL_MS,
  SERVER_CHECK_TIMEOUT_MS,
  SILENCE_GATE_RMS,
  SPEECH_FLOOR_MARGIN_DB,
  SPEECH_MIN_RUN_MS,
  SPEECH_PEAK_RANGE_DB,
  SPEECH_SKIP_MS,
} from './constants';
import { withTimeout } from './check';
import { stoneText } from './ipa';
import { LEARNER_PACE, meterDead } from './session';

/**
 * Pronunciation "Stepping stones" (P1–P4, P2b; plan Part 2): say one word,
 * one stone per syllable, the stressed one big. The rules and the word
 * check live here, with no audio or React, so they're unit-tested; the
 * screens draw, PronounceLive holds the mic.
 */

/** At most this many words a visit ("Bee 1 of 3"). */
export const PRON_MAX_WORDS = 3;
/** The recording stops by itself after this long (the ring round the mic). */
export const PRON_MAX_MS = 4000;
/** …or this long after the voice ends. */
export const PRON_SILENCE_MS = 1000;
/** Less voice than this: "We couldn't hear you", nothing is sent. */
export const PRON_MIN_VOICE_MS = 300;
/** The mic listens to the room this long before the beep (for "Too noisy"). */
export const PRON_ROOM_MS = 300;
/** A room at least this loud before the beep… */
export const PRON_NOISY_DBFS = -35;
/** …where the voice never rises this far above it is "Too noisy to hear". */
export const PRON_ONSET_DB = 10;
/** A syllable's length when the timings don't say (lit-stone hint). */
export const PRON_SYLLABLE_S = 0.25;
/** "Slowly" and the wobbly stone's "Hear" play the native audio at this rate (pitch kept). */
export const PRON_SLOW_RATE = 0.7;

// ── Stones ─────────────────────────────────────────────────────────────────

/** The stones for a word: its syllables, or the whole word as one big stone. */
export function wordStones(item: Pick<SpeakingSessionItem, 'word' | 'syllables'>): SpeakingSyllable[] {
  return item.syllables && item.syllables.length > 0
    ? item.syllables
    : [{ text: item.word, stressed: true }];
}

export { stoneText };

export type PondSize = 'phone' | 'ipad';

/** The pond card's drawing sizes (boards: phone 334 wide, iPad 560 × 300). */
export const POND: Record<
  PondSize,
  {
    width: number;
    /** Stone sizes: big (stressed), small (≤ 2 letters), mid; text size and baseline below the centre. */
    big: StoneSize;
    small: StoneSize;
    mid: StoneSize;
    /** Centres of three stones (the boards' own). */
    three: [number, number, number];
  }
> = {
  phone: {
    width: 334,
    big: { rx: 50, ry: 22, rise: 10, font: 24, baseline: 8, splashRy: 10 },
    small: { rx: 32, ry: 14, rise: 4, font: 16, baseline: 5, splashRy: 8 },
    mid: { rx: 40, ry: 17, rise: 6, font: 19, baseline: 6, splashRy: 9 },
    three: [62, 168, 268],
  },
  ipad: {
    width: 560,
    big: { rx: 84, ry: 34, rise: 16, font: 38, baseline: 13, splashRy: 15 },
    small: { rx: 52, ry: 22, rise: 8, font: 26, baseline: 9, splashRy: 12 },
    mid: { rx: 70, ry: 28, rise: 11, font: 30, baseline: 11, splashRy: 13 },
    three: [110, 285, 452],
  },
};

interface StoneSize {
  rx: number;
  ry: number;
  /** How far the centre sits above the water line. */
  rise: number;
  font: number;
  baseline: number;
  /** The splash ring under a lit stone (P2). */
  splashRy: number;
}

export interface Stone {
  text: string;
  stressed: boolean;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  fontSize: number;
  /** Text baseline. */
  textY: number;
  splashRy: number;
}

/** DM Sans bold advance widths (em/100) for a–z and A–Z; other letters (IPA) count as 0.62 em. */
const LOWER = [59, 65, 61, 65, 60, 37, 60, 62, 27, 27, 58, 27, 94, 62, 61, 65, 65, 41, 53, 43, 62, 56, 82, 57, 60, 49];
const UPPER = [71, 64, 74, 71, 58, 56, 78, 71, 27, 54, 65, 56, 89, 73, 78, 61, 78, 63, 60, 60, 68, 71, 102, 67, 63, 58];

/** About how wide `text` is in DM Sans at `fontSize` (no DOM, so the server draws the same stones). */
export function stoneTextWidth(text: string, fontSize: number): number {
  let em = 0;
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    em += c >= 97 && c <= 122 ? LOWER[c - 97] / 100 : c >= 65 && c <= 90 ? UPPER[c - 65] / 100 : 0.62;
  }
  return em * fontSize;
}

/**
 * Where each stone sits on water line `waterY`: the stressed one big, short
 * syllables small, the rest in between. Every stone is at least wide enough
 * for its text (A, Dylan 2026-10-18: "CONDITIONAL" ran off its stone onto
 * the dark water). Three stones sit where the boards put them when they
 * fit; otherwise the row is packed in the middle, and shrunk (stones and
 * text together) when it is wider than the card.
 */
export function layoutStones(
  syllables: readonly SpeakingSyllable[],
  size: PondSize,
  waterY: number,
): Stone[] {
  const pond = POND[size];
  const n = syllables.length;
  if (n === 0) return [];
  const texts = syllables.map(stoneText);
  const sizes = syllables.map((s, k) =>
    s.stressed ? pond.big : texts[k].length <= 2 ? pond.small : pond.mid,
  );
  // Room around the text: 0.6 of the font size on each side.
  const rxs = sizes.map((z, k) => Math.max(z.rx, stoneTextWidth(texts[k], z.font) / 2 + z.font * 0.6));
  const gap = pond.width * 0.03;
  const margin = pond.width * 0.03;
  let centres: number[] =
    n === 3
      ? [...pond.three]
      : n === 1
        ? [pond.width / 2]
        : syllables.map((_, k) => pond.width * 0.19 + (k * pond.width * 0.62) / (n - 1));
  const fits = (cs: number[], scale: number) =>
    cs[0] - rxs[0] * scale >= margin &&
    cs[n - 1] + rxs[n - 1] * scale <= pond.width - margin &&
    cs.every((c, k) => k === 0 || c - cs[k - 1] >= (rxs[k - 1] + rxs[k]) * scale + gap);
  let scale = 1;
  if (!fits(centres, 1)) {
    const row = rxs.reduce((a, r) => a + 2 * r, 0) + gap * (n - 1);
    scale = Math.min(1, (pond.width - 2 * margin - gap * (n - 1)) / (row - gap * (n - 1)));
    let x = (pond.width - (row - gap * (n - 1)) * scale - gap * (n - 1)) / 2;
    centres = rxs.map((r) => {
      const c = x + r * scale;
      x += 2 * r * scale + gap;
      return c;
    });
  }
  return syllables.map((s, k) => {
    const z = sizes[k];
    const cy = waterY - z.rise * scale;
    return {
      text: texts[k],
      stressed: s.stressed,
      cx: Math.round(centres[k] * 10) / 10,
      cy,
      rx: Math.round(rxs[k] * scale * 10) / 10,
      ry: z.ry * scale,
      fontSize: Math.round(z.font * scale),
      textY: cy + z.baseline * scale,
      splashRy: z.splashRy * scale,
    };
  });
}

/**
 * The tip under the pond as parts: land hard on the stressed stone, light
 * on the one after it, then the rest ("land hard on MI, light on ti, then
 * gate"). Stones before the stressed one are light.
 */
export function hopParts(
  syllables: readonly SpeakingSyllable[],
): { kind: 'hard' | 'light' | 'then'; text: string }[] {
  return syllables.map((s, k) => ({
    kind: s.stressed ? 'hard' : k === 0 || syllables[k - 1].stressed ? 'light' : 'then',
    text: stoneText(s),
  }));
}

/** The big stone's text ("MI"), for "Start with the big stone: MI". */
export function bigStone(syllables: readonly SpeakingSyllable[]): string {
  const s = syllables.find((x) => x.stressed) ?? syllables[0];
  return s ? stoneText(s) : '';
}

// ── Recording (P2) ─────────────────────────────────────────────────────────

const bars = (ms: number, barsPerSecond: number) =>
  Math.max(1, Math.ceil((ms / 1000) * barsPerSecond));

/**
 * The voice in the live mic bars (RMS, `barsPerSecond` a second, since the
 * recording started), gated the way The Pond's auto-stop is: skip the tap
 * click, gate from the room's noise and the loudest bar, and only runs of
 * SPEECH_MIN_RUN_MS count. `voicedMs`: voice so far; `quietMs`: since the
 * last voice; `peak`: the loudest bar.
 */
export function voiceIn(
  levels: readonly number[],
  barsPerSecond: number,
): { heard: boolean; voicedMs: number; quietMs: number; peak: number } {
  const msPerBar = 1000 / barsPerSecond;
  const body = levels.slice(bars(SPEECH_SKIP_MS, barsPerSecond));
  const minRun = bars(SPEECH_MIN_RUN_MS, barsPerSecond);
  const peak = body.reduce((m, v) => Math.max(m, v), 0);
  if (body.length < minRun) return { heard: false, voicedMs: 0, quietMs: 0, peak };
  const sorted = [...body].sort((a, b) => a - b);
  const gate = Math.max(
    SILENCE_GATE_RMS,
    sorted[Math.floor(0.05 * (sorted.length - 1))] * 10 ** (SPEECH_FLOOR_MARGIN_DB / 20),
    peak * 10 ** (-SPEECH_PEAK_RANGE_DB / 20),
  );
  let run = 0;
  let voiced = 0;
  let lastLoud = -1;
  body.forEach((v, i) => {
    if (v >= gate) {
      run += 1;
      if (run === minRun) voiced += minRun;
      else if (run > minRun) voiced += 1;
      if (run >= minRun) lastLoud = i;
    } else {
      run = 0;
    }
  });
  const heard = voiced > 0;
  return {
    heard,
    voicedMs: voiced * msPerBar,
    quietMs: heard ? (body.length - 1 - lastLoud) * msPerBar : 0,
    peak,
  };
}

/** True once the learner has spoken and then been quiet for PRON_SILENCE_MS. */
export function pronVoiceEnded(levels: readonly number[], barsPerSecond: number): boolean {
  const v = voiceIn(levels, barsPerSecond);
  return v.heard && v.quietMs >= PRON_SILENCE_MS;
}

/**
 * How many stones are lit (a live hint, not the score): none before the
 * voice; then stone k+1 once the voice passes k/n of the native word's
 * length (`wordS`, else PRON_SYLLABLE_S a syllable).
 */
export function litStones(voicedMs: number, n: number, wordS: number | null): number {
  if (voicedMs <= 0 || n <= 0) return 0;
  const per = ((wordS && wordS > 0 ? wordS : PRON_SYLLABLE_S * n) * 1000) / n;
  return Math.min(n, Math.floor(voicedMs / per) + 1);
}

/**
 * A finished take that isn't worth sending (P2b, no server call): `noisy`
 * when the room was already loud before the beep and the voice never rose
 * clearly above it; `quiet` when there was less than PRON_MIN_VOICE_MS of
 * voice. A dead meter (exact zeros: iOS with the silent switch) can't
 * judge, so the take is sent and the server decides.
 */
export function unusableTake(
  levels: readonly number[],
  roomLevels: readonly number[],
  barsPerSecond: number,
): 'quiet' | 'noisy' | null {
  if (meterDead(levels, barsPerSecond)) return null;
  const v = voiceIn(levels, barsPerSecond);
  const room = [...roomLevels].sort((a, b) => a - b)[Math.floor(roomLevels.length / 2)] ?? 0;
  if (room >= 10 ** (PRON_NOISY_DBFS / 20) && v.peak < room * 10 ** (PRON_ONSET_DB / 20)) {
    return 'noisy';
  }
  return v.voicedMs < PRON_MIN_VOICE_MS ? 'quiet' : null;
}

// ── Native audio ───────────────────────────────────────────────────────────

/** The speaking rate a sentence clip was made at (1 for older clips). */
const madeAt = (timings: SpeakingTimings | null | undefined): number =>
  timings?.speaking_rate && timings.speaking_rate > 0 ? timings.speaking_rate : 1;

/** The accent's sentence clip and timings, each falling back to the other accent. */
function clipFor(item: SpeakingSessionItem, accent: SpeakingAccent) {
  const uk = accent === 'UK';
  return {
    url: uk ? (item.audio_uk_url ?? item.audio_us_url) : (item.audio_us_url ?? item.audio_uk_url),
    timings: uk ? (item.timings_uk ?? item.timings_us) : (item.timings_us ?? item.timings_uk),
  };
}

/**
 * A native clip to play. A span of the sentence clip says the speaking rate
 * the clip was made at (`madeAt`); the word clip has none and plays like the
 * flashcard's.
 */
export interface NativeClip {
  src: string;
  span?: ClipSpan;
  madeAt?: number;
}

/**
 * The player rate for `clip` asked at `rate`: a span of the sentence clip is
 * never quicker than the learner pace, and a slow rate (PRON_SLOW_RATE) is
 * that rate of the voice's own pace, whatever pace the clip was made at.
 */
export function nativeClipRate(clip: NativeClip, rate = 1): number {
  if (clip.madeAt === undefined) return rate;
  return Math.min(1, Math.min(rate, LEARNER_PACE) / clip.madeAt);
}

/**
 * "Hear it": the word said on its own in the accent when there is a
 * recording of it (else the other accent's), else the word's part of the
 * sentence clip (its timings). Null when neither exists.
 */
export function nativeWord(item: SpeakingSessionItem, accent: SpeakingAccent): NativeClip | null {
  const word =
    accent === 'UK'
      ? (item.word_audio_url_uk ?? item.word_audio_url)
      : (item.word_audio_url ?? item.word_audio_url_uk);
  if (word) return { src: word };
  const { url, timings } = clipFor(item, accent);
  const w = timings?.words[item.target_index];
  if (!url || !w) return null;
  return { src: url, span: { start: w.start, end: w.end }, madeAt: madeAt(timings) };
}

/**
 * The native word's length in seconds at the voice's own pace (the lit-stone
 * hint), when the timings have it. A clip made slower for learners
 * (`speaking_rate`) is scaled back, so the hint doesn't ask for slow speech.
 */
export function nativeWordSeconds(item: SpeakingSessionItem, accent: SpeakingAccent): number | null {
  const { timings } = clipFor(item, accent);
  const w = timings?.words[item.target_index];
  return w && w.end > w.start ? (w.end - w.start) * madeAt(timings) : null;
}

/**
 * Hear "ti": syllable `index` of the target word in the sentence clip,
 * when the timings have its syllables; else the whole native word.
 */
export function nativeSyllable(
  item: SpeakingSessionItem,
  accent: SpeakingAccent,
  index: number,
): NativeClip | null {
  const { url, timings } = clipFor(item, accent);
  const parts = timings?.words[item.target_index]?.syllables;
  // Timings split by the IPA's stress marks can count fewer syllables than
  // the stones (conditional: 2 vs 4); then the whole word, not a wrong part.
  const s = parts && parts.length === wordStones(item).length ? parts[index] : undefined;
  if (url && s && s.end > s.start) {
    return { src: url, span: { start: s.start, end: s.end }, madeAt: madeAt(timings) };
  }
  return nativeWord(item, accent);
}

// ── Compare your voice (P4) ────────────────────────────────────────────────

/**
 * The voice in `levels` (RMS bars, `barsPerSecond` a second), first to last
 * bar within SPEECH_PEAK_RANGE_DB of the loudest, for the P4 compare
 * waveforms: the take's trailing silence (auto-stop waits PRON_SILENCE_MS)
 * and a clip's quiet ends don't count. `skipMs` drops the tap click of a
 * take. Empty when there's no voice.
 */
export function voicedBars(levels: readonly number[], barsPerSecond: number, skipMs = 0): number[] {
  const body = levels.slice(skipMs > 0 ? bars(skipMs, barsPerSecond) : 0);
  const peak = body.reduce((m, v) => Math.max(m, v), 0);
  const gate = Math.max(SILENCE_GATE_RMS, peak * 10 ** (-SPEECH_PEAK_RANGE_DB / 20));
  const first = body.findIndex((v) => v >= gate);
  if (peak < SILENCE_GATE_RMS || first < 0) return [];
  let last = body.length - 1;
  while (last > first && body[last] < gate) last -= 1;
  return body.slice(first, last + 1);
}

/**
 * Each stone's share of the word (sums to 1), for the compare card's
 * syllable row and the wobbly band on "You": the native syllable timings
 * when they split the word into the same stones, else by letters.
 */
export function stoneShares(
  stones: readonly SpeakingSyllable[],
  item: SpeakingSessionItem,
  accent: SpeakingAccent,
): number[] {
  const parts = clipFor(item, accent).timings?.words[item.target_index]?.syllables;
  const lengths =
    parts && parts.length === stones.length && parts.every((s) => s.end > s.start)
      ? parts.map((s) => s.end - s.start)
      : stones.map((s) => Math.max(1, stoneText(s).length));
  const total = lengths.reduce((a, b) => a + b, 0);
  return lengths.map((l) => l / total);
}

// ── Result (P4) ────────────────────────────────────────────────────────────

/** What P4 shows for a check. */
export interface PronResultView {
  passed: boolean;
  stones: SpeakingSyllable[];
  wobbly: boolean[];
  /** The first wobbly stone: its text, what it sounded like (null: not clear) and the native IPA. */
  first: { index: number; text: string; heardIpa: string | null; ipa: string } | null;
}

/**
 * P4 for a check of a word with `stones`: the word's own stones when the
 * scorer split it the same way, else the check's spelling, else its IPA
 * syllables. A pass shows every stone green. A miss with no stone under
 * the wobbly line still shows one: the lowest-scoring, so the learner
 * always knows which part to work on.
 */
export function resultView(
  stones: readonly SpeakingSyllable[],
  result: Pick<SpeakingWordCheckResult, 'passed' | 'syllables' | 'spelling'>,
): PronResultView {
  const scored = result.syllables;
  const shown: SpeakingSyllable[] =
    scored.length === 0 || stones.length === scored.length
      ? [...stones]
      : result.spelling.length === scored.length
        ? result.spelling
        : scored.map((s, k) => ({ text: s.ipa, stressed: k === 0 }));
  if (result.passed || scored.length === 0) {
    return { passed: result.passed, stones: shown, wobbly: shown.map(() => false), first: null };
  }
  let wobbly = scored.map((s) => s.wobbly);
  if (!wobbly.some(Boolean)) {
    const low = scored.reduce((m, s, k) => (s.score < scored[m].score ? k : m), 0);
    wobbly = scored.map((_, k) => k === low);
  }
  const index = wobbly.indexOf(true);
  return {
    passed: false,
    stones: shown,
    wobbly,
    first: {
      index,
      text: stoneText(shown[index]),
      heardIpa: scored[index].heard_ipa,
      ipa: scored[index].ipa,
    },
  };
}

// ── Word check (P3) ────────────────────────────────────────────────────────

/**
 * Sends the take as recorded (m4a on iPhone, webm on Chrome) to `POST
 * /speaking/check-pronunciation`, then asks `GET /speaking/check/:id` every
 * CHECK_POLL_MS until it's done. Rejects (→ P3's "Check again / Record
 * again" card) when the server is busy (503), the check fails, on any
 * other API error, or after SERVER_CHECK_TIMEOUT_MS.
 */
export async function wordCheck(
  req: { recording: Blob; topicWordId: string; accent: SpeakingAccent },
  opts: { pollMs?: number; timeoutMs?: number } = {},
): Promise<SpeakingWordCheckResult> {
  const form = new FormData();
  const ext = req.recording.type.includes('webm')
    ? 'webm'
    : req.recording.type.includes('wav')
      ? 'wav'
      : 'm4a';
  form.append('audio', req.recording, `word.${ext}`);
  form.append('topic_word_id', req.topicWordId);
  form.append('accent', req.accent);
  const pollMs = opts.pollMs ?? CHECK_POLL_MS;
  let stopped = false;
  const work = async (): Promise<SpeakingWordCheckResult> => {
    const queued = await apiClient.upload<SpeakingCheckQueued>('/speaking/check-pronunciation', form);
    while (!stopped) {
      await new Promise((resolve) => setTimeout(resolve, pollMs));
      if (stopped) break;
      const state = await apiClient.get<SpeakingCheckState<SpeakingWordCheckResult>>(
        `/speaking/check/${queued.check_id}`,
      );
      if (state.status === 'done' && state.result) return state.result;
      if (state.status === 'failed') throw new Error(`check failed: ${state.reason ?? 'unknown'}`);
    }
    throw new Error('check timed out');
  };
  return withTimeout(work(), opts.timeoutMs ?? SERVER_CHECK_TIMEOUT_MS).finally(() => {
    stopped = true;
  });
}
