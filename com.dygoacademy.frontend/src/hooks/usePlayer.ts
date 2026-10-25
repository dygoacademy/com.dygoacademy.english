'use client';

import { useCallback, useSyncExternalStore } from 'react';

import { getMicGeneration, prepareForPlayback } from '@/lib/speaking/audio';
import { makeSlowClip, readySlowClip } from '@/lib/speaking/slow-clip';

/**
 * One audio player for the whole app (Phase 13 T3, handover §4): playing a
 * clip stops whatever was playing, so the native clip and the learner's
 * recording never overlap. Works for media URLs and `blob:` URLs of a
 * recording. 0.75× is `playbackRate` (pitch kept). A `span` plays only
 * part of a clip (Pronunciation: one word or syllable of a sentence clip).
 */
export const PLAYER_RATES = [1, 0.75] as const;
export type PlayerRate = (typeof PLAYER_RATES)[number];

/** Part of a clip, in seconds from its start. */
export interface ClipSpan {
  start: number;
  end: number;
}

const isPlayerRate = (rate: number): rate is PlayerRate =>
  (PLAYER_RATES as readonly number[]).includes(rate);

export interface PlayerState {
  /** The clip playing now, or null. */
  src: string | null;
  rate: PlayerRate;
  /** Set when the last play failed (file missing, blocked, can't decode). */
  error: string | null;
  /** True from a play's start until the sound actually starts (the clip loading). */
  loading: boolean;
  /**
   * Who started the last play (a SoundButton's `tag`), kept after it ends or
   * fails, so each button knows its own loading / playing / couldn't play
   * while one player keeps one sound at a time. Null when untagged.
   */
  tag: string | null;
}

let audio: HTMLAudioElement | null = null;
/** `getMicGeneration()` when `audio` was made. */
let audioMicGeneration = 0;
/** Stops a span at its end. */
let spanTimer: ReturnType<typeof setTimeout> | null = null;
let state: PlayerState = { src: null, rate: 1, error: null, loading: false, tag: null };
/** Bumped by every play and stop, so a play that was replaced or stopped stays quiet. */
let playId = 0;
const listeners = new Set<() => void>();

function set(next: Partial<PlayerState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function element(): HTMLAudioElement {
  // iPhone: an element that lived through a recording could play silently
  // afterwards (second visit to a speaking screen, Dylan's iPhone,
  // 2026-10-13). A new one after each recording plays normally.
  if (audio && audioMicGeneration !== getMicGeneration()) {
    audio.pause();
    audio.removeAttribute('src');
    audio = null;
  }
  if (!audio) {
    audioMicGeneration = getMicGeneration();
    audio = new Audio();
    audio.preload = 'auto';
    // Not 'pause': playClip pauses before switching clips, and that event
    // arrives after the new src is set. stopClip clears the state itself.
    audio.addEventListener('ended', () => set({ src: null, loading: false }));
  }
  return audio;
}

function clearSpan() {
  if (spanTimer) clearTimeout(spanTimer);
  spanTimer = null;
}

/**
 * Plays `src` at `rate`, stopping anything else; only `span` of it when
 * given. Resolves when playback starts. A rate other than PLAYER_RATES
 * (Pronunciation's "Slowly", 0.7×) plays once without changing the rate
 * The Pond remembers, from a slowed copy played at 1× (`slow-clip.ts`):
 * on iPhone a slow playbackRate played silently right after Hear it
 * (Dylan, 2026-10-18). `state.src` stays `src` while the copy plays.
 */
export async function playClip(
  src: string,
  rate: number = state.rate,
  span?: ClipSpan,
  tag: string | null = null,
): Promise<void> {
  // Not recording: speaker, and through the silent switch (iOS).
  prepareForPlayback();
  const el = element();
  const id = ++playId;
  el.pause();
  el.muted = false;
  clearSpan();
  set({ src, rate: isPlayerRate(rate) ? rate : state.rate, error: null, loading: true, tag });
  if (isPlayerRate(rate) || rate >= 1) return start(el, id, src, src, rate, span);

  const ready = readySlowClip(src, rate, span);
  if (ready) return start(el, id, src, ready, 1);
  // Not made yet: start the element muted inside this tap, so iOS still
  // lets it play once the copy is ready (after the tap has ended).
  if (el.src !== src) el.src = src;
  el.muted = true;
  el.play().catch(() => {});
  let url: string | null = null;
  try {
    url = await makeSlowClip(src, rate, span);
  } catch {
    // Can't fetch or decode it here: the element's playbackRate instead.
  }
  if (id !== playId) return;
  el.pause();
  el.muted = false;
  return url ? start(el, id, src, url, 1) : start(el, id, src, src, rate, span);
}

/** Plays `playSrc` for the play `id` of `src` (what `state.src` shows). */
async function start(
  el: HTMLAudioElement,
  id: number,
  src: string,
  playSrc: string,
  rate: number,
  span?: ClipSpan,
): Promise<void> {
  if (el.src !== playSrc) el.src = playSrc;
  // Where to start and how fast. Safari can drop a seek made before the
  // clip's metadata has loaded, and resets playbackRate to
  // defaultPlaybackRate when the clip loads, so "Slowly" played the
  // sentence's start, or at 1× (Dylan's iPhone, 2026-10-18). Set both
  // now, again once the metadata is in, and the rate once more when the
  // sound starts.
  const place = () => {
    el.defaultPlaybackRate = rate;
    el.playbackRate = rate;
    (el as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;
    el.currentTime = span ? span.start : 0;
  };
  place();
  if (el.readyState < HTMLMediaElement.HAVE_METADATA) {
    el.addEventListener('loadedmetadata', () => id === playId && place(), { once: true });
  }
  try {
    await el.play();
  } catch (err) {
    // A newer tap or a stop interrupted this play (AbortError): not a failure.
    if (id !== playId) return;
    set({ src: null, loading: false, error: (err as Error)?.message ?? 'play failed' });
    throw err;
  }
  if (id !== playId) return;
  if (el.playbackRate !== rate) el.playbackRate = rate;
  set({ loading: false });
  if (span) {
    spanTimer = setTimeout(
      () => {
        spanTimer = null;
        if (state.src === src) stopClip();
      },
      (Math.max(0, span.end - span.start) * 1000) / rate,
    );
  }
}

/**
 * Makes the slowed copy of a clip ahead of the tap (Pronunciation opens
 * with its native clip), so Slowly starts at once. Errors are ignored:
 * the tap then tries again or falls back.
 */
export function prepareSlowClip(src: string, rate: number, span?: ClipSpan): void {
  if (isPlayerRate(rate) || rate >= 1) return;
  makeSlowClip(src, rate, span).catch(() => {});
}

/** Stops the clip that's playing, if any. */
export function stopClip(): void {
  playId++;
  clearSpan();
  if (audio && !audio.paused) audio.pause();
  if (state.src || state.loading) set({ src: null, loading: false });
}

/** Marks `tag`'s play as failed without playing (a button with no clip), stopping anything else. */
export function failClip(tag: string, reason = 'no clip'): void {
  stopClip();
  set({ src: null, loading: false, error: reason, tag });
}

/** Changes the rate for the next play (and the current one). */
export function setPlayerRate(rate: PlayerRate): void {
  if (audio) audio.playbackRate = rate;
  set({ rate });
}

/** Test hook. */
export function resetPlayerForTest(): void {
  clearSpan();
  audio = null;
  playId = 0;
  state = { src: null, rate: 1, error: null, loading: false, tag: null };
  listeners.clear();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getState = () => state;
const serverState: PlayerState = { src: null, rate: 1, error: null, loading: false, tag: null };

export function usePlayer() {
  const current = useSyncExternalStore(subscribe, getState, () => serverState);
  const play = useCallback(
    (src: string, rate?: number, span?: ClipSpan, tag?: string | null) =>
      playClip(src, rate, span, tag ?? null),
    [],
  );
  return {
    ...current,
    play,
    stop: stopClip,
    fail: failClip,
    setRate: setPlayerRate,
    isPlaying: (src: string) => current.src === src,
  };
}
