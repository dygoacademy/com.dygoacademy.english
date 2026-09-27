'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { QuizType } from '@/types';

import { AudioButton } from '../AudioButton';
import { Button } from '../Button';
import { gcn } from '../cn';
import { CheckIcon, CloseIcon } from '../icons';
import { IconButton } from '../IconButton';
import { ProgressVine } from '../ProgressVine';

/**
 * Garden quiz, question screen (U5-5). There is no canvas artboard for the
 * adult quiz: this is built from the garden components and the A2 card
 * style (design system §11): the ReviewScreen header (Close, label with
 * the count, progress vine), one white card (radius 26, 1px border, card
 * lift) with the type tag, the prompt, audio for dictation and the hint,
 * then the answer (a text field + "Check", or the options).
 *
 * Every `QuizQuestion` type is covered: CLOZE and DICTATION answer by
 * typing (with the on-demand hint), MATCHING and CONTEXTUAL_CHOICE by
 * picking an option. After an answer the options stay on screen as a
 * read-only review. Feedback is kind: the right answer gets the green
 * "good" wash and a check; a wrong pick is marked gold "Your pick", never
 * a red ✕, and the panel explains and says the word will come back.
 *
 * Props only; the route (`/garden/quiz`) owns the session.
 */
export interface QuizScreenQuestion {
  id: string;
  type: QuizType;
  prompt: string;
  audioUrl?: string | null;
  options?: readonly string[];
  answerMode: 'TEXT' | 'CHOICE';
}

export interface QuizScreenFeedback {
  correct: boolean;
  correctAnswer: string;
  word: string;
  ipa?: string | null;
  example?: string | null;
  explanation?: string | null;
  /** From `srs`: a new mastery, or a graded miss that comes back. */
  note?: 'mastered' | 'comesBack' | null;
}

export interface QuizScreenHint {
  status: 'idle' | 'loading' | 'shown';
  ipa?: string | null;
  definition?: string | null;
}

export interface QuizScreenProps {
  /** Topic name for the header, or null for a mixed quiz. */
  topicTitle: string | null;
  /** 0-based index of the current question. */
  index: number;
  total: number;
  closeHref: string;
  question: QuizScreenQuestion;
  feedback: QuizScreenFeedback | null;
  hint: QuizScreenHint;
  onHint?: () => void;
  onSubmit?: (answer: string) => void;
  onNext?: () => void;
  submitting?: boolean;
  /** Shown under the answer when the check failed (network). */
  errorText?: string | null;
  isLast?: boolean;
}

/** The backend prefixes these prompts with the task; the tag already says it. */
const PROMPT_PREFIXES: Partial<Record<QuizType, RegExp>> = {
  CLOZE: /^fill in the blank:\s*/i,
  CONTEXTUAL_CHOICE: /^choose the word that completes the sentence:\s*/i,
};

export function quizPrompt(type: QuizType, prompt: string): string {
  const prefix = PROMPT_PREFIXES[type];
  return prefix ? prompt.replace(prefix, '') : prompt;
}

/** Same leniency the backend grades with (trim + lowercase). */
export function sameAnswer(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function QuizScreen({
  topicTitle,
  index,
  total,
  closeHref,
  question,
  feedback,
  hint,
  onHint,
  onSubmit,
  onNext,
  submitting = false,
  errorText,
  isLast = false,
}: QuizScreenProps) {
  const t = useTranslations('screens.quiz');
  const answeredCount = index + (feedback ? 1 : 0);

  return (
    <div className="mx-auto flex min-h-screen-dvh w-full max-w-[560px] flex-col gap-[14px] bg-garden-bg px-4 pb-6 pt-5 text-garden-text">
      <div className="flex items-center gap-3">
        <IconButton asChild aria-label={t('close')}>
          <Link href={closeHref}>
            <CloseIcon width={20} height={20} />
          </Link>
        </IconButton>
        <div className="flex flex-grow flex-col gap-[5px]">
          <div className="flex justify-between gap-2 text-[12px] font-semibold text-garden-muted">
            <span className="truncate">
              {topicTitle ? t('label', { topic: topicTitle }) : t('labelAll')}
            </span>
            <span aria-hidden="true">{t('count', { done: index + 1, total })}</span>
          </div>
          <ProgressVine
            value={answeredCount}
            max={total}
            valueText={t('vineText', { done: answeredCount, total })}
          />
        </div>
      </div>

      <QuestionBody
        key={question.id}
        question={question}
        feedback={feedback}
        hint={hint}
        onHint={onHint}
        onSubmit={onSubmit}
        onNext={onNext}
        submitting={submitting}
        errorText={errorText}
        isLast={isLast}
      />
    </div>
  );
}

function QuestionBody({
  question,
  feedback,
  hint,
  onHint,
  onSubmit,
  onNext,
  submitting,
  errorText,
  isLast,
}: Pick<
  QuizScreenProps,
  'question' | 'feedback' | 'hint' | 'onHint' | 'onSubmit' | 'onNext' | 'errorText' | 'isLast'
> & { submitting: boolean }) {
  const t = useTranslations('screens.quiz');
  const [text, setText] = React.useState('');
  const [pick, setPick] = React.useState<string | null>(null);
  const answered = feedback !== null;
  const isText = question.answerMode === 'TEXT';

  function choose(option: string) {
    if (answered || submitting) return;
    setPick(option);
    onSubmit?.(option);
  }

  return (
    <div className="garden-rise flex flex-grow flex-col gap-[14px]">
      <article
        aria-label={t(`type.${question.type}`)}
        className="flex flex-col gap-[14px] rounded-hero border border-garden-border bg-garden-surface px-5 py-[22px] shadow-card-lift"
      >
        <span className="w-fit rounded-[10px] bg-rating-good px-2.5 py-1 text-[12px] font-bold text-garden-forest">
          {t(`type.${question.type}`)}
        </span>

        <div className="flex items-center justify-between gap-2.5">
          <p lang="en" className="min-w-0 break-words text-[20px] font-semibold leading-[1.35]">
            {quizPrompt(question.type, question.prompt)}
          </p>
          {question.type === 'DICTATION' ? (
            <AudioButton src={question.audioUrl ?? null} label={t('listen')} />
          ) : null}
        </div>

        {isText ? (
          hint.status === 'shown' ? (
            <div
              role="note"
              aria-label={t('hintTitle')}
              className="flex flex-col gap-0.5 rounded-[14px] bg-garden-water-soft px-3 py-2.5 text-[14px] text-garden-water-text"
            >
              <span lang={hint.ipa ? 'en' : undefined}>{hint.ipa || t('noIpa')}</span>
              <span lang={hint.definition ? 'en' : undefined}>
                {hint.definition || t('noDefinition')}
              </span>
            </div>
          ) : answered ? null : (
            <button
              type="button"
              onClick={onHint}
              disabled={hint.status === 'loading'}
              className="min-h-11 self-start text-[14px] font-semibold text-garden-forest underline underline-offset-4 disabled:text-garden-muted"
            >
              {hint.status === 'loading' ? t('hintLoading') : t('hint')}
            </button>
          )
        ) : null}
      </article>

      {isText ? (
        <form
          className="flex flex-col gap-[10px]"
          onSubmit={(event) => {
            event.preventDefault();
            if (text.trim() && !answered) onSubmit?.(text.trim());
          }}
        >
          <label className="sr-only" htmlFor={`quiz-answer-${question.id}`}>
            {t('answerLabel')}
          </label>
          <input
            id={`quiz-answer-${question.id}`}
            lang="en"
            autoFocus
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={submitting || answered}
            placeholder={t('placeholder')}
            // No predictive text / autocorrect: it would spell the word for them.
            autoCorrect="off"
            autoCapitalize="off"
            autoComplete="off"
            spellCheck={false}
            className={gcn(
              'h-[52px] rounded-[16px] border bg-garden-surface px-4 text-[17px] text-garden-text',
              'placeholder:text-garden-placeholder focus:border-garden-forest focus:outline-none',
              answered
                ? feedback?.correct
                  ? 'border-garden-forest bg-rating-good'
                  : 'border-garden-gold bg-garden-gold-soft'
                : 'border-garden-border',
            )}
          />
          {answered ? null : (
            <Button
              type="submit"
              variant="forest"
              loading={submitting}
              disabled={!text.trim()}
            >
              {t('check')}
            </Button>
          )}
        </form>
      ) : (
        <ul aria-label={t('optionsLabel')} className="flex flex-col gap-[10px]">
          {question.options?.map((option) => {
            const isPick = option === pick;
            const isRight = answered && feedback && sameAnswer(option, feedback.correctAnswer);
            const isWrongPick = answered && isPick && !feedback?.correct;
            return (
              <li key={option}>
                <button
                  type="button"
                  onClick={() => choose(option)}
                  disabled={answered || submitting}
                  aria-pressed={isPick}
                  className={gcn(
                    'flex min-h-[52px] w-full items-center justify-between gap-2 rounded-[16px] border px-4 py-3 text-left text-[16px] font-semibold',
                    'transition-colors duration-quick ease-garden',
                    isRight
                      ? 'border-garden-forest bg-rating-good text-garden-forest'
                      : isWrongPick
                        ? 'border-garden-gold bg-garden-gold-soft text-garden-gold-soft-text'
                        : isPick
                          ? 'border-garden-forest bg-garden-surface'
                          : 'border-garden-border bg-garden-surface hover:border-garden-muted',
                    answered && !isRight && !isWrongPick && 'text-garden-muted',
                  )}
                >
                  <span lang="en" className="min-w-0 break-words">
                    {option}
                  </span>
                  {isRight ? <CheckIcon width={20} height={20} aria-hidden="true" /> : null}
                  {isWrongPick ? (
                    <span className="shrink-0 text-[12px] font-bold">
                      {t('yourPick')}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {errorText && !answered ? (
        <p role="alert" className="text-center text-[14px] text-garden-muted">
          {errorText}
        </p>
      ) : null}

      {feedback ? <FeedbackPanel feedback={feedback} onNext={onNext} isLast={isLast} /> : null}
    </div>
  );
}

function FeedbackPanel({
  feedback,
  onNext,
  isLast,
}: {
  feedback: QuizScreenFeedback;
  onNext?: () => void;
  isLast?: boolean;
}) {
  const t = useTranslations('screens.quiz');
  return (
    <section
      aria-live="polite"
      className={gcn(
        'garden-rise flex flex-col gap-2 rounded-card border px-4 py-4 text-[15px]',
        feedback.correct
          ? 'border-garden-forest bg-rating-good'
          : 'border-garden-gold bg-garden-gold-soft',
      )}
    >
      <p
        className={gcn(
          'text-[17px] font-bold',
          feedback.correct ? 'text-garden-forest' : 'text-garden-gold-soft-text',
        )}
      >
        {feedback.correct ? t('right') : t('notQuite', { answer: feedback.correctAnswer })}
      </p>
      {feedback.correct ? (
        <p lang="en" className="text-garden-muted">
          {feedback.ipa
            ? t('wordIpa', { word: feedback.word, ipa: feedback.ipa })
            : feedback.word}
        </p>
      ) : null}
      {feedback.correct && feedback.example ? (
        <p lang="en" className="italic text-garden-muted">
          {t('quote', { text: feedback.example })}
        </p>
      ) : null}
      {feedback.explanation ? (
        <p lang="en" className="text-garden-text">
          {feedback.explanation}
        </p>
      ) : null}
      {feedback.note === 'mastered' ? (
        <p className="w-fit rounded-full bg-garden-surface px-2.5 py-0.5 text-[12px] font-semibold text-garden-forest">
          {t('mastered')}
        </p>
      ) : feedback.note === 'comesBack' ? (
        <p className="text-[13px] text-garden-muted">{t('comesBack')}</p>
      ) : null}
      <Button variant="primary" className="mt-1 w-full" onClick={onNext} autoFocus>
        {isLast ? t('finish') : t('next')}
      </Button>
    </section>
  );
}
