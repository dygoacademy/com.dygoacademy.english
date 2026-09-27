'use client';

import Link from 'next/link';
import { useState } from 'react';

import { AudioButton } from '@/components/flashcard/AudioButton';
import { Flashcard } from '@/components/flashcard/Flashcard';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CONTENT_WIDTH } from '@/constants/layout';
import { ROUTES } from '@/constants/routes';
import { apiClient, ApiError } from '@/lib/api-client';
import { formatIpa } from '@/lib/utils';
import type { GuestWordCard } from '@/types/word';

type Stage = 'input' | 'card' | 'not-found';

/**
 * Wireframe 1a — "Try one word before signing up."
 *
 * Rewritten 2026-09-05 (BA flow) from a fixed mock to a real
 * GET /words/guest-lookup call -- see that commit for the flow itself.
 *
 * Rewritten again same day onto shadcn/ui's Card/Input ("the first page
 * look not nice ... use the shadcd then align in the center"): the input
 * and not-found stages were bare text floating on the page with no
 * container, which is what read as unfinished. Both now sit in a Card,
 * centered by the flex/justify-center already on the page's <main>
 * (src/app/page.tsx). The found-word stage keeps its own layout as-is,
 * without an outer Card -- Flashcard already has its own bordered/shadowed
 * face, and framing a card inside a card just doubles the border.
 *
 * The "DYGO" caption in each Card's header was originally a tiny
 * muted-mono label, changed to a proper bold title same day ("the guest
 * page, I need to change the Dygo link the nice title with bold") --
 * then removed outright 2026-09-18 ("remove Dygo in the search box") once
 * `PublicNavbar` (added after that, same week) already put the "Dygo"
 * wordmark directly above this card on `/search`, making the in-card
 * label a second, redundant repetition of the brand name one line above
 * it. Dropped from both the input-stage and not-found-stage Cards, not
 * just the one literally called "the search box" -- they share the same
 * header shape and are steps of the same guest flow, so leaving the
 * label on one and not the other would read as an inconsistency rather
 * than a deliberate choice.
 *
 * Width bumped from a hardcoded `max-w-sm` to the shared `CONTENT_WIDTH`
 * config, with an explicit `mx-auto` added -- live-requested 2026-09-17
 * ("update the block of search screen width to wide", "move that block
 * to center"). This file's three `max-w-sm` occurrences (the found-word
 * flashcard wrapper, and the input/not-found Cards) were hardcoded
 * outside the page-by-page sweep that introduced `CONTENT_WIDTH`
 * elsewhere in the app -- that pass touched page-level containers and
 * `ui/dialog.tsx`, not components rendered *inside* a page, so this one
 * was missed. Centering previously relied entirely on the parent
 * `<main>`'s `flex items-center justify-center` (`app/search/page.tsx`);
 * `mx-auto` here makes each stage's own root element self-centering too,
 * matching the convention every other `CONTENT_WIDTH` call site in the
 * app already uses, instead of depending on this component always being
 * rendered inside a centering flex parent.
 *
 * Search input/button bumped from `h-10` (40px) to `h-11` (44px), and the
 * flashcard's back face got its own `AudioButton` (`layout="corner"`,
 * matching the front) -- fixed 2026-09-20 per a design-critique finding
 * (Phase 8, master schedule): 40px is under Apple's 44x44pt HIG minimum
 * touch target, and the back face -- the only side showing both US and UK
 * IPA -- had no way to actually hear either accent once flipped. Both were
 * local overrides here rather than changes to the shared `Button`/`Input`
 * components those two elements otherwise use, so every other icon button
 * and input in the app is unaffected by this pass.
 */
export function GuestWordTrial() {
  const [word, setWord] = useState('');
  const [stage, setStage] = useState<Stage>('input');
  const [flipped, setFlipped] = useState(false);
  const [card, setCard] = useState<GuestWordCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchedWord, setLastSearchedWord] = useState('');

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = word.trim();
    if (!trimmed) return;

    setError(null);
    setIsSearching(true);
    try {
      const result = await apiClient.get<GuestWordCard>(
        `/words/guest-lookup?word=${encodeURIComponent(trimmed)}`,
      );
      setCard(result);
      setLastSearchedWord(trimmed);
      setFlipped(false);
      setStage('card');
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setLastSearchedWord(trimmed);
        setStage('not-found');
      } else {
        setError(err instanceof ApiError ? err.message : 'Could not look that up right now.');
      }
    } finally {
      setIsSearching(false);
    }
  };

  const reset = () => {
    setStage('input');
    setCard(null);
    setError(null);
    setFlipped(false);
    setWord('');
  };

  if (stage === 'card' && card) {
    return (
      <div className={`mx-auto flex w-full ${CONTENT_WIDTH.wide} flex-col items-center gap-5`}>
        <Flashcard
          className="h-96 w-full"
          flipped={flipped}
          onToggle={() => setFlipped((f) => !f)}
          front={
            <div className="relative flex h-96 w-full flex-col items-center overflow-y-auto rounded-2xl border-2 border-primary bg-card p-6 text-center">
              {/* Play (+ speed) moved into a floating bottom-right corner
                  dock -- live-requested 2026-09-18 ("give me options that
                  help student to focus and easier to use in right hand"),
                  same `layout="corner"` treatment as WordCardModal/study's
                  cards (see AudioButton.tsx's comment for the full
                  history), so Play sits in the same place everywhere. */}
              <div className="flex flex-1 flex-col items-center justify-center gap-2 pb-2 pr-14">
                <p className="text-3xl font-semibold">{card.source_word}</p>
                {card.part_of_speech && (
                  <span className="font-mono text-xs text-muted-foreground">{card.part_of_speech}</span>
                )}
                <p className="text-xs text-muted-foreground">Tap the card to flip</p>
              </div>
              <AudioButton src={card.audio_url} layout="corner" className="absolute bottom-4 right-4" />
            </div>
          }
          back={
            <div className="relative flex h-96 w-full flex-col rounded-2xl border-2 border-primary bg-card p-6">
              {/* Back side redesigned into labeled sections -- live-requested
                  2026-09-18 ("the data in the flash card is messy hard to
                  learn ... recommend to sort all data with UI/UX super easy
                  for user"), applied consistently with WordCardModal/study's
                  card. See WordCardModal.tsx's own comment on this block for
                  the full before/after reasoning.

                  Content wrapped in its own scrollable inner div (`pb-16
                  pr-14` clearing the corner dock) and Play restored here via
                  a fixed-position AudioButton -- fixed 2026-09-20 per a
                  design-critique finding (Phase 8, master schedule): this
                  back face had no way to hear either accent once flipped,
                  even though it's the only side showing US/UK IPA side by
                  side. WordCardModal's back face already used exactly this
                  inner-scroll + corner-dock split (see its own comment on
                  this block) for the same reason -- ported here instead of
                  inventing a second pattern. */}
              <div className="flex flex-1 flex-col gap-3 overflow-y-auto pb-16 pr-14">
              <div className="flex flex-wrap items-center gap-2">
                {card.part_of_speech && (
                  <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {card.part_of_speech}
                  </span>
                )}
                <span className="font-mono text-xs text-muted-foreground">
                  {formatIpa(card.ipa_us) ? `US ${formatIpa(card.ipa_us)}` : 'US —'} ·{' '}
                  {formatIpa(card.ipa_uk) ? `UK ${formatIpa(card.ipa_uk)}` : 'UK —'}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Meaning
                </p>
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
              {card.example_sentences?.[0] && (
                <div className="rounded-lg bg-muted/50 p-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Example
                  </p>
                  <p className="text-xs italic text-muted-foreground">
                    &quot;{card.example_sentences[0].sentence}&quot;
                  </p>
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
        <div className="flex w-full flex-col items-center gap-2">
          <Button asChild size="lg" className="w-full">
            <Link href={ROUTES.register}>Create free account</Link>
          </Button>
          <button
            type="button"
            onClick={reset}
            className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Try another word
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'not-found') {
    return (
      <Card className={`mx-auto w-full ${CONTENT_WIDTH.wide}`}>
        <CardHeader className="items-center text-center">
          <CardTitle className="text-xl leading-snug">
            &quot;{lastSearchedWord}&quot; hasn&apos;t been taught here yet.
          </CardTitle>
          <CardDescription>
            Create a free account and add it yourself — new words get a full card (pronunciation,
            definition, examples) the moment you save them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="lg" className="w-full">
            <Link href={ROUTES.register}>Create free account</Link>
          </Button>
        </CardContent>
        <CardFooter className="justify-center">
          <button
            type="button"
            onClick={reset}
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Try a different word
          </button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className={`mx-auto w-full ${CONTENT_WIDTH.wide}`}>
      <CardHeader className="items-center text-center">
        <CardTitle className="text-2xl leading-tight">
          Type one word you
          <br />
          want to remember.
        </CardTitle>
        <CardDescription>Searches words already taught in Dygo — ready in under a second.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={search} className="flex flex-col gap-3">
          <Label htmlFor="guest-word-input" className="sr-only">
            Word to remember
          </Label>
          <div className="flex gap-2">
            <Input
              id="guest-word-input"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="e.g. resilient"
              maxLength={100}
              className="h-11 min-w-0 flex-1 text-lg"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!word.trim() || isSearching}
              aria-label="Search"
              className="h-11 w-11 shrink-0"
            >
              {isSearching ? (
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                />
              ) : (
                <SearchIcon />
              )}
            </Button>
          </div>
          {error && <p className="text-center text-xs text-destructive">{error}</p>}
        </form>
      </CardContent>
      {/* "Sign in" moved here from PublicNavbar's top menu 2026-09-18
          ("move login button to search group in the search page") -- sits
          next to the existing "create a free account" link so both auth
          paths are together at the point a guest is actually deciding
          between them, instead of the primary CTA living here and the
          secondary one being up in the header. PublicNavbar had no other
          menu item, so it now renders as a plain logo header with no
          Navigation Menu at all -- see that file's own comment. */}
      <CardFooter className="flex flex-col items-center gap-1.5">
        <Link
          href={ROUTES.register}
          className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Or just create a free account
        </Link>
        <Link
          href={ROUTES.login}
          className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Already have an account? Sign in
        </Link>
      </CardFooter>
    </Card>
  );
}

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
