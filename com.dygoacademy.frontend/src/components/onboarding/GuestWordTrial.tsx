'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Flashcard } from '@/components/flashcard/Flashcard';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';

/**
 * Wireframe 1a — "Try one word before signing up." Caption: "Value in 5
 * seconds. No empty app, no account wall."
 *
 * The enrichment shown is a fixed mock, not a live call: POST /words +
 * the Gemini enrichment pipeline is Phase 1 (Module 2). The input is
 * real and editable so the interaction reads correctly, but every word
 * previews the same demo result today — that's the honest state to ship
 * in Phase 0, not a fake "AI thinking" delay for effect.
 */
export function GuestWordTrial() {
  const [word, setWord] = useState('ephemeral');
  const [stage, setStage] = useState<'input' | 'card'>('input');
  const [flipped, setFlipped] = useState(false);

  if (stage === 'card') {
    return (
      <div className="flex w-full max-w-xs flex-col items-center gap-5">
        <Flashcard
          className="h-80 w-full"
          flipped={flipped}
          onToggle={() => setFlipped((f) => !f)}
          front={
            <div className="flex h-80 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-primary bg-card p-6 text-center shadow-sm">
              <p className="text-3xl font-semibold">{word}</p>
              <div className="flex gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border px-2.5 py-1">▶ US</span>
                <span className="rounded-full border px-2.5 py-1">▶ UK</span>
              </div>
              <span className="font-mono text-xs text-muted-foreground">adjective · B2</span>
              <p className="mt-4 text-xs text-muted-foreground">tap to flip</p>
            </div>
          }
          back={
            <div className="flex h-80 w-full flex-col gap-2.5 rounded-2xl border-2 border-primary bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">
                  US /ɪˈfem.ər.əl/ · UK /ɪˈfem.ɹəl/
                </span>
              </div>
              <p className="text-base leading-snug">lasting for a very short time</p>
              <div className="flex flex-wrap gap-1.5 text-xs">
                <span className="rounded-full border px-2 py-0.5">= fleeting</span>
                <span className="rounded-full border px-2 py-0.5">= transient</span>
                <span className="rounded-full border px-2 py-0.5">≠ permanent</span>
              </div>
              <p className="mt-1 text-xs italic text-muted-foreground">
                &quot;Fame in this industry is often ephemeral.&quot;
              </p>
              <p className="mt-auto text-center text-xs text-muted-foreground">tap to flip back</p>
            </div>
          }
        />
        <div className="flex w-full flex-col items-center gap-2">
          <Button asChild size="lg" className="w-full">
            <Link href={ROUTES.register}>Create free account</Link>
          </Button>
          <Link
            href={ROUTES.register}
            className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Sign up later — you can keep this card
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-xs flex-col gap-3">
      <p className="font-mono text-xs text-muted-foreground">DYGO</p>
      <h1 className="text-2xl font-semibold leading-tight">
        Type one word you
        <br />
        want to remember.
      </h1>
      <input
        value={word}
        onChange={(e) => setWord(e.target.value)}
        className="rounded-xl border-2 border-primary bg-transparent px-3 py-2.5 text-lg outline-none"
        aria-label="Word to remember"
      />
      <div className="flex flex-col gap-2 rounded-xl border bg-muted/40 p-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-muted-foreground">US /ɪˈfem.ər.əl/</span>
          <span className="rounded-full border px-2 py-0.5 text-xs">▶ audio</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-muted-foreground">UK /ɪˈfem.ɹəl/</span>
          <span className="font-mono text-xs text-muted-foreground">adjective · B2</span>
        </div>
        <p className="text-sm text-muted-foreground/80">lasting for a very short time</p>
      </div>
      <p className="text-xs text-muted-foreground">Ready in under a second. Nothing to set up.</p>
      <Button size="lg" className="mt-2" onClick={() => setStage('card')}>
        Flip my first card
      </Button>
      <Link
        href={ROUTES.register}
        className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Sign up later — you can keep this card
      </Link>
    </div>
  );
}
