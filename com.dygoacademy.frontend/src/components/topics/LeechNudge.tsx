/**
 * Wireframe caption: "Leeches appear as plain language at the bottom, not
 * as a concept to learn." Mock — GET /srs/leeches (Phase 2, Module 3) is
 * what determines this for real, so it's a static box, not a link, until
 * there's a real leech-drill destination to send someone to.
 */
export function LeechNudge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <div className="flex items-center justify-between rounded-xl border border-dashed px-3.5 py-2.5 text-sm">
      <span>
        {count} {count === 1 ? 'word keeps' : 'words keep'} tripping you up
      </span>
      <span className="font-mono text-xs text-muted-foreground">Fix →</span>
    </div>
  );
}
