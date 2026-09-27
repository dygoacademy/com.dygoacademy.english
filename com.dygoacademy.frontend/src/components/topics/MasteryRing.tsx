/**
 * Small mastery-ring indicator (Phase 3 Module 19, FR-19.1) — shared by
 * `TopicCard`, `TopicCollectionRow`, and `TopicGridCard` rather than
 * duplicated, since all three need the same divide-by-zero guard (a topic
 * with zero words) and the same conic-gradient technique. No existing
 * ring/progress component in this codebase to reuse; a plain
 * `conic-gradient` circle needs no chart library, same technique the
 * "Dygo Learning Path" concept artifact used for its own collection
 * cards.
 *
 * Gained a centered percentage label 2026-09-21 — the mockup's own
 * collection-card rings ("35%", "12%") always show one; `TierProgressCard`
 * picked this up during the visual-redesign pass but this smaller,
 * more-widely-used ring was missed at the time. Font size scales off
 * `size` the same way the existing inset already does, so it stays
 * legible at both the 28px default and the 36px `TopicCollectionRow`
 * size without a second component.
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
  const pctLabel = `${Math.round(pct * 100)}%`;

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
        className="absolute flex items-center justify-center rounded-full bg-card"
        style={{ inset: Math.max(2, size * 0.14) }}
      >
        <span
          className="font-semibold leading-none text-foreground"
          style={{ fontSize: Math.max(7, size * 0.28) }}
        >
          {pctLabel}
        </span>
      </div>
    </div>
  );
}
