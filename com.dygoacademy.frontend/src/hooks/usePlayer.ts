'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * One audio player for the whole app (Phase 13 T3, handover §4): playing a
 * clip stops whatever was playing, so the native clip and the learner's
 * recording never overlap. Works for media URLs and `blob:` URLs of a
 * recording. 0.75× is `playbackRate` (pitch kept).
 */
export const PLAYER_RATES = [1, 0.75] as const;
export type PlayerRate = (typeof PLAYER_RATES)[number];

export interface PlayerState {
  /** The clip playing now, or null. */
  src: string | null;
  rate: PlayerRate;
  /** Set when the last play failed (file missing, blocked, can't decode). */
  error: string | null;
}

let audio: HTMLAudioElement | null = null;
let state: PlayerState = { src: null, rate: 1, error: null };
const listeners = new Set<() => void>();

function set(next: Partial<PlayerState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function element(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.preload = 'auto';
    // Not 'pause': playClip pauses before switching clips, and that event
    // arrives after the new src is set. stopClip clears the state itself.
    audio.addEventListener('ended', () => set({ src: null }));
  }
  return audio;
}

/** Plays `src` at `rate`, stopping anything else. Resolves when playback starts. */
export async function playClip(src: string, rate: PlayerRate = state.rate): Promise<void> {
  const el = element();
  el.pause();
  if (el.src !== src) el.src = src;
  el.currentTime = 0;
  el.playbackRate = rate;
  (el as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;
  set({ src, rate, error: null });
  try {
    await el.play();
  } catch (err) {
    set({ src: null, error: (err as Error)?.message ?? 'play failed' });
    throw err;
  }
}

/** Stops the clip that's playing, if any. */
export function stopClip(): void {
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
  const play = useCallback((src: string, rate?: PlayerRate) => playClip(src, rate), []);
  return {
    ...current,
    play,
    stop: stopClip,
    setRate: setPlayerRate,
    isPlaying: (src: string) => current.src === src,
  };
}
