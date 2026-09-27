'use client';

export type TopicsView = 'list' | 'grid';

/**
 * Phase 9, "Topics as Collections" (`phase 9 implementation plan.md`) --
 * live-reported after that feature first shipped as a hard grid-to-list
 * replacement ("I think the list can let use choose vertical list or
 * gridcard by them self rather than we give on option to the customer"):
 * both layouts now coexist, picked by the viewer instead of decided for
 * them. `list` (leading with a larger mastery ring per row) stays the
 * default -- that reframing is still the point of this feature -- but
 * `grid` (the original `TopicGridCard` tiles) is one click away and
 * remembered per-viewer via `localStorage`, not silently reset every
 * visit.
 */
export function TopicsViewToggle({
  view,
  onChange,
}: {
  view: TopicsView;
  onChange: (view: TopicsView) => void;
}) {
  return (
    <div className="flex shrink-0 gap-0.5 rounded-full border p-0.5" role="group" aria-label="Topics view">
      <button
        type="button"
        onClick={() => onChange('list')}
        aria-pressed={view === 'list'}
        aria-label="List view"
        title="List view"
        className={`flex h-8 w-8 items-center justify-center rounded-full ${
          view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
        }`}
      >
        <ListIcon />
      </button>
      <button
        type="button"
        onClick={() => onChange('grid')}
        aria-pressed={view === 'grid'}
        aria-label="Grid view"
        title="Grid view"
        className={`flex h-8 w-8 items-center justify-center rounded-full ${
          view === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
        }`}
      >
        <GridIcon />
      </button>
    </div>
  );
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" rx="1" />
      <rect x="13" y="4" width="7" height="7" rx="1" />
      <rect x="4" y="13" width="7" height="7" rx="1" />
      <rect x="13" y="13" width="7" height="7" rx="1" />
    </svg>
  );
}
