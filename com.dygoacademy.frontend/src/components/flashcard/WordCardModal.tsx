'use client';

import { useState } from 'react';

import { AudioButton } from '@/components/flashcard/AudioButton';
import { Flashcard } from '@/components/flashcard/Flashcard';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useWordCard } from '@/hooks/useWordCard';
import { formatIpa } from '@/lib/utils';

/**
 * "Click a READY word in the topics list to review its flashcard" —
 * live-requested 2026-09-04. Deliberately not a study session: no rating
 * buttons, no queue, no relationship to whether the word is actually due
 * (that's /study, backed by useStudySession/SrsService.findDue). This is
 * a standalone peek at one word's card, closed as soon as you're done.
 *
 * Migrated 2026-09-05 onto shadcn/ui's Dialog (see AddWordModal.tsx's
 * comment for the full reasoning) instead of the hand-rolled overlay
 * this used to share with the other two modals.
 *
 * Front/back layout intentionally mirrors the STANDARD-mode card in
 * /study/page.tsx (word + audio + IPA on the front, definition/synonyms/
 * antonyms/example on the back) so a word looks the same whether you're
 * previewing it here or reviewing it in a real session.
 *
 * `DialogContent`'s width briefly overrode the shared default with
 * `CONTENT_WIDTH.compact` (384px) 2026-09-18, after this popup's 672px
 * width read as a single word + a fixed `h-80` card stretched inside a
 * mostly-empty box. Reverted the same day ("make all popup use default
 * width" -> confirmed: every popup identical, not just this one fixed)
 * -- `layout.ts` still documents `.compact` for if a single-popup
 * exception is wanted again later. The "Close" button below the card
 * stays `w-full` regardless of width -- a full-width secondary action
 * reads as a deliberate, finished footer rather than a small button
 * floating off to one side.
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

  const close = () => {
    setFlipped(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent hideClose>
        <DialogTitle className="sr-only">Word card</DialogTitle>
        {isPending && <p className="p-6 text-center text-sm text-muted-foreground">Loading…</p>}
        {isError && (
          <p className="p-6 text-center text-sm text-muted-foreground">Couldn&apos;t load this word.</p>
        )}
        {card && (
          <Flashcard
            className="h-96 w-full"
            flipped={flipped}
            onToggle={() => setFlipped((f) => !f)}
            front={
              <div className="relative flex h-96 w-full flex-col items-center overflow-y-auto rounded-2xl border-2 bg-card p-6 text-center">
                {/* Play (+ speed) moved into a floating bottom-right corner
                    dock 2026-09-18 ("give me options that help student to
                    focus and easier to use in right hand") -- previously an
                    inline row under the word (see AudioButton.tsx's comment
                    for that history). `layout="corner"` pins it to the exact
                    spot a right thumb rests on holding the phone, and takes
                    it out of the centered word/part-of-speech group so that
                    group is the only thing competing for attention. Applied
                    the same way on the back (see below); /study's and
                    GuestWordTrial's cards still use the inline row until
                    they're asked for the same treatment. */}
                <div className="flex flex-1 flex-col items-center justify-center gap-2 pb-2 pr-14">
                  <p className="text-4xl font-semibold">{card.source_word}</p>
                  {card.part_of_speech && (
                    <span className="font-mono text-xs text-muted-foreground">{card.part_of_speech}</span>
                  )}
                  <p className="text-xs text-muted-foreground">Tap the card to flip</p>
                </div>
                <AudioButton src={card.audio_url} layout="corner" className="absolute bottom-4 right-4" />
              </div>
            }
            back={
              <div className="relative flex h-96 w-full flex-col rounded-2xl border-2 bg-card p-6">
                <div className="flex flex-1 flex-col gap-3 overflow-y-auto pb-16 pr-14">
                  <span className="text-2xl font-semibold">{card.source_word}</span>
                  {/* Back side redesigned into labeled sections -- live-requested
                      2026-09-18 ("the data in the flash card is messy hard to
                      learn ... recommend to sort all data with UI/UX super easy
                      for user"). Was one unlabeled stack: part-of-speech+IPA
                      crammed into a single mono line, then the definition, then
                      synonyms/antonyms mixed in one row distinguished only by
                      tiny =/≠ symbols, then the example pinned to the bottom.
                      Synonyms/antonyms are color-coded (emerald/rose, matching
                      the Leech badge's existing use of `destructive` red for
                      semantic meaning) instead of relying on a symbol a young
                      ESL learner may not recognize.

                      Reordered 2026-09-18: IPA+Play now comes right after
                      the word (its own line), and part-of-speech moved down
                      to sit directly with Meaning instead of near IPA --
                      live-requested ("The meaning with stick with type of
                      word that is make sence?" -> confirmed: Word / IPA+Play
                      / part-of-speech+Meaning / Synonyms-Antonyms-Example).
                      Groups by *kind* of information: IPA+Play is about how
                      to say the word, part-of-speech+Meaning is about what
                      the word is and means -- same pairing a real dictionary
                      entry uses ("resilient (adj.) -- able to recover...").

                      IPA and Play split onto their own lines the same day
                      ("Word / IPA / Play Sound ... Move Play Sound to another
                      line"), and Play rebuilt as a full-width, primary-colored
                      `Button` ("make Play Sound easy to see and click") --
                      see AudioButton.tsx's own comment for the full reasoning.

                      Play moved again, same day, to the very bottom of the
                      card ("Could you please move the Play Sound to the
                      buttom?") -- back then, `mt-auto` pinned it to the
                      bottom of the scrollable flex column. Superseded
                      2026-09-18 by the corner dock below (see the comment
                      just above this content block): Play now sits outside
                      the scrollable inner div entirely, so it stays fixed
                      in the same corner regardless of scroll position,
                      which `mt-auto` inside a scrolling column could not
                      guarantee once content got long enough to scroll. */}
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
        )}
        <Button variant="outline" onClick={close} className="w-full">
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}
