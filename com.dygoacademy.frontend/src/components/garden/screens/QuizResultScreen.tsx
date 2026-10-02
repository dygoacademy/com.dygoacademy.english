'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { buttonClassName } from '../buttonStyles';
import { useGardenFormat } from '../format';
import { CloseIcon, WaterIcon } from '../icons';
import { IconButton } from '../IconButton';
import { QuizBloomArt, QuizWateringArt } from '../quizArt';
import { StatTile } from '../StatTile';

/**
 * Garden quiz, result screen (U5-6; canvas "Adult · Quiz" Q6–Q8 since
 * UI-5 QZ-2, values from docs/design/garden/reference/Q6…Q8.html).
 *
 * Close → 148px forest circle with the watering can (some missed) or the
 * bloom (all right) → overline, Fraunces 30 score, subtitle → two tiles
 * (right / need water, muted when 0) → the words that need water on the
 * gold "wilting" card (never red) → "Drill tricky words" (56px secondary,
 * only for a normal quiz with misses and when the caller offers it) and
 * "Back to bed".
 *
 * Props only; `/quiz` owns the session.
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
  /**
   * Link to the leech drill. The button shows only for a normal quiz
   * (not `drill`) with misses; null/undefined hides it.
   */
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
  const perfect = missed.length === 0;
  const showDrill = Boolean(drillHref) && !drill && !perfect;

  return (
    <div className="mx-auto flex min-h-screen-dvh w-full max-w-[560px] flex-col gap-4 bg-bg px-4 pb-6 pt-5 text-text">
      <div className="flex justify-end">
        <IconButton asChild aria-label={t('close')}>
          <Link href={closeHref}>
            <CloseIcon width={20} height={20} />
          </Link>
        </IconButton>
      </div>

      <div className="flex flex-col items-center gap-1.5 text-center">
        <div
          data-testid={perfect ? 'quiz-result-bloom' : 'quiz-result-watering'}
          className="flex h-[148px] w-[148px] items-center justify-center rounded-full bg-forest"
        >
          {perfect ? <QuizBloomArt /> : <QuizWateringArt />}
        </div>
        <span className="mt-2 text-[12px] font-bold uppercase tracking-[0.1em] text-success">
          {drill ? t('overlineDrill') : t('overline')}
        </span>
        <h1 className="font-display text-[30px] font-semibold leading-[1.1]">
          {t('title', { correct, total })}
        </h1>
        <span className="text-[15px] text-muted-foreground">
          {perfect ? t('allRight') : t('someMissed', { count: missed.length })}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatTile
          size="lg"
          value={f.number(correct)}
          label={t('right')}
          tone={correct > 0 ? 'success' : 'muted'}
        />
        <StatTile
          size="lg"
          value={f.number(missed.length)}
          label={t('needWater')}
          tone={perfect ? 'muted' : 'gold'}
        />
      </div>

      {!perfect ? (
        <section
          aria-labelledby="quiz-result-missed"
          className="flex flex-col gap-2.5 rounded-card border border-gold-border bg-gold-soft p-[14px]"
        >
          <div className="flex items-center gap-2">
            <WaterIcon width={18} height={18} fill="var(--color-water-due)" aria-hidden="true" />
            <h2 id="quiz-result-missed" className="text-[15px] font-bold">
              {t('missedTitle')}
            </h2>
          </div>
          <ul className="flex flex-wrap gap-2">
            {missed.map((w) => (
              <li
                key={w.id}
                lang="en"
                className="rounded-full border border-gold-border bg-surface px-3 py-[5px] text-[14px] font-semibold"
              >
                {w.word}
              </li>
            ))}
          </ul>
          <p className="text-[13px] leading-[1.4] text-gold-soft-text">{t('missedNote')}</p>
        </section>
      ) : null}

      <div className="mt-auto flex flex-col gap-2.5">
        {showDrill && drillHref ? (
          <Link
            href={drillHref}
            className={buttonClassName('secondary', {
              className: 'h-[56px] w-full rounded-[18px] text-[16px]',
            })}
          >
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
