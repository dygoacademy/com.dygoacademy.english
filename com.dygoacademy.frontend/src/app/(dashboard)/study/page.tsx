'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { AudioButton } from '@/components/flashcard/AudioButton';
import { Flashcard } from '@/components/flashcard/Flashcard';
import { ProgressiveClues, type ClueLevel } from '@/components/flashcard/ProgressiveClues';
import { RatingButtons } from '@/components/flashcard/RatingButtons';
import { CONTENT_WIDTH } from '@/constants/layout';
import { ROUTES } from '@/constants/routes';
import { useRateWord } from '@/hooks/useRateWord';
import { useSrsStats } from '@/hooks/useSrsStats';
import { useStudySession } from '@/hooks/useStudySession';
import { formatIpa } from '@/lib/utils';
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
        <main className={`mx-auto flex min-h-screen ${CONTENT_WIDTH.default} flex-col items-center justify-center p-4`}>
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
  // Phase 3 Module 21 (FR-21.1) — only for the reward-hero streak callout
  // below; the session flow itself never depended on this and still
  // doesn't, so a slow/failed stats fetch can't block or break studying.
  const { data: stats } = useSrsStats();

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [clueLevel, setClueLevel] = useState<ClueLevel>(0);
  // FR-13.1 -- tallied by which of RatingButtons' two buttons was pressed
  // (AGAIN/HARD are both "Didn't know", held or not; GOOD/EASY are both
  // "Knew it"), matching the UI's own two-button framing rather than the
  // four-value SRS rating underneath it.
  const [tally, setTally] = useState({ knew: 0, missed: 0 });

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
    setTally((t) =>
      rating === 'AGAIN' || rating === 'HARD'
        ? { ...t, missed: t.missed + 1 }
        : { ...t, knew: t.knew + 1 },
    );
    setIndex((i) => i + 1);
  }

  if (isLoading) {
    return (
      <main className={`mx-auto flex min-h-screen ${CONTENT_WIDTH.default} flex-col items-center justify-center gap-3 p-4 text-center`}>
        <p className="text-sm text-muted-foreground">Loading your due cards…</p>
      </main>
    );
  }

  if (isError) {
    return (
      <main className={`mx-auto flex min-h-screen ${CONTENT_WIDTH.default} flex-col items-center justify-center gap-3 p-4 text-center`}>
        <p className="text-sm text-muted-foreground">Couldn&apos;t load this session.</p>
        <button type="button" onClick={() => void refetch()} className="text-sm underline underline-offset-4">
          Try again
        </button>
      </main>
    );
  }

  if (done) {
    if (cards.length === 0) {
      return (
        <main className={`mx-auto flex min-h-screen ${CONTENT_WIDTH.default} flex-col items-center justify-center gap-3 p-4 text-center`}>
          <p className="text-lg font-semibold">Nothing due right now.</p>
          <p className="text-sm text-muted-foreground">
            New or overdue words will show up here as they come due.
          </p>
          <Link href={ROUTES.home} className="text-sm underline underline-offset-4">
            Back to topics
          </Link>
        </main>
      );
    }

    // Phase 3 Module 21 (FR-21.1) — restyles FR-13.1's plain knew/missed
    // line into the "Dygo Learning Path" concept's reward-hero treatment.
    // The underlying data is identical to FR-13.1's (tally.knew/missed,
    // the same topicId-gated CTA) -- this is presentation only. No mastery
    // claim ("+N words mastered") is made here: that would need a
    // before/after repetitions comparison this page doesn't have, and the
    // implementation plan is explicit that this screen shouldn't promise a
    // number it can't back up. `stats?.current_streak_days` is the one
    // real number available beyond the session's own tally, so it's the
    // one used for the streak callout -- omitted entirely while stats is
    // still loading rather than guessed at.
    return (
      <main className={`mx-auto flex min-h-screen ${CONTENT_WIDTH.default} flex-col items-center justify-center gap-4 p-4 text-center`}>
        <div className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-primary/30 bg-gradient-to-b from-primary/10 to-transparent p-6">
          <span className="text-4xl" aria-hidden="true">
            🔥
          </span>
          <p className="text-lg font-semibold">
            {stats?.current_streak_days
              ? `${stats.current_streak_days}-day streak protected`
              : "That's every card for now."}
          </p>
          <p className="text-sm text-muted-foreground">
            You reviewed {cards.length} card{cards.length === 1 ? '' : 's'} this session.
          </p>
          <div className="flex gap-3">
            <div className="rounded-xl border bg-card px-4 py-2">
              <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                {tally.knew}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Knew it
              </div>
            </div>
            <div className="rounded-xl border bg-card px-4 py-2">
              <div className="text-lg font-semibold text-rose-600 dark:text-rose-400">
                {tally.missed}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Didn&apos;t know
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          {topicId && (
            <Link
              href={`/quiz?topicId=${topicId}`}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              Quiz this topic
            </Link>
          )}
          <Link href={ROUTES.home} className="text-sm underline underline-offset-4">
            Back to topics
          </Link>
        </div>
      </main>
    );
  }

  const example = card.example_sentences?.[0] ?? null;
  const isListening = mode === 'LISTENING';
  const isReverse = mode === 'REVERSE';

  return (
    <main className={`mx-auto flex min-h-screen ${CONTENT_WIDTH.default} flex-col gap-5 p-4`}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {index + 1} of {cards.length} · {mode.toLowerCase()}
        </span>
        <Link href={ROUTES.home} aria-label="End session">
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
          <div className="relative flex h-96 w-full flex-col items-center overflow-y-auto rounded-2xl border-2 bg-card p-6 text-center shadow-sm">
            {/* Word/audio/part-of-speech (STANDARD sub-mode) plus the clue
                and status badges below it are grouped into one centered
                block, with Play pulled out into a floating bottom-right
                corner dock -- live-requested 2026-09-18 ("give me options
                that help student to focus and easier to use in right
                hand"), same `layout="corner"` treatment as WordCardModal/
                GuestWordTrial (see AudioButton.tsx's comment for the full
                history). "Listen and recall" deliberately keeps its Play
                button large and centered, unchanged -- that screen's whole
                point is that one button, so there's nothing for it to
                compete with the way there is on the word-recall front or
                on the back below. */}
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
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
            {!isReverse && !isListening && (
              <AudioButton src={card.audio_url} layout="corner" className="absolute bottom-4 right-4" />
            )}
          </div>
        }
        back={
          <div className="relative flex h-96 w-full flex-col rounded-2xl border-2 bg-card p-6 shadow-sm">
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto pb-16 pr-14">
              <span className="text-2xl font-semibold">{card.source_word}</span>
              {/* Back side redesigned into labeled sections -- live-requested
                  2026-09-18 ("the data in the flash card is messy hard to
                  learn ... recommend to sort all data with UI/UX super easy
                  for user"), applied consistently with WordCardModal/
                  GuestWordTrial since all three are documented as mirroring
                  one another's layout. See WordCardModal.tsx's own comment
                  on this block for the full before/after reasoning, including
                  the 2026-09-18 reordering ("The meaning with stick with type
                  of word that is make sence?" -> confirmed: Word / IPA+Play /
                  part-of-speech+Meaning / Synonyms-Antonyms-Example) that
                  grouped IPA+Play (how to say it) separately from
                  part-of-speech+Meaning (what it is and means), and the
                  same-day follow-up ("Word / IPA / Play Sound ... Move Play
                  Sound to another line ... use radix ui to make Play Sound
                  easy to see and click") that split IPA and Play onto their
                  own lines and rebuilt Play as a full-width Button --
                  see AudioButton.tsx's own comment for the full reasoning.

                  Play moved again, same day, to the very bottom of the card
                  ("Could you please move the Play Sound to the buttom?") --
                  back then, `mt-auto` pinned it to the bottom of the
                  scrollable flex column. Superseded 2026-09-18 by the corner
                  dock below (same change as WordCardModal/GuestWordTrial):
                  Play now sits outside the scrollable inner div entirely, so
                  it stays fixed in the same corner regardless of scroll
                  position, which `mt-auto` inside a scrolling column could
                  not guarantee once content got long enough to scroll. */}
              <span className="font-mono text-xs text-muted-foreground">
                {formatIpa(card.ipa_us) ? `US ${formatIpa(card.ipa_us)}` : 'US —'} ·{' '}
                {formatIpa(card.ipa_uk) ? `UK ${formatIpa(card.ipa_uk)}` : 'UK —'}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Meaning
                  </p>
                  {card.part_of_speech && (
                    <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {card.part_of_speech}
                    </span>
                  )}
                </div>
                <p className="text-base leading-snug">{card.definition_en ?? 'No definition yet.'}</p>
              </div>
              {(card.synonyms?.length ?? 0) > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Synonyms
                  </span>
                  {card.synonyms.map((s) => (
                    <span
                      key={s.word}
                      className="rounded-full border border-emerald-600/30 bg-emerald-600/10 px-2 py-0.5 text-xs text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-400"
                    >
                      {s.word}
                    </span>
                  ))}
                </div>
              )}
              {(card.antonyms?.length ?? 0) > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Antonyms
                  </span>
                  {card.antonyms.map((a) => (
                    <span
                      key={a.word}
                      className="rounded-full border border-rose-600/30 bg-rose-600/10 px-2 py-0.5 text-xs text-rose-700 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-400"
                    >
                      {a.word}
                    </span>
                  ))}
                </div>
              )}
              {example && (
                <div className="rounded-lg bg-muted/50 p-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Example
                  </p>
                  <p className="text-xs italic text-muted-foreground">&quot;{example.sentence}&quot;</p>
                </div>
              )}
            </div>
            <AudioButton
              src={card.audio_url}
              label="Play pronunciation again"
              layout="corner"
              className="absolute bottom-4 right-4"
            />
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
