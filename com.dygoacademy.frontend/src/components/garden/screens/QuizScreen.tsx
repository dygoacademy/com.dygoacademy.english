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
 * Garden quiz, question screen (U5-5; canvas "Adult · Quiz" Q1–Q5, UI-5
 * QZ-1): the ReviewScreen header (Close, label with the count, progress
 * vine), one white card (radius 26, 1px border, card lift) with the type
 * tag, the question (the sentence with its gap pill, the asked word, or
 * the big play button) and the hint, then the answer (a text field +
 * "Check", or the options), then the feedback panel at the bottom.
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
  /** Reference fixtures: text already typed (Q4). */
  initialAnswer?: string;
  /** Reference fixtures: the option already picked (Q2, Q3). */
  initialPick?: string | null;
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

/** The backend masks the word with five underscores (`quiz-generator.ts`). */
const QUIZ_GAP = /_{5,}/;
const QUOTED = /^["“]([\s\S]*)["”]$/;

/**
 * CLOZE and CONTEXTUAL_CHOICE: the sentence without its task prefix and
 * quote marks, split around the gap. Null when there's no gap (the prompt
 * is then shown as it is).
 */
export function sentenceParts(
  type: QuizType,
  prompt: string,
): { before: string; after: string } | null {
  if (type !== 'CLOZE' && type !== 'CONTEXTUAL_CHOICE') return null;
  const stripped = quizPrompt(type, prompt).trim();
  const sentence = QUOTED.exec(stripped)?.[1] ?? stripped;
  const gap = QUIZ_GAP.exec(sentence);
  if (!gap) return null;
  return {
    before: sentence.slice(0, gap.index),
    after: sentence.slice(gap.index + gap[0].length),
  };
}

const MATCHING_PROMPT = /^which word is an? (synonym|antonym) of\s*["“](.+?)["”]\s*\?\s*$/i;

/** MATCHING: `Which word is a synonym|antonym of "X"?`, or null if it doesn't parse. */
export function matchingPrompt(
  prompt: string,
): { relation: 'synonym' | 'antonym'; word: string } | null {
  const match = MATCHING_PROMPT.exec(prompt.trim());
  if (!match) return null;
  return {
    relation: match[1].toLowerCase() === 'antonym' ? 'antonym' : 'synonym',
    word: match[2].trim(),
  };
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
  initialAnswer,
  initialPick,
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
        initialAnswer={initialAnswer}
        initialPick={initialPick}
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
  initialAnswer,
  initialPick,
}: Pick<
  QuizScreenProps,
  | 'question'
  | 'feedback'
  | 'hint'
  | 'onHint'
  | 'onSubmit'
  | 'onNext'
  | 'errorText'
  | 'isLast'
  | 'initialAnswer'
  | 'initialPick'
> & { submitting: boolean }) {
  const t = useTranslations('screens.quiz');
  const [text, setText] = React.useState(initialAnswer ?? '');
  const [pick, setPick] = React.useState<string | null>(initialPick ?? null);
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

        <QuestionPrompt question={question} feedback={feedback} />

        {isText ? (
          hint.status === 'shown' ? (
            <div
              role="note"
              aria-label={t('hintTitle')}
              className="garden-rise flex flex-col gap-0.5 rounded-[14px] bg-garden-water-soft px-3 py-2.5 text-[14px] text-garden-water-text"
            >
              <span lang={hint.ipa ? 'en' : undefined} className="font-bold">
                {hint.ipa || t('noIpa')}
              </span>
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
            // Not on Listen and spell: on a phone the keyboard would open over
            // the play button, and tapping play closes it again (iOS zoom).
            autoFocus={question.type !== 'DICTATION'}
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
              'h-[54px] rounded-[16px] bg-garden-surface px-4 text-[17px] text-garden-text caret-garden-forest',
              'placeholder:text-garden-placeholder focus:outline-none',
              answered
                ? feedback?.correct
                  ? 'border-2 border-garden-forest bg-rating-good'
                  : 'border-2 border-stage-tree-fruit bg-garden-gold-soft'
                : text
                  ? 'border border-garden-forest'
                  : 'border border-garden-border',
            )}
          />
          {answered ? null : (
            <Button
              type="submit"
              variant="forest"
              loading={submitting}
              disabled={!text.trim()}
              // Canvas: 58px, and still forest (dimmed) while the field is empty.
              className="h-[58px] disabled:bg-garden-forest disabled:text-white disabled:opacity-[.45] disabled:shadow-press-forest"
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
                    'flex min-h-[54px] w-full items-center justify-between gap-2 rounded-[16px] px-4 py-3 text-left text-[16px] font-semibold',
                    'transition-colors duration-quick ease-garden',
                    isRight
                      ? 'border-2 border-garden-forest bg-rating-good text-garden-forest'
                      : isWrongPick
                        ? 'border-2 border-stage-tree-fruit bg-garden-gold-soft text-garden-gold-soft-text'
                        : answered
                          ? 'border border-garden-border bg-garden-surface text-garden-placeholder'
                          : isPick
                            ? 'border border-garden-forest bg-garden-surface'
                            : 'border border-garden-border bg-garden-surface hover:border-garden-muted',
                  )}
                >
                  <span lang="en" className="min-w-0 break-words">
                    {option}
                  </span>
                  {isRight ? <CheckIcon width={20} height={20} aria-hidden="true" /> : null}
                  {isWrongPick ? (
                    <span className="shrink-0 text-[12px] font-bold">{t('yourPick')}</span>
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

      {feedback ? (
        <FeedbackPanel
          feedback={feedback}
          word={
            (question.type === 'MATCHING' ? matchingPrompt(question.prompt)?.word : null) ??
            feedback.word
          }
          definition={
            feedback.explanation || (hint.status === 'shown' ? hint.definition : null) || null
          }
          onNext={onNext}
          isLast={isLast}
        />
      ) : null}
    </div>
  );
}

/**
 * The question itself (canvas Q1–Q5): the sentence with its gap pill
 * (CLOZE, CONTEXTUAL_CHOICE), the asked word (MATCHING), or the big play
 * button (DICTATION). A prompt that doesn't parse is shown as it is.
 */
function QuestionPrompt({
  question,
  feedback,
}: {
  question: QuizScreenQuestion;
  feedback: QuizScreenFeedback | null;
}) {
  const t = useTranslations('screens.quiz');

  if (question.type === 'DICTATION') {
    return (
      <div className="flex flex-col items-center gap-[10px] pb-0.5 pt-1.5">
        <AudioButton
          src={question.audioUrl ?? null}
          label={t('listen')}
          playClassName="h-[84px] w-[84px] shadow-press-forest [&_svg]:h-9 [&_svg]:w-9"
        />
        <p className="text-center text-[15px] text-garden-muted">{t('listenQ')}</p>
      </div>
    );
  }

  const matching = question.type === 'MATCHING' ? matchingPrompt(question.prompt) : null;
  if (matching) {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-[16px] text-garden-muted">
          {t(matching.relation === 'antonym' ? 'matchQAntonym' : 'matchQ')}
        </p>
        <p lang="en" className="break-words font-display text-[38px] font-semibold leading-[1.05]">
          {matching.word}
        </p>
      </div>
    );
  }

  const parts = sentenceParts(question.type, question.prompt);
  if (parts) {
    const state = feedback ? (feedback.correct ? 'right' : 'wrong') : 'empty';
    return (
      <p lang="en" className="break-words font-display text-[22px] font-medium leading-[1.45]">
        {parts.before}
        <span
          data-gap={state}
          className={gcn(
            // min-width 88 + 2×8 padding: the canvas pill is content-box (104 wide empty).
            'mx-0.5 inline-block min-w-[104px] rounded-[10px] border-b-2 px-2 text-center font-body text-[18px] font-bold leading-[1.5]',
            state === 'right'
              ? 'border-garden-success bg-rating-good text-garden-forest'
              : state === 'wrong'
                ? 'border-stage-tree-fruit bg-garden-gold-soft text-garden-gold-soft-text'
                : 'border-garden-muted bg-garden-bg text-garden-gold-soft-text',
          )}
        >
          {feedback ? feedback.correctAnswer : null}
        </span>
        {parts.after}
      </p>
    );
  }

  return (
    <p lang="en" className="min-w-0 break-words text-[20px] font-semibold leading-[1.35]">
      {quizPrompt(question.type, question.prompt)}
    </p>
  );
}

function FeedbackPanel({
  feedback,
  word,
  definition,
  onNext,
  isLast,
}: {
  feedback: QuizScreenFeedback;
  /** The word the panel is about (MATCHING: the asked word, not the option). */
  word: string;
  /** Wrong answers: `explanation`, else the hint's definition if it was fetched. */
  definition: string | null;
  onNext?: () => void;
  isLast?: boolean;
}) {
  const t = useTranslations('screens.quiz');
  return (
    <section
      aria-live="polite"
      className={gcn(
        'garden-rise mt-auto flex flex-col gap-1.5 rounded-card border p-4 text-[15px]',
        feedback.correct
          ? 'border-garden-forest bg-rating-good'
          : 'border-garden-gold-border bg-garden-gold-soft',
      )}
    >
      <p
        className={gcn(
          'text-[18px] font-bold',
          feedback.correct ? 'text-garden-forest' : 'text-garden-gold-soft-text',
        )}
      >
        {feedback.correct ? t('right') : t('notQuite', { answer: feedback.correctAnswer })}
      </p>
      {feedback.correct ? (
        <>
          <p lang="en" className="text-garden-muted">
            {feedback.ipa ? t('wordIpa', { word, ipa: feedback.ipa }) : word}
          </p>
          {feedback.example ? (
            <p lang="en" className="font-display italic leading-[1.45] text-garden-example">
              {t('quote', { text: feedback.example })}
            </p>
          ) : null}
          {feedback.note === 'mastered' ? (
            <p className="w-fit rounded-tile bg-garden-surface px-2.5 py-1 text-[12px] font-bold leading-[1.35] text-garden-forest">
              {t('mastered')}
            </p>
          ) : null}
        </>
      ) : (
        <>
          <p lang="en" className="text-garden-example">
            {definition ? `${word} · ${definition}` : word}
          </p>
          {feedback.note === 'comesBack' ? (
            <p className="text-[13px] text-garden-gold-soft-text">{t('comesBack')}</p>
          ) : null}
        </>
      )}
      <Button variant="primary" className="mt-1.5 w-full" onClick={onNext} autoFocus>
        {isLast ? t('finish') : t('next')}
      </Button>
    </section>
  );
}
