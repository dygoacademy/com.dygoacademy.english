/**
 * Small mastery-ring indicator (Phase 3 Module 19, FR-19.1) — shared by
 * `TopicCard` and `TopicGridCard` rather than duplicated, since both need
 * the same divide-by-zero guard (a topic with zero words) and the same
 * conic-gradient technique. No existing ring/progress component in this
 * codebase to reuse; a plain `conic-gradient` circle needs no chart
 * library, same technique the "Dygo Learning Path" concept artifact used
 * for its own collection cards.
 */
export function MasteryRing({
  masteredCount,
  wordCount,
  size = 28,
}: {
  masteredCount: string;
  wordCount: string;
  size?: number;
}) {
  const total = Number(wordCount);
  const mastered = Number(masteredCount);
  const pct = total > 0 ? Math.min(1, mastered / total) : 0;

  return (
    <div
      className="relative shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(hsl(var(--primary)) ${pct}turn, hsl(var(--muted)) 0turn)`,
      }}
      role="img"
      aria-label={`${mastered} of ${total} words mastered`}
      title={`${mastered}/${total} mastered`}
    >
      <div
        className="absolute rounded-full bg-card"
        style={{ inset: Math.max(2, size * 0.14) }}
      />
    </div>
  );
}
