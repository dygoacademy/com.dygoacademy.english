'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { type MediaKind, trackAudioStart } from '@/lib/media-timing';
import { prepareForPlayback } from '@/lib/speaking/audio';

import { gcn } from './cn';
import { SpeakerIcon, SpeakerOffIcon } from './icons';

/**
 * Garden audio button (canvas A2: a 52px forest circle with the 24px
 * speaker, design system §14.6). Plays a word's
 * pronunciation clip (`master_lexicon.audio_url`).
 *
 * Playback is the classic `flashcard/AudioButton.tsx` logic, which is left
 * unchanged: one `Audio` element per `src`, replaced (not reused) when the
 * src changes, restarted from 0 on every tap, and the tap doesn't bubble
 * (the button often sits inside a tappable card).
 *
 * New here: when the clip fails to load or play (a blocked CDN, §14.6),
 * the button turns into a visible "Audio unavailable, tap to retry"
 * pill, and tapping it makes a fresh `Audio` element and tries again.
 * With no `src` at all it's a disabled button saying there's no audio.
 *
 * Option 2 (2026-10-04): each play's start time (tap → sound) is logged
 * through `trackAudioStart` so slow audio can be measured per country.
 */
export type AudioStatus = 'idle' | 'playing' | 'error';

export interface GardenAudioButtonProps {
  src: string | null | undefined;
  /** Accessible name for the play button. Defaults to "Play pronunciation". */
  label?: string;
  playbackRate?: number;
  /** Start in a given state, e.g. 'error' when the caller already knows the clip is missing. */
  initialStatus?: AudioStatus;
  className?: string;
  /** Extra classes for the round play button only (e.g. a bigger size); the
   *  "unavailable, tap to retry" pill keeps its own size so its text fits. */
  playClassName?: string;
  /** What the clip is, for the audio start-time log (lib/media-timing). */
  mediaKind?: MediaKind;
}

export function AudioButton({
  src,
  label,
  playbackRate = 1,
  initialStatus = 'idle',
  className,
  playClassName,
  mediaKind = 'word',
}: GardenAudioButtonProps) {
  const t = useTranslations('components.audio');
  const [status, setStatus] = React.useState<AudioStatus>(initialStatus);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const audioSrcRef = React.useRef<string | null>(null);

  // A new clip starts clean: drop the old element and any error.
  React.useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
      audioSrcRef.current = null;
    };
  }, [src]);
  const [prevSrc, setPrevSrc] = React.useState(src);
  if (prevSrc !== src) {
    setPrevSrc(src);
    setStatus('idle');
  }

  function makeAudio(clip: string) {
    const audio = new Audio(clip);
    audio.addEventListener('ended', () => setStatus('idle'));
    audio.addEventListener('pause', () => setStatus((s) => (s === 'playing' ? 'idle' : s)));
    audio.addEventListener('error', () => setStatus('error'));
    audioRef.current = audio;
    audioSrcRef.current = clip;
    return audio;
  }

  function play(event: React.MouseEvent) {
    event.stopPropagation();
    if (!src) return;
    const retry = status === 'error';
    const audio =
      !retry && audioRef.current && audioSrcRef.current === src ? audioRef.current : makeAudio(src);
    audio.playbackRate = playbackRate;
    audio.currentTime = 0;
    setStatus('playing');
    prepareForPlayback(); // speaker, through the silent switch (iOS home-screen app)
    trackAudioStart(audio, src, mediaKind);
    void audio.play().catch((error: unknown) => {
      // A newer play()/pause() interrupting this one isn't a failure.
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setStatus('error');
    });
  }

  if (!src) {
    return (
      <button
        type="button"
        disabled
        aria-label={t('none')}
        className={gcn(
          'inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full',
          'bg-surface-sunken text-muted-foreground [&_svg]:h-6 [&_svg]:w-6',
          className,
        )}
      >
        <SpeakerOffIcon />
      </button>
    );
  }

  if (status === 'error') {
    return (
      <button
        type="button"
        onClick={play}
        data-status="error"
        className={gcn(
          'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-gold px-3 py-1.5 text-left',
          'bg-gold-soft text-label text-gold-soft-text',
          'transition-transform duration-press ease-garden active:scale-95 [&_svg]:h-5 [&_svg]:w-5',
          className,
        )}
      >
        <SpeakerOffIcon className="shrink-0" />
        <span>{t('unavailableRetry')}</span>
        <span role="status" className="sr-only">
          {t('unavailable')}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={play}
      aria-label={label ?? t('play')}
      data-status={status}
      className={gcn(
        'inline-flex h-[52px] w-[52px] shrink-0 cursor-pointer items-center justify-center rounded-full',
        'bg-forest text-white',
        'transition-[transform,background-color] duration-press ease-garden active:scale-95',
        status === 'playing' && 'bg-forest-deep',
        className,
        playClassName,
      )}
    >
      <SpeakerIcon width={24} height={24} />
    </button>
  );
}
