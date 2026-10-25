'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { usePlayer, type ClipSpan } from '@/hooks/usePlayer';

import { gcn } from './cn';

/**
 * One sound button for Pronunciation (Dylan, 2026-10-25: "make the play
 * button consistent"). Same behaviour everywhere, one look per board so each
 * screen still matches its canvas:
 *
 * - `hear`: P1 Hear it / Slowly (white, 48 px, speaker with two arcs or one);
 * - `outline`: P3 Hear mine / Hear native (white, 48 px, play or speaker);
 * - `pill`: P4 v2 Native / You (44 px pill, green for the native speaker,
 *   clay for the learner, with the length after the label).
 *
 * States: ready → loading (spinner) → playing (bars; a tap stops it) →
 * ready, or couldn't play (`SoundError`, the P1 board's line, placed where
 * the screen's board puts it). All buttons share the app's one player
 * (usePlayer), so only one sound plays at a time; `tag` tells the buttons
 * apart when two play the same clip (Hear it and Slowly).
 */
export type SoundVoice = 'native' | 'you';
export type SoundVariant = 'hear' | 'outline' | 'pill';
export type SoundState = 'ready' | 'loading' | 'playing' | 'error';

export interface SoundButtonProps {
  /** Unique on the screen, e.g. "p1-hear", "p4-you". */
  tag: string;
  voice: SoundVoice;
  variant: SoundVariant;
  /** The clip; null = nothing to play (the button shows "couldn't play" when tapped). */
  src: string | null;
  span?: ClipSpan;
  rate?: number;
  label: string;
  /** Accessible name when it differs from the label ("Play the native speaker"). */
  ariaLabel?: string;
  /** `hear`: speaker with two arcs (Hear it) or one (Slowly); `outline`: play (mine) or speaker (native). */
  icon?: 'speaker' | 'speakerSlow' | 'play';
  /** `pill`: the clip's length after the label ("0.8s"). */
  sub?: string;
  /** Called when a play starts (analytics). */
  onPlay?: () => void;
  className?: string;
}

/** The button's state in the shared player. */
export function useSoundState(tag: string): SoundState {
  const player = usePlayer();
  if (player.tag !== tag) return 'ready';
  if (player.loading) return 'loading';
  if (player.src) return 'playing';
  return player.error ? 'error' : 'ready';
}

export function SoundButton({
  tag,
  voice,
  variant,
  src,
  span,
  rate = 1,
  label,
  ariaLabel,
  icon = voice === 'you' ? 'play' : 'speaker',
  sub,
  onPlay,
  className,
}: SoundButtonProps) {
  const player = usePlayer();
  const state = useSoundState(tag);

  const tap = () => {
    if (state === 'playing') return player.stop(); // playing: a tap stops it
    if (state === 'loading') return; // a double tap
    if (!src) return player.fail(tag); // nothing to play: "couldn't play", like a failed load
    onPlay?.();
    void player.play(src, rate, span, tag).catch(() => undefined);
  };

  const busy = state === 'loading' || state === 'playing';
  const glyph =
    state === 'loading' ? (
      <SoundSpinner size={variant === 'pill' ? 14 : 20} />
    ) : state === 'playing' ? (
      <SoundBars size={variant === 'pill' ? 14 : 20} />
    ) : icon === 'play' ? (
      <PlayGlyph size={variant === 'pill' ? 14 : 18} />
    ) : (
      <SpeakerGlyph size={variant === 'outline' ? 18 : 20} arcs={icon === 'speakerSlow' ? 1 : 2} />
    );

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={tap}
        aria-label={ariaLabel ?? label}
        aria-pressed={busy}
        aria-busy={state === 'loading' || undefined}
        data-sound={state}
        className={gcn(
          'pill flex h-11 flex-1 items-center justify-center gap-2 rounded-[22px] border text-[14px] font-bold transition-transform active:scale-[.97]',
          voice === 'native'
            ? 'border-sprout-border bg-forest-wash text-forest'
            : 'border-primary-border bg-[var(--pron-mine)] text-primary-text',
          className,
        )}
      >
        {glyph}
        {label}
        {sub ? <span className="font-semibold text-muted-foreground">{sub}</span> : null}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={tap}
      aria-label={ariaLabel}
      aria-pressed={busy}
      aria-busy={state === 'loading' || undefined}
      data-sound={state}
      className={gcn(
        'flex h-12 flex-1 items-center justify-center gap-2 rounded-[16px] border border-border bg-surface text-[15px] font-bold text-forest transition-transform active:scale-[.97] ipad:h-[52px] ipad:rounded-[18px] ipad:text-[16px]',
        state === 'loading' && 'border-forest-wash-border bg-forest-wash',
        state === 'playing' && 'border-forest bg-forest text-white',
        className,
      )}
    >
      {glyph}
      {label}
    </button>
  );
}

/** "Couldn't play the sound. Tap to try again." (P1-say-word-sound-error), shown while `tags`' last play failed. */
export function SoundError({ tags, className }: { tags: readonly string[]; className?: string }) {
  const t = useTranslations('screens.pronounce');
  const player = usePlayer();
  const failed = player.tag !== null && tags.includes(player.tag) && !player.src && !!player.error;
  if (!failed) return null;
  return (
    <p
      role="status"
      className={gcn(
        'flex items-center justify-center gap-1.5 text-[13px] font-semibold text-primary-text',
        className,
      )}
    >
      <svg
        width={16}
        height={16}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5 V13" />
        <path d="M12 16.5 V16.6" />
      </svg>
      {t('playFailed')}
    </p>
  );
}

// Board icons (PronStones*.dc.html): speaker with one or two sound arcs, play.
export function SpeakerGlyph({ size, arcs = 2 }: { size: number; arcs?: 1 | 2 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 9 H8 L13 5 V19 L8 15 H4 Z" />
      <path d="M16 9 A4 4 0 0 1 16 15" />
      {arcs === 2 ? <path d="M18.5 6.5 A8 8 0 0 1 18.5 17.5" /> : null}
    </svg>
  );
}

export const PlayGlyph = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d={size <= 14 ? 'M6 4 L20 12 L6 20 Z' : 'M7 5 L19 12 L7 19 Z'} />
  </svg>
);

/** While the clip loads: a ring with a turning arc. */
export const SoundSpinner = ({ size = 20 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    strokeWidth="2.6"
    strokeLinecap="round"
    aria-hidden="true"
    className="motion-safe:animate-spin"
  >
    <circle cx="12" cy="12" r="8" stroke="var(--color-forest-wash-border)" />
    <path d="M12 4 A8 8 0 0 1 20 12" stroke="var(--color-success)" />
  </svg>
);

/** While the clip plays: three bars that rise and fall. */
export const SoundBars = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
    {[
      { x: 2, y: 5, h: 10, delay: '0s' },
      { x: 8.4, y: 2, h: 16, delay: '.2s' },
      { x: 14.8, y: 5, h: 10, delay: '.4s' },
    ].map((bar) => (
      <rect
        key={bar.x}
        x={bar.x}
        y={bar.y}
        width="3.2"
        height={bar.h}
        rx="1.6"
        fill="currentColor"
        className="origin-center [transform-box:fill-box] motion-safe:animate-[sound-bar_.8s_ease-in-out_infinite]"
        style={{ animationDelay: bar.delay }}
      />
    ))}
  </svg>
);
