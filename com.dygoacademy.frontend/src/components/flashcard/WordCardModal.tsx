'use client';

import { useState } from 'react';

import { AudioButton } from '@/components/flashcard/AudioButton';
import { Flashcard } from '@/components/flashcard/Flashcard';
import { Button } from '@/components/ui/button';
import { useWordCard } from '@/hooks/useWordCard';

/**
 * "Click a READY word in the topics list to review its flashcard" —
 * live-requested 2026-09-04. Deliberately not a study session: no rating
 * buttons, no queue, no relationship to whether the word is actually due
 * (that's /study, backed by useStudySession/SrsService.findDue). This is
 * a standalone peek at one word's card, closed as soon as you're done —
 * same fixed-overlay dialog pattern AddWordModal uses (no Radix dependency
 * in the project yet).
 *
 * Front/back layout intentionally mirrors the STANDARD-mode card in
 * /study/page.tsx (word + audio + IPA on the front, definition/synonyms/
 * antonyms/example on the back) so a word looks the same whether you're
 * previewing it here or reviewing it in a real session.
 */
export function WordCardModal({
  topicWordId,
  onClose,
}: {
  topicWordId: string | undefined;
  onClose: () => void;
}) {
  const open = Boolean(topicWordId);
  const { data: card, isPending, isError } = useWordCard(topicWordId, open);
  const [flipped, setFlipped] = useState(false);

  if (!open) return null;

  const close = () => {
    setFlipped(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Word card"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border bg-card p-5 shadow-lg"
      >
        {isPending && <p className="p-6 text-center text-sm text-muted-foreground">Loading…</p>}
        {isError && (
          <p className="p-6 text-center text-sm text-muted-foreground">Couldn&apos;t load this word.</p>
        )}
        {card && (
          <Flashcard
            className="h-80 w-full"
            flipped={flipped}
            onToggle={() => setFlipped((f) => !f)}
            front={
              <div className="flex h-80 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 bg-card p-6 text-center">
                <p className="text-4xl font-semibold">{card.source_word}</p>
                <AudioButton src={card.audio_url} />
                {card.part_of_speech && (
                  <span className="font-mono text-xs text-muted-foreground">{card.part_of_speech}</span>
                )}
                <p className="mt-2 text-xs text-muted-foreground">Tap the card to flip</p>
              </div>
            }
            back={
              <div className="flex h-80 w-full flex-col gap-2.5 rounded-2xl border-2 bg-card p-6">
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
                {card.example_sentences?.[0] && (
                  <p className="mt-auto text-xs italic text-muted-foreground">
                    &quot;{card.example_sentences[0].sentence}&quot;
                  </p>
                )}
              </div>
            }
          />
        )}
        <Button variant="outline" onClick={close}>
          Close
        </Button>
      </div>
    </div>
  );
}
