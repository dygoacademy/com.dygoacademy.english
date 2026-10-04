import type { SpeakingWordMark } from '@/types';

export interface WordMarksProps {
  /** The sentence's tokens (as shown, punctuation kept). */
  words: readonly string[];
  /** One mark per token, from the scorer. Missing marks show as fine. */
  marks: readonly SpeakingWordMark[];
  /** Short reason under a word that needs work, e.g. "MIT is too soft" (from t()). */
  reasonText: (mark: SpeakingWordMark, word: string) => string | null;
}

/**
 * SP3 word marks (SpeakCompare.dc.html): every word of the sentence, green
 * underline when fine, amber box with a short reason when it needs work.
 * The sentence stays English whatever the UI language (lang="en").
 */
export function WordMarks({ words, marks, reasonText }: WordMarksProps) {
  const byIndex = new Map(marks.map((m) => [m.index, m]));
  return (
    <p
      lang="en"
      className="m-0 flex flex-wrap items-end gap-x-[7px] gap-y-1.5 font-display text-[18px] text-example"
    >
      {words.map((word, i) => {
        const mark = byIndex.get(i);
        if (!mark || mark.ok) {
          return (
            <span
              key={i}
              data-mark="ok"
              className="leading-[1.3]"
              style={{ borderBottom: '3px solid var(--stage-sprout-leaf)' }}
            >
              {word}
            </span>
          );
        }
        const reason = reasonText(mark, word);
        return (
          <span
            key={i}
            data-mark={mark.reason ?? 'needs-work'}
            className="inline-flex flex-col items-center rounded-lg bg-gold-soft px-1.5 leading-[1.25]"
            style={{ border: '1.5px solid var(--stage-tree-fruit)' }}
          >
            <span className="font-semibold text-gold-soft-text">{word}</span>
            {reason && (
              <span className="font-sans text-[11px] font-bold text-gold-text">{reason}</span>
            )}
          </span>
        );
      })}
    </p>
  );
}
