'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Flashcard } from '@/components/flashcard/Flashcard';
import { RatingButtons } from '@/components/flashcard/RatingButtons';
import type { SrsRating } from '@/types';

/**
 * Study session — wireframes 1g (light, two-button rating) + 1i (dark,
 * same layout, swipe-session styling) + 2a (card back). The wireframe
 * ships these as two separately-styled skins; here they're the same
 * Flashcard/Card components rendered once, themed by the app's existing
 * light/dark tokens (next-themes, already wired in the root layout) —
 * that's the more scalable translation of "same layout, two modes" than
 * hand-duplicating a dark variant.
 *
 * The queue is a 3-card mock, not a fetch: GET /topics/:topicId/cards/due
 * (Phase 2, Module 3) is what will feed this for real, and POST /srs/rate
 * is where `handleRate` below will eventually send its result — right now
 * it only advances local state, deliberately, rather than pretending to
 * persist a rating nothing on the backend can receive yet.
 */
interface MockCard {
  word: string;
  usIpa: string;
  ukIpa: string;
  pos: string;
  cefr: string;
  definition: string;
  synonyms: string[];
  antonym: string;
  example: string;
}

const MOCK_QUEUE: MockCard[] = [
  {
    word: 'resilient',
    usIpa: '/rɪˈzɪl.jənt/',
    ukIpa: '/rɪˈzɪl.i.ənt/',
    pos: 'adjective',
    cefr: 'B2',
    definition: 'able to recover quickly from difficulty',
    synonyms: ['tough', 'hardy'],
    antonym: 'fragile',
    example: 'Coral reefs are surprisingly resilient.',
  },
  {
    word: 'meticulous',
    usIpa: '/məˈtɪk.jə.ləs/',
    ukIpa: '/məˈtɪk.jʊ.ləs/',
    pos: 'adjective',
    cefr: 'C1',
    definition: 'showing great attention to detail',
    synonyms: ['thorough', 'precise'],
    antonym: 'careless',
    example: 'She kept meticulous records of every experiment.',
  },
  {
    word: 'ubiquitous',
    usIpa: '/juːˈbɪk.wə.təs/',
    ukIpa: '/juːˈbɪk.wɪ.təs/',
    pos: 'adjective',
    cefr: 'C1',
    definition: 'present or found everywhere',
    synonyms: ['omnipresent', 'widespread'],
    antonym: 'rare',
    example: 'Smartphones have become ubiquitous.',
  },
];

export default function StudyPage() {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const card = MOCK_QUEUE[index];
  const done = index >= MOCK_QUEUE.length;

  function handleRate(rating: SrsRating) {
    // eslint-disable-next-line no-console
    console.log('mock rating', rating, 'for', card?.word);
    setFlipped(false);
    setIndex((i) => i + 1);
  }

  if (done) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xs flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-lg font-semibold">That&apos;s the mock queue.</p>
        <p className="text-sm text-muted-foreground">
          The real session-summary screen ships alongside GET /topics/:topicId/cards/due.
        </p>
        <Link href="/topics" className="text-sm underline underline-offset-4">
          Back to topics
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xs flex-col gap-5 p-6">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {index + 1} of {MOCK_QUEUE.length}
        </span>
        <Link href="/topics" aria-label="End session">
          ✕
        </Link>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${((index + 1) / MOCK_QUEUE.length) * 100}%` }}
        />
      </div>

      <Flashcard
        className="h-96 w-full"
        flipped={flipped}
        onToggle={() => setFlipped((f) => !f)}
        front={
          <div className="flex h-96 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 bg-card p-6 text-center shadow-sm">
            <p className="text-4xl font-semibold">{card.word}</p>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border px-2.5 py-1">▶ US</span>
              <span className="rounded-full border px-2.5 py-1">▶ UK</span>
            </div>
            <span className="font-mono text-xs text-muted-foreground">{card.pos}</span>
            <div className="mt-4 flex gap-2 text-xs">
              <span className="rounded-full border px-2 py-1">first letter</span>
              <span className="rounded-full border px-2 py-1">IPA</span>
              <span className="rounded-full border px-2 py-1">in a sentence</span>
            </div>
            <p className="text-xs text-muted-foreground">Need a nudge? Take one clue.</p>
          </div>
        }
        back={
          <div className="flex h-96 w-full flex-col gap-2.5 rounded-2xl border-2 bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-semibold">{card.word}</span>
              <span className="font-mono text-xs text-muted-foreground">▶ ▶</span>
            </div>
            <span className="font-mono text-xs text-muted-foreground">
              {card.usIpa} · {card.ukIpa}
            </span>
            <p className="text-base leading-snug">{card.definition}</p>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {card.synonyms.map((s) => (
                <span key={s} className="rounded-full border px-2 py-0.5">
                  = {s}
                </span>
              ))}
              <span className="rounded-full border px-2 py-0.5">≠ {card.antonym}</span>
            </div>
            <p className="mt-auto text-xs italic text-muted-foreground">
              &quot;{card.example}&quot;
            </p>
          </div>
        }
      />

      <RatingButtons onRate={handleRate} />
    </main>
  );
}
