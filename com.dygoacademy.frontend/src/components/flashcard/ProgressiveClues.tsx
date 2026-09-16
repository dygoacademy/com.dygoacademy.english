'use client';

import { useState } from 'react';

import { cn } from '@/lib/utils';
import type { LexiconExampleSentence } from '@/types';

/**
 * FR-4.2's "Progressive Clue System" — tap to reveal one clue at a time
 * before flipping. The BRD (FR-4.2) names three steps (First-Letter → IPA
 * → Context Sentence); the master project schedule's Phase 2 task 2 names
 * four, inserting Audio between IPA and the sentence. The two documents
 * disagree the same way the billing route name does (see
 * `dygo_academy_api_surface.md` §3) — implemented here as the schedule
 * doc's more detailed four-step version, since Module 4's own front face
 * already promises "Word + Audio + POS" (FR-4.1), so audio being reachable
 * as a clue step is consistent with the rest of the card.
 *
 * First-letter step dropped entirely 2026-09-14 ("remove first letter in
 * the flash card, that doesn't help student in any aspect") -- the front
 * face already shows the full word before flipping (Module 4, FR-4.1), so
 * "starts with X…" was reproducing something already on screen, not a real
 * hint.
 *
 * Audio step dropped the same way 2026-09-15 ("remove audio beside the IPA
 * hint in the flash card") -- the front face already has its own always-
 * visible `AudioButton` (FR-4.1), so gating a second play button behind a
 * clue tap just duplicated a control that was already on screen, same
 * reasoning as the first-letter removal above. Down to two rungs now: IPA
 * hint -> In a sentence.
 *
 * A ladder, not independent toggles: each clue can only be revealed after
 * the one before it, matching "step-by-step" in both source documents'
 * wording.
 */
export type ClueLevel = 0 | 1 | 2;

const CLUE_LABELS = ['IPA hint', 'In a sentence'] as const;

export function ProgressiveClues({
  word,
  ipaUs,
  exampleSentence,
  level,
  onAdvance,
}: {
  word: string;
  ipaUs: string | null;
  exampleSentence: LexiconExampleSentence | null;
  level: ClueLevel;
  onAdvance: () => void;
}) {
  const maskedSentence = exampleSentence
    ? maskWord(exampleSentence.sentence, word)
    : 'No example sentence available.';

  const revealed: string[] = [];
  if (level >= 1) revealed.push(ipaUs ?? 'No IPA available.');
  if (level >= 2) revealed.push(maskedSentence);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-wrap justify-center gap-1.5 text-xs">
        {CLUE_LABELS.map((label, i) => {
          const step = (i + 1) as ClueLevel;
          const isNext = step === level + 1;
          const isRevealed = step <= level;
          return (
            <button
              key={label}
              type="button"
              disabled={!isNext}
              onClick={(e) => {
                // Same bubbling bug as AudioButton's Play button
                // (live-reported 2026-09-04): this renders inside
                // Flashcard's front face, which the card's own onClick
                // (the flip toggle) wraps entirely -- without this, tapping
                // any clue step also flips the card.
                e.stopPropagation();
                onAdvance();
              }}
              className={cn(
                'rounded-full border px-2 py-1 transition-colors',
                isRevealed && 'border-primary/40 bg-primary/10 text-primary',
                isNext && 'cursor-pointer hover:bg-accent',
                !isNext && !isRevealed && 'cursor-not-allowed opacity-40',
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
      {revealed.length > 0 && (
        <div className="flex flex-col items-center gap-1 text-center text-xs text-muted-foreground">
          {revealed.map((text) => (
            <p key={text}>{text}</p>
          ))}
        </div>
      )}
    </div>
  );
}

/** Blanks out the target word (case-insensitively, singular/plural-agnostic exact match only) in a context sentence. */
function maskWord(sentence: string, word: string): string {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return sentence.replace(new RegExp(escaped, 'gi'), '____');
}
