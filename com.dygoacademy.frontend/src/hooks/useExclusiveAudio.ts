'use client';

import { useCallback, useEffect, useId } from 'react';

import { failClip, getPlayerTag, playClip, stopClip, usePlayer, type ClipSpan } from './usePlayer';

/** A ListenCard button's sound state (honeycomb plan §2.2). */
export type ExclusiveState = 'idle' | 'loading' | 'playing' | 'error';

/** What a button plays; `src` null = nothing to play (the button shows the error line when tapped). */
export interface ExclusiveClip {
  src: string | null;
  rate?: number;
  span?: ClipSpan;
  /** Play the browser-slowed copy at 1× (Slowly; `usePlayer` `stretch`). */
  stretch?: boolean;
}

/**
 * One sound at a time on a screen (honeycomb plan §2.3), over the app's one
 * shared player (`usePlayer`, which carries the iPhone audio fixes): `play`
 * stops whatever else plays, `toggle` stops the key when it is already
 * loading or playing. Each screen's keys are its own (a `useId` scope), and
 * the sound stops when the screen unmounts (closing it or a route change).
 */
export function useExclusiveAudio() {
  const scope = useId();
  const player = usePlayer();
  const tagOf = useCallback((key: string) => `${scope}:${key}`, [scope]);

  const mine = player.tag?.startsWith(`${scope}:`) ? player.tag.slice(scope.length + 1) : null;
  const state: ExclusiveState =
    mine === null
      ? 'idle'
      : player.loading
        ? 'loading'
        : player.src
          ? 'playing'
          : player.error
            ? 'error'
            : 'idle';
  const key = state === 'idle' ? null : mine;

  const stateOf = (k: string): ExclusiveState => (k === key ? state : 'idle');

  const play = useCallback(
    (k: string, clip: ExclusiveClip): Promise<void> => {
      if (!clip.src) {
        failClip(tagOf(k));
        return Promise.resolve();
      }
      return playClip(clip.src, clip.rate ?? 1, clip.span, tagOf(k), { stretch: clip.stretch }).catch(
        () => undefined,
      );
    },
    [tagOf],
  );

  const stop = useCallback(() => {
    if (getPlayerTag()?.startsWith(`${scope}:`)) stopClip();
  }, [scope]);

  /** A tap: stops `k` while it loads or plays, else plays it. */
  const toggle = (k: string, clip: ExclusiveClip): Promise<void> => {
    const now = stateOf(k);
    if (now === 'loading' || now === 'playing') {
      stopClip();
      return Promise.resolve();
    }
    return play(k, clip);
  };

  useEffect(() => stop, [stop]);

  return { key, state, stateOf, play, toggle, stop };
}
