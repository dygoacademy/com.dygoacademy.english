'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { AudioButton } from '@/components/flashcard/AudioButton';
import { Flashcard } from '@/components/flashcard/Flashcard';
import { ProgressiveClues, type ClueLevel } from '@/components/flashcard/ProgressiveClues';
import { RatingButtons } from '@/components/flashcard/RatingButtons';
import { useRateWord } from '@/hooks/useRateWord';
import { useStudySession } from '@/hooks/useStudySession';
import type { DueCard, SessionMode, SrsRating } from '@/types';

/**
 * Module 4 — the real study session (Phase 2), replacing the Phase 0/1
 * MOCK_QUEUE placeholder this page shipped with. `Flashcard` and
 * `RatingButtons` are unchanged from that scaffold (see their own file
 * comments) — what's new here is real data (`useStudySession`, backed by
 * `POST /srs/sessions`), real rating submission (`useRateWord`, `POST
 * /srs/rate`), and FR-4.2's progressive clue engine.
 *
 * Mode and topic scope come from the URL (`?topicId=&mode=`) rather than
 * component state seeded elsewhere, so a link from the topic page or a
 * push-notification deep link (FR-6.5 — "1-tap links... routing directly
 * into /study") can select both without this page needing to know who
 * sent it here.
 *
 * `max-w-xs` -> `max-w-sm` on every screen state here -- live-reported
 * 2026-09-05 ("the quiz and flash card screen too small"), matching the
 * same width bump already made to the guest word-trial card that day.
 */
const VALID_MODES: SessionMode[] = ['STANDARD', 'REVERSE', 'LISTENING'];

/**
 * `useSearchParams()` opts this subtree out of static rendering unless it's
 * behind a Suspense boundary (Next.js App Router requirement) — split out
 * so the outer `StudyPage` can provide a fallback without every hook above
 * needing to guard against a still-`null` searchParams.
 */
export default function StudyPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center p-4">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </main>
      }
    >
      <StudySessionScreen />
    </Suspense>
  );
}

function StudySessionScreen() {
  const searchParams = useSearchParams();
  const topicId = searchParams.get('topicId') ?? undefined;
  const modeParam = searchParams.get('mode')?.toUpperCase();
  const mode: SessionMode = VALID_MODES.includes(modeParam as SessionMode)
    ? (modeParam as SessionMode)
    : 'STANDARD';

  const { data, isLoading, isError, refetch } = useStudySession(topicId, mode);
  const rateWord = useRateWord();

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [clueLevel, setClueLevel] = useState<ClueLevel>(0);

  // Snapshot the due-card batch once per session (keyed by topicId+mode),
  // instead of reading `data.cards` live on every render -- live-reported
  // 2026-09-15 ("click to knew it and didn't know in the flash card the
  // total word is decrease"). `useRateWord`'s onSuccess invalidates every
  // `['srs', ...]` query so *other* screens (due-count, stats) pick up the
  // word's new next_due_at, but this session's own `useStudySession` query
  // shares that same `['srs', 'sessions', ...]` prefix, so it was one of
  // the queries getting invalidated -- refetching mid-session and coming
  // back with one fewer card each time (the one just rated is no longer
  // due). `cards.length` fed directly from that live result, so the "X of
  // N" denominator and the flashcard queue itself shrank underneath the
  // student on every single rating, sometimes ending the session early. A
  // session is meant to be a fixed batch worked through by `index`, not a
  // live view of what's still due -- frozen here the first time each
  // topicId/mode combination loads, and re-frozen only when the student
  // actually starts a *different* session.
  const sessionKey = `${topicId ?? 'all'}:${mode}`;
  const [session, setSession] = useState<{ key: string; cards: DueCard[] } | null>(null);

  // Adjusted during render, not in a `useEffect` -- React explicitly
  // sanctions calling `setState` mid-render to reset/derive state when a
  // key changes (it re-renders immediately with the new value before the
  // browser paints), which matters here specifically: an effect-based
  // version of this snapshot briefly rendered `cards` as `[]` -- and thus
  // the "nothing due" screen -- for one frame every time `data` first
  // arrived, before the effect had a chance to run.
  if (data && session?.key !== sessionKey) {
    setSession({ key: sessionKey, cards: data.cards });
    setIndex(0);
  }

  const cards = session?.key === sessionKey ? session.cards : [];
  const card: DueCard | undefined = cards[index];
  const done = !isLoading && index >= cards.length;

  // Reset per-card UI state whenever the visible card changes (including
  // the initial data load, when index is already 0 but card just appeared).
  useEffect(() => {
    setFlipped(false);
    setClueLevel(0);
  }, [card?.topic_word_id]);

  function handleRate(rating: SrsRating) {
    if (!card) return;
    rateWord.mutate({ topicWordId: card.topic_word_id, rating });
    setIndex((i) => i + 1);
  }

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-3 p-4 text-center">
        <p className="text-sm text-muted-foreground">Loading your due cards…</p>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-3 p-4 text-center">
        <p className="text-sm text-muted-foreground">Couldn&apos;t load this session.</p>
        <button type="button" onClick={() => void refetch()} className="text-sm underline underline-offset-4">
          Try again
        </button>
      </main>
    );
  }

  if (done) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-3 p-4 text-center">
        <p className="text-lg font-semibold">
          {cards.length === 0 ? 'Nothing due right now.' : "That's every card for now."}
        </p>
        <p className="text-sm text-muted-foreground">
          {cards.length === 0
            ? 'New or overdue words will show up here as they come due.'
            : `You rated ${cards.length} card${cards.length === 1 ? '' : 's'} this session.`}
        </p>
        <Link href="/topics" className="text-sm underline underline-offset-4">
          Back to topics
        </Link>
      </main>
    );
  }

  const example = card.example_sentences?.[0] ?? null;
  const isListening = mode === 'LISTENING';
  const isReverse = mode === 'REVERSE';

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col gap-5 p-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {index + 1} of {cards.length} · {mode.toLowerCase()}
        </span>
        <Link href="/topics" aria-label="End session">
          ✕
        </Link>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${((index + 1) / cards.length) * 100}%` }}
        />
      </div>

      <Flashcard
        className="h-96 w-full"
        flipped={flipped}
        onToggle={() => setFlipped((f) => !f)}
        front={
          <div className="flex h-96 w-full flex-col items-center justify-center gap-3 overflow-y-auto rounded-2xl border-2 bg-card p-6 text-center shadow-sm">
            {isReverse ? (
              <>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Guess the word
                </p>
                <p className="text-lg leading-snug">
                  {example ? maskForReverse(example.sentence, card.source_word) : card.definition_en}
                </p>
              </>
            ) : isListening ? (
              <>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Listen and recall
                </p>
                <AudioButton src={card.audio_url} className="mt-2" />
              </>
            ) : (
              <>
                <p className="text-4xl font-semibold">{card.source_word}</p>
                <AudioButton src={card.audio_url} />
                {card.part_of_speech && (
                  <span className="font-mono text-xs text-muted-foreground">
                    {card.part_of_speech}
                  </span>
                )}
              </>
            )}

            {!isReverse && (
              <div className="mt-2">
                <ProgressiveClues
                  word={card.source_word}
                  ipaUs={card.ipa_us}
                  exampleSentence={example}
                  level={clueLevel}
                  onAdvance={() => setClueLevel((l) => (l < 2 ? ((l + 1) as ClueLevel) : l))}
                />
              </div>
            )}

            {card.is_new && (
              <span className="mt-1 rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
                New card
              </span>
            )}
            {card.is_leech && (
              <span className="mt-1 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[10px] text-destructive">
                Leech · needs extra practice
              </span>
            )}
          </div>
        }
        back={
          <div className="flex h-96 w-full flex-col gap-2.5 overflow-y-auto rounded-2xl border-2 bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-semibold">{card.source_word}</span>
              <AudioButton src={card.audio_url} label="Play pronunciation again" />
            </div>
            <span className="font-mono text-xs text-muted-foreground">
              {card.ipa_us ?? '—'} · {card.ipa_uk ?? '—'}
            </span>
            <p className="text-base leading-snug">{card.definition_en ?? 'No definition yet.'}</p>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {card.synonyms?.map((s) => (
                <span key={s.word} className="rounded-full border px-2 py-0.5">
                  = {s.word}
                </span>
              ))}
              {card.antonyms?.map((a) => (
                <span key={a.word} className="rounded-full border px-2 py-0.5">
                  ≠ {a.word}
                </span>
              ))}
            </div>
            {example && (
              <p className="mt-auto text-xs italic text-muted-foreground">
                &quot;{example.sentence}&quot;
              </p>
            )}
          </div>
        }
      />

      <RatingButtons onRate={handleRate} disabled={rateWord.isPending} />
    </main>
  );
}

/** Reverse mode's front face: the sentence with the target word blanked out, so "definition -> word" doesn't give away the exact term via the example. */
function maskForReverse(sentence: string, word: string): string {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return sentence.replace(new RegExp(escaped, 'gi'), '_____');
}
