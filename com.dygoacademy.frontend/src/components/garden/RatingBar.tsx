'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { gcn } from './cn';

/**
 * Rating bar (canvas A2): four equal buttons, 68px tall, radius 16, 8px
 * apart, each with its label (15px bold) and the interval that rating would
 * schedule (12px, "5 days").
 *
 * - Colours are the §5.2 `rating-*` pairs (all ≥ 4.5:1).
 * - `intervals` are amounts ("5 days"), formatted here per language. In
 *   UI-4 they come from the server-side `ts-fsrs` preview on each due
 *   card, so the frontend never re-implements FSRS.
 * - `disabled` (e.g. while the rating is saving) disables all four
 *   buttons and ignores the keyboard.
 * - Keys 1–4 fire Again / Hard / Good / Easy. The key hints only appear
 *   once a keyboard has been used, and hide again on the next tap.
 *   Presses in text fields, with modifier keys, or held-down repeats are
 *   ignored.
 */
export const RATINGS = ['again', 'hard', 'good', 'easy'] as const;
export type Rating = (typeof RATINGS)[number];

/** FSRS grade for each rating (ts-fsrs `Rating.Again` … `Rating.Easy`). */
export const RATING_GRADE: Record<Rating, 1 | 2 | 3 | 4> = {
  again: 1,
  hard: 2,
  good: 3,
  easy: 4,
};

const RATING_KEY: Record<string, Rating> = { '1': 'again', '2': 'hard', '3': 'good', '4': 'easy' };

const RATING_STYLE: Record<Rating, string> = {
  again: 'bg-rating-again text-rating-again-text',
  hard: 'bg-rating-hard text-rating-hard-text',
  good: 'bg-rating-good text-rating-good-text',
  easy: 'bg-rating-easy text-rating-easy-text',
};

/** The wait a rating would schedule: "< 1 min", "10 min", "5 days", "3 months". */
export type RatingInterval =
  | { unit: 'lessThanMinute' }
  | { unit: 'minutes' | 'hours' | 'days' | 'months'; count: number };

export interface RatingBarProps {
  /**
   * Interval per rating, e.g. { again: { unit: 'lessThanMinute' }, …, easy: { unit: 'days', count: 12 } }.
   * Null until the API returns interval previews (UI-4): the buttons then
   * show only their labels.
   */
  intervals: Record<Rating, RatingInterval> | null;
  onRate: (rating: Rating) => void;
  /** Disables every button and the 1–4 keys, e.g. while saving. */
  disabled?: boolean;
  /** Listen for 1–4 on the window. Turn off if another bar is on screen. */
  keyboardShortcuts?: boolean;
  className?: string;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function RatingBar({
  intervals,
  onRate,
  disabled = false,
  keyboardShortcuts = true,
  className,
}: RatingBarProps) {
  const t = useTranslations('components.rating');
  const intervalText = (interval: RatingInterval) =>
    interval.unit === 'lessThanMinute'
      ? t('interval.lessThanMinute')
      : t(`interval.${interval.unit}`, { count: interval.count });
  const [keyboardUsed, setKeyboardUsed] = React.useState(false);

  // Keep the latest props in refs so the window listener is attached once.
  const onRateRef = React.useRef(onRate);
  const disabledRef = React.useRef(disabled);
  React.useEffect(() => {
    onRateRef.current = onRate;
    disabledRef.current = disabled;
  });

  React.useEffect(() => {
    if (!keyboardShortcuts) return;
    function onKeyDown(event: KeyboardEvent) {
      setKeyboardUsed(true);
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      if (isTypingTarget(event.target)) return;
      const rating = RATING_KEY[event.key];
      if (!rating || disabledRef.current) return;
      event.preventDefault();
      onRateRef.current(rating);
    }
    function onPointerDown() {
      // A tap or click means the learner isn't on a keyboard (any more).
      setKeyboardUsed(false);
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [keyboardShortcuts]);

  return (
    <div
      role="group"
      aria-label={t('groupLabel')}
      aria-busy={disabled || undefined}
      className={gcn('grid w-full grid-cols-4 gap-2', className)}
    >
      {RATINGS.map((rating, index) => {
        const key = String(index + 1);
        return (
          <button
            key={rating}
            type="button"
            disabled={disabled}
            onClick={() => onRate(rating)}
            aria-keyshortcuts={keyboardShortcuts ? key : undefined}
            data-rating={rating}
            className={gcn(
              'relative flex h-[68px] flex-col items-center justify-center gap-0.5 rounded-control px-1.5 py-px text-center',
              'transition-[transform,filter,opacity] duration-press ease-garden',
              'hover:brightness-[0.97] active:translate-y-[2px] active:brightness-95',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0',
              RATING_STYLE[rating],
            )}
          >
            {keyboardShortcuts && keyboardUsed ? (
              <kbd
                aria-hidden="true"
                data-testid="rating-key-hint"
                className="absolute left-1.5 top-1 font-body text-[0.6875rem] font-semibold leading-none opacity-70"
              >
                {key}
              </kbd>
            ) : null}
            <span className="text-[15px] font-bold">{t(rating)}</span>
            {intervals ? (
              <span className="text-[12px]">{intervalText(intervals[rating])}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
