'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { buttonClassName } from '../buttonStyles';
import { useGardenFormat } from '../format';
import { CloseIcon, WaterIcon } from '../icons';
import { IconButton } from '../IconButton';
import { StatTile } from '../StatTile';

/**
 * Garden quiz, result screen (U5-6). No canvas artboard exists for the
 * adult quiz (same as U5-5): built from the A3 Mission complete layout
 * (Close, overline, big Fraunces title, stat tiles) and design system §11.
 *
 * Score → two tiles (right / need water) → the words that need water, on
 * the gold "wilting" wash (never red) with the note that graded misses
 * come back in the next watering → "Back to bed", and "Drill tricky
 * words" (the leech drill) when the caller offers it.
 *
 * Props only; `/garden/quiz` owns the session.
 */
export interface QuizResultScreenProps {
  closeHref: string;
  backHref: string;
  /** Label of the main button: back to the bed, or to all topics. */
  back: 'bed' | 'topics';
  correct: number;
  total: number;
  /** Words answered wrong, in quiz order, without repeats. */
  missed: ReadonlyArray<{ id: string; word: string }>;
  /** True when this was the leech drill (changes the title line). */
  drill?: boolean;
  /** Link to the leech drill; null/undefined hides the button. */
  drillHref?: string | null;
}

export function QuizResultScreen({
  closeHref,
  backHref,
  back,
  correct,
  total,
  missed,
  drill = false,
  drillHref,
}: QuizResultScreenProps) {
  const t = useTranslations('screens.quiz.result');
  const f = useGardenFormat();

  return (
    <div className="mx-auto flex min-h-screen-dvh w-full max-w-[560px] flex-col gap-4 bg-garden-bg px-4 pb-6 pt-5 text-garden-text">
      <div className="flex justify-end">
        <IconButton asChild aria-label={t('close')}>
          <Link href={closeHref}>
            <CloseIcon width={20} height={20} />
          </Link>
        </IconButton>
      </div>

      <div className="flex flex-col items-center gap-1.5 text-center">
        <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-garden-success">
          {drill ? t('overlineDrill') : t('overline')}
        </span>
        <h1 className="font-display text-[30px] font-semibold leading-[1.1]">
          {t('title', { correct, total })}
        </h1>
        <span className="text-[15px] text-garden-muted">
          {missed.length === 0 ? t('allRight') : t('someMissed', { count: missed.length })}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatTile value={f.number(correct)} label={t('right')} tone="success" />
        <StatTile value={f.number(missed.length)} label={t('needWater')} tone="gold" />
      </div>

      {missed.length > 0 ? (
        <section
          aria-labelledby="quiz-result-missed"
          className="flex flex-col gap-2.5 rounded-card border border-garden-gold-border bg-garden-gold-soft p-[14px]"
        >
          <div className="flex items-center gap-2">
            <WaterIcon width={18} height={18} aria-hidden="true" />
            <h2 id="quiz-result-missed" className="text-[15px] font-bold">
              {t('missedTitle')}
            </h2>
          </div>
          <ul className="flex flex-wrap gap-2">
            {missed.map((w) => (
              <li
                key={w.id}
                lang="en"
                className="rounded-full border border-garden-gold-border bg-garden-surface px-3 py-1 text-[14px] font-semibold"
              >
                {w.word}
              </li>
            ))}
          </ul>
          <p className="text-[13px] text-garden-gold-soft-text">{t('missedNote')}</p>
        </section>
      ) : null}

      <div className="mt-auto flex flex-col gap-2 pt-2">
        {drillHref ? (
          <Link href={drillHref} className={buttonClassName('secondary', { className: 'w-full' })}>
            {t('drill')}
          </Link>
        ) : null}
        <Link href={backHref} className={buttonClassName('primary', { className: 'w-full' })}>
          {back === 'bed' ? t('backToBed') : t('backToTopics')}
        </Link>
      </div>
    </div>
  );
}
