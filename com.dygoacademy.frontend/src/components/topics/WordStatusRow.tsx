import type { TopicWordSummary } from '@/types';

/**
 * Renders a single word row per its live WordStatus — the exact three
 * states from wireframes 1k (enriching) and 1l (failed), plus the READY
 * steady-state. FAILED is deliberately never shown with the word
 * "failed": the migration's own comment on `word_status` explains why
 * the state exists (exhausted BullMQ retries), and the wireframe caption
 * for 1l is explicit about the copy choice — this row follows it.
 */
export function WordStatusRow({ word }: { word: TopicWordSummary }) {
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
        <div className="flex gap-2">
          <button className="flex-1 rounded-lg border px-2 py-1.5 text-xs">Try again</button>
          <button className="flex-1 rounded-lg border px-2 py-1.5 text-xs">
            Write it myself
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-xl border px-3 py-2.5">
      <span>{word.source_word}</span>
      <span className="font-mono text-xs text-muted-foreground">▶ ready</span>
    </div>
  );
}
