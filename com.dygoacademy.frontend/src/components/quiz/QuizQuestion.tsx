'use client';

import { useState } from 'react';

import { AudioButton } from '@/components/flashcard/AudioButton';
import { useQuizHint } from '@/hooks/useQuizHint';
import type { QuizItem, QuizType } from '@/types';

const TYPE_LABELS: Record<QuizType, string> = {
  CLOZE: 'Fill in the blank',
  DICTATION: 'Listening & spelling',
  MATCHING: 'Synonym / antonym match',
  CONTEXTUAL_CHOICE: 'Choose the word',
};

/**
 * `promptFor` on the backend (quiz-generator.ts) prefixes CLOZE and
 * CONTEXTUAL_CHOICE prompts with their own plain-English task label --
 * "Fill in the blank: ..." / "Choose the word that completes the
 * sentence: ..." -- because that same string is replayed to Gemini later
 * for the FR-5.5 nuance explanation (QuizService.answer), so it can't be
 * trimmed at the source without touching that flow. On screen it duplicated
 * the TYPE_LABELS caption already shown above the prompt (live-reported
 * 2026-09-05, screenshot showing "FILL IN THE BLANK" directly above "Fill
 * in the blank: ..."), so the redundant lead-in is stripped here, for
 * display only, leaving just the quoted sentence under the caption.
 */
const PROMPT_PREFIXES: Partial<Record<QuizType, RegExp>> = {
  CLOZE: /^fill in the blank:\s*/i,
  CONTEXTUAL_CHOICE: /^choose the word that completes the sentence:\s*/i,
};

function displayPrompt(item: QuizItem): string {
  const prefix = PROMPT_PREFIXES[item.type];
  return prefix ? item.prompt.replace(prefix, '') : item.prompt;
}

/**
 * Module 5 — renders one quiz item, regardless of FR-5.1–5.4 type. Only
 * ever branches on `item.answerMode` (TEXT vs CHOICE), the flag the backend
 * exists specifically so this component doesn't need its own
 * `type === 'CLOZE' || type === 'DICTATION'` conditionals — see
 * `quiz-generator.ts`'s `QuizItem.answerMode` on the backend.
 *
 * On-demand hint added 2026-09-16 ("when I do the fill in blank I don't
 * know which word should be fill in ... some suggestion like IPA and
 * explain meaning"). Only offered for `answerMode === 'TEXT'` items (CLOZE,
 * DICTATION) -- CHOICE items (MATCHING, CONTEXTUAL_CHOICE) already have an
 * options list to fall back on, so a hint there would just be a second way
 * to skip straight to recognition instead of recall. On-demand rather than
 * auto-shown, per the same conversation: an always-visible hint would turn
 * a recall test into a translation exercise and undermine what the SRS
 * review flow assumes "correct" means.
 */
export function QuizQuestion({
  item,
  disabled,
  onSubmit,
}: {
  item: QuizItem;
  disabled?: boolean;
  onSubmit: (answer: string, hintUsed: boolean) => void;
}) {
  const [text, setText] = useState('');
  const hint = useQuizHint();
  const hintUsed = hint.data != null;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border-2 bg-card p-6 shadow-sm">
      <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
        {TYPE_LABELS[item.type]}
      </span>
      <p className="text-base leading-snug">{displayPrompt(item)}</p>

      {/* `self-start` dropped 2026-09-18 -- AudioButton's `inline` layout
          is a fused, full-width bar now, so the old shrink-to-content
          alignment no longer applies (see AudioButton.tsx's comment). */}
      {item.type === 'DICTATION' && <AudioButton src={item.audioUrl ?? null} />}

      {item.answerMode === 'TEXT' &&
        (hint.data ? (
          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
            <span>{hint.data.ipaUs ?? 'No IPA available for this word.'}</span>
            <span>{hint.data.definition ?? 'No definition available for this word.'}</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => hint.mutate(item.id)}
            disabled={hint.isPending}
            className="self-start text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-50"
          >
            {hint.isPending ? 'Loading hint…' : 'Need a hint?'}
          </button>
        ))}

      {item.answerMode === 'TEXT' ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) onSubmit(text.trim(), hintUsed);
          }}
        >
          <input
            key={item.id}
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={disabled}
            placeholder="Type your answer…"
            // These four together stop iOS/Safari from offering a
            // predictive-text bar, autocorrecting, or auto-capitalizing
            // the answer -- live-requested 2026-09-05: a spelling/recall
            // quiz defeats its own purpose if the keyboard can just
            // suggest or fix the word for the student. text-base (16px),
            // not text-sm (14px): same iOS auto-zoom-on-focus issue fixed
            // elsewhere (CreateTopicModal) -- under 16px, Safari zooms the
            // whole page in on focus and doesn't zoom back out on its own.
            autoCorrect="off"
            autoCapitalize="off"
            autoComplete="off"
            spellCheck={false}
            className="rounded-lg border bg-background px-3 py-2 text-base disabled:opacity-50"
          />
          {/* Disabled state changed from a 50%-opacity copy of the same
              solid fill to a genuinely different treatment (outline,
              muted text, transparent fill) 2026-09-19 (Phase 2 FR-12.3 --
              audit finding: right after typing an answer, Submit briefly
              read as still-disabled because the only difference was a
              subtle shade shift, not a shape/fill change). */}
          <button
            type="submit"
            disabled={disabled || !text.trim()}
            className="rounded-lg border border-transparent bg-primary px-3 py-2 text-sm text-primary-foreground transition-colors disabled:border-border disabled:bg-transparent disabled:text-muted-foreground"
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
              onClick={() => onSubmit(option, false)}
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
