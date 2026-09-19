import { useState } from 'react';

import { WordCardModal } from '@/components/flashcard/WordCardModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDeleteWord } from '@/hooks/useDeleteWord';
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
 * since `TopicWordSummary` doesn't carry it (see `types/topic.ts`). Now
 * also used by `useDeleteWord` for the same reason.
 *
 * Delete added 2026-09-18 ("How to delete word in the topics?") — a small
 * trash icon in every state's header row. Originally gated by
 * `window.confirm`, replaced the same day with `ui/alert-dialog.tsx`'s
 * Radix-Primitive-backed AlertDialog ("should use that alert pop from
 * radix ui") — a native browser confirm looked out of place next to every
 * other popup in the app already being a styled Dialog. Controlled (not
 * an uncontrolled `AlertDialogTrigger`) since the trash icon button also
 * needs `stopPropagation`/`disabled` behavior the trigger doesn't give
 * for free. `topic_words_delete_write` already enforces WRITE role on
 * the topic at the database layer, so a non-WRITE viewer sees the confirm
 * dialog but the mutation itself comes back as an error — surfaced
 * inline per row rather than silently doing nothing.
 */
export function WordStatusRow({ word, topicId }: { word: TopicWordSummary; topicId: string }) {
  const reEnrich = useReEnrichWord(topicId);
  const deleteWord = useDeleteWord(topicId);
  // Only a READY word has enriched content to actually show (GET
  // /words/:id joins master_lexicon, empty for ENRICHING/FAILED rows) --
  // this is local to each row rather than lifted to the topic page since
  // rows are otherwise fully independent (same reasoning as reEnrich
  // above being per-row, not shared).
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // AlertDialogAction is `Dialog.Close` under the hood (@radix-ui/
  // react-alert-dialog's own source), so it closes the dialog on click by
  // default -- fine for a synchronous confirm, but wrong here: clicking it
  // would close the dialog immediately, before this async mutation even
  // resolves, hiding the inline error message below if the delete fails.
  // `event.preventDefault()` stops Radix's built-in auto-close (it checks
  // `event.defaultPrevented` before calling `onOpenChange(false)`, see
  // @radix-ui/primitive's composeEventHandlers) so this can close the
  // dialog itself, only once the delete actually succeeds.
  const confirmDelete = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    deleteWord.mutate(word.id, {
      onSuccess: () => setConfirmOpen(false),
    });
  };

  const deleteButton = (
    <button
      type="button"
      onClick={() => setConfirmOpen(true)}
      disabled={deleteWord.isPending}
      aria-label={`Delete "${word.source_word}"`}
      title="Delete word"
      className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
    >
      <TrashIcon className="h-4 w-4" />
    </button>
  );

  const confirmDialog = (
    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &quot;{word.source_word}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            This can&apos;t be undone. Its study history for everyone reviewing this topic goes
            with it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {deleteWord.isError && (
          <p className="text-xs text-destructive">Couldn&apos;t delete — try again in a moment.</p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={confirmDelete} disabled={deleteWord.isPending}>
            {deleteWord.isPending ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (word.status === 'ENRICHING') {
    return (
      <div className="flex flex-col gap-2 rounded-xl border-2 border-primary p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-base">{word.source_word}</span>
          <div className="flex shrink-0 items-center gap-1">
            <span className="font-mono text-xs text-primary">enriching…</span>
            {deleteButton}
          </div>
        </div>
        <div className="h-2 w-2/5 animate-pulse rounded-full bg-muted" />
        <p className="text-xs text-muted-foreground">
          Audio and IPA land in a second. You can study it now.
        </p>
        {confirmDialog}
      </div>
    );
  }

  if (word.status === 'FAILED') {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-dashed p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-base">{word.source_word}</span>
          <div className="flex shrink-0 items-center gap-1">
            <span className="font-mono text-xs text-muted-foreground">no audio yet</span>
            {deleteButton}
          </div>
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
        {confirmDialog}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition-colors hover:border-primary">
        <button
          type="button"
          onClick={() => setReviewOpen(true)}
          className="flex flex-1 items-center justify-between gap-2 text-left"
        >
          <span>{word.source_word}</span>
          <span className="font-mono text-xs text-muted-foreground">▶ ready</span>
        </button>
        {deleteButton}
      </div>
      {confirmDialog}
      {reviewOpen && (
        <WordCardModal topicWordId={word.id} onClose={() => setReviewOpen(false)} />
      )}
    </>
  );
}

function TrashIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}
