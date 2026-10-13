'use client';

import { useCallback, useSyncExternalStore } from 'react';

import { getMicGeneration, prepareForPlayback } from '@/lib/speaking/audio';

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
}

let audio: HTMLAudioElement | null = null;
/** `getMicGeneration()` when `audio` was made. */
let audioMicGeneration = 0;
/** Stops a span at its end. */
let spanTimer: ReturnType<typeof setTimeout> | null = null;
let state: PlayerState = { src: null, rate: 1, error: null };
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
    audio.addEventListener('ended', () => set({ src: null }));
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
 * The Pond remembers.
 */
export async function playClip(
  src: string,
  rate: number = state.rate,
  span?: ClipSpan,
): Promise<void> {
  // Not recording: speaker, and through the silent switch (iOS).
  prepareForPlayback();
  const el = element();
  el.pause();
  clearSpan();
  if (el.src !== src) el.src = src;
  el.currentTime = span ? span.start : 0;
  el.playbackRate = rate;
  (el as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;
  set({ src, rate: isPlayerRate(rate) ? rate : state.rate, error: null });
  try {
    await el.play();
  } catch (err) {
    set({ src: null, error: (err as Error)?.message ?? 'play failed' });
    throw err;
  }
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

/** Stops the clip that's playing, if any. */
export function stopClip(): void {
  clearSpan();
  if (audio && !audio.paused) audio.pause();
  if (state.src) set({ src: null });
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
  state = { src: null, rate: 1, error: null };
  listeners.clear();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getState = () => state;
const serverState: PlayerState = { src: null, rate: 1, error: null };

export function usePlayer() {
  const current = useSyncExternalStore(subscribe, getState, () => serverState);
  const play = useCallback(
    (src: string, rate?: number, span?: ClipSpan) => playClip(src, rate, span),
    [],
  );
  return {
    ...current,
    play,
    stop: stopClip,
    setRate: setPlayerRate,
    isPlaying: (src: string) => current.src === src,
  };
}
