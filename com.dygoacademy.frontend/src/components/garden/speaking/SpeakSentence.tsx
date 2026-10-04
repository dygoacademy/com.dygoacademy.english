/**
 * "Say this sentence" text (SP1, SP2): the target word on a green chip.
 * With `reached`, words after it are faded (SP2 follow-along). Always
 * English (lang="en"), whatever the UI language.
 */
export function SpeakSentence({
  tokens,
  targetIndex,
  reached,
}: {
  tokens: readonly string[];
  targetIndex: number;
  /** SP2: index of the last word reached; later words are faded. */
  reached?: number;
}) {
  const follow = reached !== undefined;
  return (
    <p
      lang="en"
      className={`m-0 font-display text-[22px] ${follow ? 'leading-[1.45]' : 'leading-[1.4] text-example'}`}
    >
      {tokens.map((token, i) => {
        const space = i < tokens.length - 1 ? ' ' : '';
        if (i === targetIndex) {
          return (
            <span key={i}>
              <b className="rounded-[6px] bg-on-forest-muted px-1 text-forest">{token}</b>
              {space}
            </span>
          );
        }
        const faded = follow && i > (reached ?? -1);
        return (
          <span
            key={i}
            data-faded={faded || undefined}
            className={follow ? (faded ? 'text-dashed' : 'text-text') : undefined}
          >
            {token}
            {space}
          </span>
        );
      })}
    </p>
  );
}
