import { useState } from 'react';

import { WordCardModal } from '@/components/flashcard/WordCardModal';
import { useReEnrichWord } from '@/hooks/useReEnrichWord';
import type { TopicWordSummary } from '@/types';

/**
 * Renders a single word row per its live WordStatus — the exact three
 * states from wireframes 1k (enriching) and 1l (failed), plus the READY
 * steady-state. FAILED is deliberately never shown with the word
 * "failed": the migration's own comment on `word_status` explains why
 * the state exists (exhausted BullMQ retries), and the wireframe caption
 * for 1l is explicit about the copy choice — this row follows it.
 *
 * `topicId` is only needed for the FAILED state's "Try again" button
 * (`useReEnrichWord`'s cache invalidation targets one topic's query) —
 * threaded through as a prop rather than read off the word row itself
 * since `TopicWordSummary` doesn't carry it (see `types/topic.ts`).
 */
export function WordStatusRow({ word, topicId }: { word: TopicWordSummary; topicId: string }) {
  const reEnrich = useReEnrichWord(topicId);
  // Only a READY word has enriched content to actually show (GET
  // /words/:id joins master_lexicon, empty for ENRICHING/FAILED rows) --
  // this is local to each row rather than lifted to the topic page since
  // rows are otherwise fully independent (same reasoning as reEnrich
  // above being per-row, not shared).
  const [reviewOpen, setReviewOpen] = useState(false);

  if (word.status === 'ENRICHING') {
    return (
      <div className="flex flex-col gap-2 rounded-xl border-2 border-primary p-3">
        <div className="flex items-center justify-between">
          <span className="text-base">{word.source_word}</span>
          <span className="font-mono text-xs text-primary">enriching…</span>
        </div>
        <div className="h-2 w-2/5 animate-pulse rounded-full bg-muted" />
        <p className="text-xs text-muted-foreground">
          Audio and IPA land in a second. You can study it now.
        </p>
      </div>
    );
  }

  if (word.status === 'FAILED') {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-dashed p-3">
        <div className="flex items-center justify-between">
          <span className="text-base">{word.source_word}</span>
          <span className="font-mono text-xs text-muted-foreground">no audio yet</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {word.failure_reason
            ? `We couldn't finish this one: ${word.failure_reason}. Your card still works — you can type the meaning yourself.`
            : "We couldn't find pronunciation for this one. Your card still works — you can type the meaning yourself."}
        </p>
        {reEnrich.isError && (
          <p className="text-xs text-destructive">Couldn&apos;t retry — try again in a moment.</p>
        )}
        <div className="flex gap-2">
          <button
            className="flex-1 rounded-lg border px-2 py-1.5 text-xs disabled:opacity-50"
            onClick={() => reEnrich.mutate(word.id)}
            disabled={reEnrich.isPending}
          >
            {reEnrich.isPending ? 'Retrying…' : 'Try again'}
          </button>
          <button className="flex-1 rounded-lg border px-2 py-1.5 text-xs" disabled title="Coming soon">
            Write it myself
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setReviewOpen(true)}
        className="flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-colors hover:border-primary"
      >
        <span>{word.source_word}</span>
        <span className="font-mono text-xs text-muted-foreground">▶ ready</span>
      </button>
      {reviewOpen && (
        <WordCardModal topicWordId={word.id} onClose={() => setReviewOpen(false)} />
      )}
    </>
  );
}
