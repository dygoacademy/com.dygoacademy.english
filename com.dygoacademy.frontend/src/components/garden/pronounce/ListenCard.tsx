'use client';

import * as React from 'react';

import type { ExclusiveState } from '@/hooks/useExclusiveAudio';

import { gcn } from '../cn';

/**
 * The listen card (honeycomb plan §2.2): two large play buttons, each a
 * 36px round icon and a label. P1 Normal / Slowly (a playing button turns
 * solid forest), P3 and P4 Native / Your try (a playing button gets a
 * darker tint). Idle shows a play triangle, loading a spinner and
 * "Loading…", playing level bars; a tap while loading or playing stops the
 * sound (`onTap` decides). An error shows one line under the card. No
 * "Both" button and no durations.
 */
export interface ListenButton {
  key: string;
  label: string;
  /** The line under the label (P1, P3); none on P4. */
  sub?: string;
  tone: 'green' | 'clay';
  /** The button's accessible name ("Play mitigate at normal speed"). */
  aria: string;
}

export interface ListenCardProps {
  /** Card heading (P1, P3). None on P4, whose buttons sit in the compare card (`bare`). */
  eyebrow?: string;
  title?: string;
  buttons: readonly [ListenButton, ListenButton];
  stateOf: (key: string) => ExclusiveState;
  onTap: (key: string) => void;
  /** P1: the playing button turns solid forest; P3 / P4: a darker tint. */
  playing: 'solid' | 'tint';
  loadingText: string;
  /** "Playing, tap to stop" (P1's solid look only). */
  playingText?: string;
  /** "Couldn't play the sound. Tap to try again." */
  errorText: string;
  /** No white card around the buttons (P4). */
  bare?: boolean;
  className?: string;
}

const Play = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M7 4 L20 12 L7 20 Z" />
  </svg>
);

const Spinner = ({ tone }: { tone: ListenButton['tone'] }) => (
  <svg className="motion-safe:animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="8" stroke={tone === 'clay' ? 'var(--listen-clay-line)' : 'var(--listen-green-line)'} />
    <path d="M12 4 A8 8 0 0 1 20 12" stroke={tone === 'clay' ? 'var(--color-primary)' : 'var(--comb-board)'} />
  </svg>
);

const Bars = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
    <rect className="comb-level" x="2" y="5" width="3.2" height="10" rx="1.6" fill="currentColor" />
    <rect className="comb-level" x="8.4" y="2" width="3.2" height="16" rx="1.6" fill="currentColor" style={{ animationDelay: '.2s' }} />
    <rect className="comb-level" x="14.8" y="5" width="3.2" height="10" rx="1.6" fill="currentColor" style={{ animationDelay: '.4s' }} />
  </svg>
);

function PlayButton({
  button,
  state,
  onTap,
  playing,
  loadingText,
  playingText,
}: {
  button: ListenButton;
  state: ExclusiveState;
  onTap: () => void;
  playing: ListenCardProps['playing'];
  loadingText: string;
  playingText?: string;
}) {
  const clay = button.tone === 'clay';
  const on = state === 'playing';
  const solid = on && playing === 'solid';
  const sub =
    state === 'loading' ? loadingText : solid && playingText ? playingText : button.sub;
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={button.aria}
      aria-pressed={state === 'playing' || state === 'loading'}
      aria-busy={state === 'loading' || undefined}
      data-listen={button.key}
      data-sound={state}
      className={gcn(
        'flex h-[60px] min-w-0 items-center gap-2.5 rounded-[16px] border px-2.5 text-left transition-transform active:scale-[.97]',
        clay
          ? 'border-[var(--listen-clay-line)] text-[var(--listen-clay-text)]'
          : 'border-[var(--listen-green-line)] text-[var(--comb-board)]',
        solid
          ? 'border-[var(--comb-board)] bg-[var(--comb-board)] text-white'
          : on
            ? clay
              ? 'bg-[var(--listen-clay-on)]'
              : 'bg-[var(--listen-green-on)]'
            : clay
              ? 'bg-[var(--listen-clay)]'
              : 'bg-[var(--listen-green)]',
      )}
    >
      <span
        className={gcn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          solid
            ? 'bg-white text-[var(--comb-board)]'
            : state === 'loading'
              ? clay
                ? 'bg-[var(--listen-clay)]'
                : 'bg-[var(--listen-green)]'
              : clay
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--comb-board)] text-white',
        )}
      >
        {state === 'loading' ? <Spinner tone={button.tone} /> : on ? <Bars /> : <Play />}
      </span>
      <span className="flex min-w-0 flex-col gap-px">
        <span className="truncate text-[15px] font-bold">{button.label}</span>
        {sub ? (
          <span
            className={gcn(
              'line-clamp-2 text-[12px] font-semibold leading-[1.2]',
              solid ? 'text-[var(--comb-title)]' : clay ? 'text-[var(--listen-clay-sub)]' : 'text-[var(--listen-green-sub)]',
            )}
          >
            {sub}
          </span>
        ) : null}
      </span>
    </button>
  );
}

export function ListenCard({
  eyebrow,
  title,
  buttons,
  stateOf,
  onTap,
  playing,
  loadingText,
  playingText,
  errorText,
  bare = false,
  className,
}: ListenCardProps) {
  const error = buttons.some((b) => stateOf(b.key) === 'error');
  const grid = (
    <div className="grid grid-cols-2 gap-2">
      {buttons.map((b) => (
        <PlayButton
          key={b.key}
          button={b}
          state={stateOf(b.key)}
          onTap={() => onTap(b.key)}
          playing={playing}
          loadingText={loadingText}
          playingText={playingText}
        />
      ))}
    </div>
  );
  const errorLine = error ? (
    <div role="status" className="flex items-center justify-center gap-1.5 text-[13px] font-semibold text-[var(--color-primary-text)]">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5 V13" />
        <path d="M12 16.5 V16.6" />
      </svg>
      {errorText}
    </div>
  ) : null;
  if (bare) {
    return (
      <div className={gcn('flex flex-col gap-2', className)}>
        {grid}
        {errorLine}
      </div>
    );
  }
  return (
    <div className={gcn('flex flex-col gap-2.5', className)}>
      <div className="flex flex-col gap-2.5 rounded-[22px] border border-border bg-surface p-3.5">
        {eyebrow || title ? (
          <span className="flex flex-col gap-px">
            {eyebrow ? (
              <span className="text-[12px] font-bold uppercase tracking-[.08em] text-muted-foreground">{eyebrow}</span>
            ) : null}
            {title ? <span className="font-display text-[22px] font-semibold leading-[1.15]">{title}</span> : null}
          </span>
        ) : null}
        {grid}
      </div>
      {errorLine}
    </div>
  );
}
