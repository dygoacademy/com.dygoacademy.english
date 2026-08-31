'use client';

import { useState } from 'react';

import { TopicGridCard } from '@/components/topics/TopicGridCard';
import { useTopics } from '@/hooks/useTopics';

/**
 * Wireframe 1f — the topics grid, deliberately its own route rather than
 * the dashboard's landing page. The source design's own caption on this
 * screen: "kept for comparison... I'd make this the second tab, not the
 * front door" — 1d (app/(dashboard)/topics/page.tsx) is the front door;
 * this is what "Topics" in the Navbar actually points to.
 *
 * The search box filters the already-fetched list client-side. That's a
 * different thing from FR-2.2's GET /lexicon/search (Phase 1) — this box
 * filters topic titles you already belong to, not the public lexicon.
 */
export default function TopicsBrowsePage() {
  const { data: topics, isPending, isError } = useTopics();
  const [query, setQuery] = useState('');

  const filtered = topics?.filter((t) => t.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search your topics"
        aria-label="Search your topics"
        className="rounded-full border px-4 py-2 text-sm outline-none focus:border-primary"
      />

      {isPending && (
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 animate-pulse rounded-xl bg-muted" />
          <div className="h-20 animate-pulse rounded-xl bg-muted" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-muted-foreground">
          Couldn&apos;t load your topics right now. Check that the API is running.
        </p>
      )}

      {filtered && (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((topic) => (
            <TopicGridCard key={topic.id} topic={topic} />
          ))}
          <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed p-3.5 text-center text-muted-foreground">
            <span className="text-lg">+</span>
            <span className="text-xs">New Topic · Phase 1</span>
          </div>
        </div>
      )}

      {filtered?.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">No topics match &quot;{query}&quot;.</p>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Due counts per topic land with Module 3 — reviews are cross-topic in the meantime, see
        the Home tab.
      </p>
    </div>
  );
}
