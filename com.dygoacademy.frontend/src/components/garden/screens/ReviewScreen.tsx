'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Button } from '../Button';
import { buttonClassName } from '../buttonStyles';
import { gcn } from '../cn';
import { CloseIcon } from '../icons';
import { IconButton } from '../IconButton';
import { ProgressVine } from '../ProgressVine';
import { RatingBar, type Rating, type RatingInterval } from '../RatingBar';
import { ReviewCard, type ReviewCardProps } from '../ReviewCard';

/**
 * A2 · Watering (canvas `reference/A2-review-question`, `-answer`,
 * `-finished`). Props only; the page owns the session.
 *
 * Header: Close, the mission name with the count, and the progress vine.
 * - question: the card with the answer hidden, then "Show answer".
 * - answer: the card with the answer, then the rating bar.
 * - finished: the flower, "All 18 watered", "See your garden bloom", and
 *   an optional secondary action.
 *
 * Without `onShowAnswer` the screen flips to the answer by itself (the
 * reference pages and the gallery use that).
 */
export type ReviewState = 'question' | 'answer' | 'finished';

export interface ReviewScreenProps {
  state: ReviewState;
  /** e.g. "Water 18 words". */
  missionTitle: string;
  done: number;
  total: number;
  closeHref: string;
  card: Omit<ReviewCardProps, 'revealed' | 'className'> | null;
  /** "Next due" per rating; null until the API returns them (UI-4). */
  intervals: Record<Rating, RatingInterval> | null;
  onShowAnswer?: () => void;
  onRate?: (rating: Rating) => void;
  rating?: boolean;
  bloomHref: string;
  secondaryAction?: { label: string; href?: string; onClick?: () => void } | null;
  /** Shown instead of the card when there is nothing to water. */
  emptyText?: string;
}

/** The finished flower (120px). */
function FinishedFlower() {
  return (
    <svg width="120" height="120" viewBox="0 0 60 60" aria-hidden="true" focusable="false">
      <ellipse cx="30" cy="54" rx="20" ry="4" fill="var(--color-border)" />
      <path
        d="M30 52 V26"
        stroke="var(--stage-tree-canopy)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M30 44 C23 43 19 38 21 34 C27 34 30 38 30 44 Z" fill="var(--stage-sprout-leaf)" />
      <circle cx="30" cy="14" r="6" fill="var(--stage-flower)" />
      <circle cx="38" cy="20" r="6" fill="var(--stage-flower)" />
      <circle cx="35" cy="29" r="6" fill="var(--stage-flower)" />
      <circle cx="25" cy="29" r="6" fill="var(--stage-flower)" />
      <circle cx="22" cy="20" r="6" fill="var(--stage-flower)" />
      <circle cx="30" cy="22" r="5" fill="var(--color-gold-light)" />
    </svg>
  );
}

export function ReviewScreen({
  state,
  missionTitle,
  done,
  total,
  closeHref,
  card,
  intervals,
  onShowAnswer,
  onRate,
  rating = false,
  bloomHref,
  secondaryAction,
  emptyText,
}: ReviewScreenProps) {
  const t = useTranslations('screens.review');
  const [localState, setLocalState] = React.useState(state);
  const [prevState, setPrevState] = React.useState(state);
  if (prevState !== state) {
    setPrevState(state);
    setLocalState(state);
  }
  const shown = onShowAnswer ? state : localState;

  return (
    <div className="mx-auto flex min-h-screen-dvh w-full max-w-[560px] flex-col gap-[14px] bg-garden-bg px-4 pb-6 pt-5 text-garden-text">
      <div className="flex items-center gap-3">
        <IconButton asChild aria-label={t('close')}>
          <Link href={closeHref}>
            <CloseIcon width={20} height={20} />
          </Link>
        </IconButton>
        <div className="flex flex-grow flex-col gap-[5px]">
          <div className="flex justify-between text-[12px] font-semibold text-garden-muted">
            <span>{t('missionLabel', { title: missionTitle })}</span>
            <span aria-hidden="true">{t('count', { done, total })}</span>
          </div>
          <ProgressVine value={done} max={total} valueText={t('vineText', { done, total })} />
        </div>
      </div>

      {shown === 'finished' ? (
        <div className="garden-rise flex flex-grow flex-col items-center justify-center gap-[18px] text-center">
          <FinishedFlower />
          <h1 className="font-display text-[28px] font-semibold">
            {t('finishedTitle', { count: total })}
          </h1>
          <Link href={bloomHref} className={buttonClassName('primary', { className: 'w-full' })}>
            {t('seeBloom')}
          </Link>
          {secondaryAction ? (
            secondaryAction.href ? (
              <Link href={secondaryAction.href} className={SECONDARY}>
                {secondaryAction.label}
              </Link>
            ) : (
              <button type="button" onClick={secondaryAction.onClick} className={SECONDARY}>
                {secondaryAction.label}
              </button>
            )
          ) : null}
        </div>
      ) : card ? (
        <div className="garden-rise flex flex-grow flex-col gap-[14px]">
          <ReviewCard {...card} revealed={shown === 'answer'} className="flex-grow" />
          {shown === 'question' ? (
            <Button
              variant="forest"
              onClick={() => (onShowAnswer ? onShowAnswer() : setLocalState('answer'))}
            >
              {t('showAnswer')}
            </Button>
          ) : (
            <div className="garden-rise">
              <RatingBar intervals={intervals} onRate={(r) => onRate?.(r)} disabled={rating} />
            </div>
          )}
        </div>
      ) : emptyText ? (
        <p className="flex flex-grow items-center justify-center px-6 text-center text-[15px] text-garden-muted">
          {emptyText}
        </p>
      ) : null}
    </div>
  );
}

const SECONDARY = gcn(
  'flex h-11 items-center rounded-[22px] border border-garden-border bg-garden-surface px-[18px]',
  'text-[14px] font-semibold text-garden-muted',
);
