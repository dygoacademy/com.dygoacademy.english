'use client';

import Link from 'next/link';
import { useState } from 'react';

import { AudioButton } from '@/components/flashcard/AudioButton';
import { Flashcard } from '@/components/flashcard/Flashcard';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import { apiClient, ApiError } from '@/lib/api-client';
import type { GuestWordCard } from '@/types/word';

type Stage = 'input' | 'card' | 'not-found';

/**
 * Wireframe 1a — "Try one word before signing up."
 *
 * Rewritten 2026-09-05 from a fixed mock (typing any word just swapped
 * the headline over a hardcoded "ephemeral" sample card) to the real BA
 * flow, given live 2026-09-05:
 *   1. guest lands on this page
 *   2. types a word
 *   3. taps the search icon
 *   4. we look it up in master_lexicon via GET /words/guest-lookup --
 *      already-enriched words only. This deliberately never calls
 *      POST /words: that route enqueues a real Gemini/TTS enrichment job,
 *      which an anonymous, unauthenticated visitor must not be able to
 *      trigger for cost/abuse reasons, and there is no topic to attach
 *      the result to anyway.
 *   5. found -> show the real card (audio, IPA, definition, synonyms,
 *      antonyms, example sentence -- same layout WordCardModal uses)
 *   6. not found -> a friendly nudge to create a free account, since
 *      that is genuinely the only way to get a brand-new word taught
 *      (the authenticated "Add a word" flow is what enriches it)
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
      <div className="flex w-full max-w-xs flex-col items-center gap-5">
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
      <div className="flex w-full max-w-xs flex-col items-center gap-4 text-center">
        <p className="font-mono text-xs text-muted-foreground">DYGO</p>
        <h1 className="text-xl font-semibold leading-snug">
          &quot;{lastSearchedWord}&quot; hasn&apos;t been taught here yet.
        </h1>
        <p className="text-sm text-muted-foreground">
          Create a free account and add it yourself — new words get a full card (pronunciation,
          definition, examples) the moment you save them.
        </p>
        <Button asChild size="lg" className="w-full">
          <Link href={ROUTES.register}>Create free account</Link>
        </Button>
        <button
          type="button"
          onClick={reset}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Try a different word
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={search} className="flex w-full max-w-xs flex-col gap-3">
      <p className="font-mono text-xs text-muted-foreground">DYGO</p>
      <h1 className="text-2xl font-semibold leading-tight">
        Type one word you
        <br />
        want to remember.
      </h1>
      <div className="flex gap-2">
        <input
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="e.g. resilient"
          maxLength={100}
          className="min-w-0 flex-1 rounded-xl border-2 border-primary bg-transparent px-3 py-2.5 text-lg outline-none"
          aria-label="Word to remember"
        />
        <button
          type="submit"
          disabled={!word.trim() || isSearching}
          aria-label="Search"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-primary text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSearching ? (
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
          ) : (
            <SearchIcon />
          )}
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        Searches words already taught in Dygo — ready in under a second.
      </p>
      <Link
        href={ROUTES.register}
        className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Or just create a free account
      </Link>
    </form>
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
