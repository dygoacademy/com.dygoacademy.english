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
import { ROUTES } from '@/constants/routes';
import { apiClient, ApiError } from '@/lib/api-client';
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
 * The "DYGO" caption in each Card's header was a tiny muted-mono label --
 * changed to a proper bold title ("Dygo", matching the Navbar/login-page
 * wordmark's own font-bold treatment) same day ("the guest page, I need to
 * change the Dygo link the nice title with bold").
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
      <div className="flex w-full max-w-sm flex-col items-center gap-5">
        <Flashcard
          className="h-80 w-full"
          flipped={flipped}
          onToggle={() => setFlipped((f) => !f)}
          front={
            <div className="flex h-80 w-full flex-col items-center justify-center gap-3 overflow-y-auto rounded-2xl border-2 border-primary bg-card p-6 text-center">
              <p className="text-3xl font-semibold">{card.source_word}</p>
              <AudioButton src={card.audio_url} />
              {card.part_of_speech && (
                <span className="font-mono text-xs text-muted-foreground">{card.part_of_speech}</span>
              )}
              <p className="mt-2 text-xs text-muted-foreground">Tap the card to flip</p>
            </div>
          }
          back={
            <div className="flex h-80 w-full flex-col gap-2.5 overflow-y-auto rounded-2xl border-2 border-primary bg-card p-6">
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
              {card.example_sentences?.[0] && (
                <p className="mt-auto text-xs italic text-muted-foreground">
                  &quot;{card.example_sentences[0].sentence}&quot;
                </p>
              )}
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
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <p className="text-base font-bold">Dygo</p>
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
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center text-center">
        <p className="text-base font-bold">Dygo</p>
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
              className="min-w-0 flex-1 text-lg"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!word.trim() || isSearching}
              aria-label="Search"
              className="h-10 w-10 shrink-0"
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
      <CardFooter className="justify-center">
        <Link
          href={ROUTES.register}
          className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Or just create a free account
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
