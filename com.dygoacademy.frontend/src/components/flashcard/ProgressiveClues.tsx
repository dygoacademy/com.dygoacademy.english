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
 * A ladder, not four independent toggles: each clue can only be revealed
 * after the one before it, matching "step-by-step" in both source
 * documents' wording.
 */
export type ClueLevel = 0 | 1 | 2 | 3 | 4;

const CLUE_LABELS = ['First letter', 'IPA hint', 'Audio', 'In a sentence'] as const;

export function ProgressiveClues({
  word,
  ipaUs,
  onPlayAudio,
  hasAudio,
  exampleSentence,
  level,
  onAdvance,
}: {
  word: string;
  ipaUs: string | null;
  onPlayAudio: () => void;
  hasAudio: boolean;
  exampleSentence: LexiconExampleSentence | null;
  level: ClueLevel;
  onAdvance: () => void;
}) {
  const maskedSentence = exampleSentence
    ? maskWord(exampleSentence.sentence, word)
    : 'No example sentence available.';

  const revealed: string[] = [];
  if (level >= 1) revealed.push(`Starts with “${word[0]?.toUpperCase() ?? '?'}…”`);
  if (level >= 2) revealed.push(ipaUs ?? 'No IPA available.');
  if (level >= 3) revealed.push('Audio played.');
  if (level >= 4) revealed.push(maskedSentence);

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
                if (step === 3) onPlayAudio();
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
              {step === 3 && !hasAudio ? ' (unavailable)' : ''}
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
