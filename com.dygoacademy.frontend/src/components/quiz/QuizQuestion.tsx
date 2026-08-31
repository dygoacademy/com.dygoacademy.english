'use client';

import { useState } from 'react';

import { AudioButton } from '@/components/flashcard/AudioButton';
import type { QuizItem, QuizType } from '@/types';

const TYPE_LABELS: Record<QuizType, string> = {
  CLOZE: 'Fill in the blank',
  DICTATION: 'Listening & spelling',
  MATCHING: 'Synonym / antonym match',
  CONTEXTUAL_CHOICE: 'Choose the word',
};

/**
 * Module 5 — renders one quiz item, regardless of FR-5.1–5.4 type. Only
 * ever branches on `item.answerMode` (TEXT vs CHOICE), the flag the backend
 * exists specifically so this component doesn't need its own
 * `type === 'CLOZE' || type === 'DICTATION'` conditionals — see
 * `quiz-generator.ts`'s `QuizItem.answerMode` on the backend.
 */
export function QuizQuestion({
  item,
  disabled,
  onSubmit,
}: {
  item: QuizItem;
  disabled?: boolean;
  onSubmit: (answer: string) => void;
}) {
  const [text, setText] = useState('');

  return (
    <div className="flex flex-col gap-4 rounded-2xl border-2 bg-card p-6 shadow-sm">
      <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
        {TYPE_LABELS[item.type]}
      </span>
      <p className="text-base leading-snug">{item.prompt}</p>

      {item.type === 'DICTATION' && <AudioButton src={item.audioUrl ?? null} className="self-start" />}

      {item.answerMode === 'TEXT' ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) onSubmit(text.trim());
          }}
        >
          <input
            key={item.id}
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={disabled}
            placeholder="Type your answer…"
            className="rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={disabled || !text.trim()}
            className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            Submit
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-2">
          {item.options?.map((option) => (
            <button
              key={option}
              type="button"
              disabled={disabled}
              onClick={() => onSubmit(option)}
              className="rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-accent disabled:opacity-50"
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
