'use client';

import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * FR-2.4's speed toggle (0.75x / 1.0x) plus playback, for the neural-TTS
 * clip attached to a word (`master_lexicon.audio_url`, played straight from
 * R2/MinIO — no proxy). One `<audio>` element per mount, replaced (not
 * reused) whenever `src` changes, since two different cards can otherwise
 * end up sharing playback state across a re-render.
 *
 * Play control rebuilt onto the shared `ui/button.tsx` `Button` (Radix
 * Slot-backed, same primitive every other button in this app composes
 * from) 2026-09-18 ("Can you use radix ui to make Play Sound easy to see
 * and click?") — was a bare `<button>` styled as a small outlined text
 * pill (`▶ Play`, `text-xs`), easy to miss and a marginal touch target.
 *
 * `inline` layout rebuilt again the same day ("The play sound and speed
 * button seem not design for mobile") into one fused, full-width, `h-12`
 * bar — speed segment on the left, Play filling the rest, both the same
 * height throughout — instead of a small `text-xs` speed pill sitting
 * next to an independently-sized Play button (the mismatch was the same
 * one `layout="corner"` had, just not yet fixed here). Speed control is
 * kept for this layout, unlike `corner`'s: `inline`'s two remaining
 * callers are the quiz's DICTATION question (QuizQuestion.tsx, "listen
 * then spell it") and /study's LISTENING sub-mode, and slowing playback
 * down to catch a tricky sound is a real, useful thing to do mid-quiz —
 * it just needed a layout that reads as one control on a phone instead of
 * a tiny toggle bolted onto a big button.
 *
 * `layout="corner"` added 2026-09-18 ("give me options that help student
 * to focus and easier to use in right hand") — WordCardModal's front/back
 * (and study/GuestWordTrial) render this pinned in the card's bottom-right
 * corner (the spot a right thumb rests on holding the phone one-handed)
 * instead of inline beneath the word, so the word/definition area stays
 * uncluttered and the control never shifts position as content length
 * changes. It briefly had its own speed picker (a Radix `ToggleGroup`,
 * "S"/"N") stacked above Play, dropped the same day ("remove slow, normal
 * speed that not help me right now") -- corner layout is Play-only now,
 * always at normal speed; the picker markup (and the shared
 * `ui/toggle-group.tsx` primitive it used) is still there for `inline`
 * layout and easy to bring back to `corner` if speed control turns out to
 * be wanted later.
 */
export function AudioButton({
  src,
  label = 'Play pronunciation',
  layout = 'inline',
  className,
}: {
  src: string | null;
  label?: string;
  /** 'inline' (default): one fused, full-width speed+Play bar. 'corner':
   *  a single circular Play button (no speed picker), meant to be
   *  positioned by the caller, e.g. `className="absolute bottom-4
   *  right-4"`. */
  layout?: 'inline' | 'corner';
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

  if (layout === 'corner') {
    return (
      <Button
        type="button"
        variant={src ? 'default' : 'outline'}
        onClick={play}
        disabled={!src}
        aria-label={label}
        className={cn('h-14 w-14 rounded-full p-0 shadow-lg', className)}
      >
        <PlayIcon className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div className={cn('flex h-12 w-full items-stretch overflow-hidden rounded-full border', className)}>
      <div className="flex shrink-0 items-center gap-1 bg-muted/50 px-1.5">
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
              'rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors',
              speed === rate
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {rate}×
          </button>
        ))}
      </div>
      <Button
        type="button"
        variant={src ? 'default' : 'outline'}
        onClick={play}
        disabled={!src}
        aria-label={label}
        className="h-full flex-1 gap-2 rounded-none border-0 border-l"
      >
        <PlayIcon className="h-5 w-5 shrink-0" />
        Play Sound
      </Button>
    </div>
  );
}

function PlayIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M8 5.14v13.72a1 1 0 0 0 1.53.85l11-6.86a1 1 0 0 0 0-1.7l-11-6.86A1 1 0 0 0 8 5.14Z" />
    </svg>
  );
}
