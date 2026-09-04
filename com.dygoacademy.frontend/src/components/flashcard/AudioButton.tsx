'use client';

import { useRef, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * FR-2.4's speed toggle (0.75x / 1.0x) plus playback, for the neural-TTS
 * clip attached to a word (`master_lexicon.audio_url`, played straight from
 * R2/MinIO — no proxy). One `<audio>` element per mount, replaced (not
 * reused) whenever `src` changes, since two different cards can otherwise
 * end up sharing playback state across a re-render.
 */
export function AudioButton({
  src,
  label = 'Play pronunciation',
  className,
}: {
  src: string | null;
  label?: string;
  className?: string;
}) {
  const [speed, setSpeed] = useState<0.75 | 1>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function play(e: React.MouseEvent) {
    // AudioButton is rendered inside Flashcard's front/back content, which
    // wraps everything in its own onClick (the flip toggle) — without this,
    // tapping Play also flips the card, live-reported 2026-09-04.
    e.stopPropagation();
    // TEMP debug logging — live-diagnosing 2026-09-04's "clicking Play
    // does nothing, no console errors" report. The previous silent catch()
    // made it impossible to tell "no src" from "play() rejected" from
    // "everything's fine, just no audible sound" from the console alone.
    // Remove once the real cause is confirmed.
    console.log('[AudioButton] play() called, src =', src);
    if (!src) {
      console.warn('[AudioButton] no src — button should have been disabled');
      return;
    }
    if (!audioRef.current || audioRef.current.src !== src) {
      audioRef.current = new Audio(src);
    }
    audioRef.current.playbackRate = speed;
    audioRef.current.currentTime = 0;
    void audioRef.current
      .play()
      .then(() => console.log('[AudioButton] play() resolved — should be audible now'))
      .catch((err) => {
        console.error('[AudioButton] play() rejected:', err);
      });
  }

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <button
        type="button"
        onClick={play}
        disabled={!src}
        aria-label={label}
        className={cn(
          'rounded-full border px-2.5 py-1 text-xs transition-colors',
          src ? 'hover:bg-accent' : 'cursor-not-allowed opacity-40',
        )}
      >
        ▶ Play
      </button>
      <div className="flex overflow-hidden rounded-full border text-[10px]">
        {([0.75, 1] as const).map((rate) => (
          <button
            key={rate}
            type="button"
            onClick={(e) => {
              // Same bubbling issue as play() above — this button sits
              // inside Flashcard's flip handler too.
              e.stopPropagation();
              setSpeed(rate);
            }}
            aria-pressed={speed === rate}
            className={cn(
              'px-1.5 py-1 transition-colors',
              speed === rate ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
            )}
          >
            {rate}x
          </button>
        ))}
      </div>
    </div>
  );
}
