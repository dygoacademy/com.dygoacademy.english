'use client';

import { useEffect, useState } from 'react';

import { CreateTopicModal } from '@/components/groups/CreateTopicModal';
import { TopicCollectionRow } from '@/components/topics/TopicCollectionRow';
import { TopicGridCard } from '@/components/topics/TopicGridCard';
import { TopicsViewToggle, type TopicsView } from '@/components/topics/TopicsViewToggle';
import { useGroups } from '@/hooks/useGroups';
import { useTopics } from '@/hooks/useTopics';
import { CONTENT_WIDTH } from '@/constants/layout';

const VIEW_STORAGE_KEY = 'dygo:topics-view';

/**
 * Wireframe 1f — the topics grid, deliberately its own route rather than
 * the dashboard's landing page. The source design's own caption on this
 * screen: "kept for comparison... I'd make this the second tab, not the
 * front door" — 1d (`(dashboard)/page.tsx`, the site root since the
 * 2026-09-17 reshuffle below) is the front door; this is what "Topics" in
 * the Navbar actually points to.
 *
 * Lives at "/topics" since that reshuffle — was
 * `(dashboard)/topics/browse/page.tsx` before that, when "/topics" was
 * still the front door's own URL. Not to be confused with the *backend*
 * route `GET /topics` (topics.service.ts) that `useTopics()` below calls —
 * same string, a REST API path on a completely different service, no
 * relation to this file's own frontend URL.
 *
 * The search box filters the already-fetched list client-side. That's a
 * different thing from FR-2.2's GET /lexicon/search (Phase 1) — this box
 * filters topic titles you already belong to, not the public lexicon.
 *
 * The "+ New Topic" tile read "· Phase 1" (disabled, no click handler) from
 * turn 1 until this pass — `CreateTopicModal` (built alongside the group
 * detail page, same pass) is shared here with a group picker, since this
 * page — unlike the group detail page — has no single group already in
 * scope.
 *
 * 2x2 grid (`TopicGridCard`) replaced 2026-09-20 with a vertical list of
 * `TopicCollectionRow` (Phase 9, "Topics as Collections" —
 * `phase 9 implementation plan.md`): leading with a larger mastery ring
 * per row reframes "21 words" as "how much you've already earned"
 * instead of "how much work is left."
 *
 * Made optional the same day, live-reported right after shipping as a
 * hard replacement ("I think the list can let use choose vertical list
 * or gridcard by them self rather than we give on option to the
 * customer"): both layouts now coexist behind `TopicsViewToggle`, `list`
 * still the default (the mastery-first reframing above is still the
 * point), `grid` one click away. Preference persisted to `localStorage`
 * (`VIEW_STORAGE_KEY`) -- read in a `useEffect`, not a `useState` lazy
 * initializer, since the initializer runs during SSR where `localStorage`
 * doesn't exist; reading it after mount means one render at the default
 * before the stored preference (if any) applies, rather than a
 * server/client hydration mismatch.
 */
export default function TopicsBrowsePage() {
  const { data: topics, isPending, isError } = useTopics();
  const { data: groups } = useGroups();
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [view, setView] = useState<TopicsView>('list');

  useEffect(() => {
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored === 'list' || stored === 'grid') setView(stored);
  }, []);

  function changeView(next: TopicsView) {
    setView(next);
    window.localStorage.setItem(VIEW_STORAGE_KEY, next);
  }

  const filtered = topics?.filter((t) => t.title.toLowerCase().includes(query.toLowerCase()));
  const writableGroups = groups?.filter((g) => g.role === 'ADMIN' || g.role === 'WRITE') ?? [];

  return (
    <div className={`mx-auto flex ${CONTENT_WIDTH.wide} flex-col gap-4 p-6`}>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your topics"
          aria-label="Search your topics"
          className="min-w-0 flex-1 rounded-full border px-4 py-2 text-sm outline-none focus:border-primary"
        />
        <TopicsViewToggle view={view} onChange={changeView} />
      </div>

      {isPending && (
        <div className={view === 'grid' ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-2'}>
          <div className="h-16 animate-pulse rounded-xl bg-muted" />
          <div className="h-16 animate-pulse rounded-xl bg-muted" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-muted-foreground">
          Couldn&apos;t load your topics right now. Check that the API is running.
        </p>
      )}

      {filtered && view === 'list' && (
        <div className="flex flex-col gap-2">
          {filtered.map((topic) => (
            <TopicCollectionRow key={topic.id} topic={topic} />
          ))}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            disabled={writableGroups.length === 0}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed p-3.5 text-center text-muted-foreground hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="text-lg leading-none">+</span>
            <span className="text-xs">
              {writableGroups.length === 0 ? 'New Topic · join a group first' : 'New Topic'}
            </span>
          </button>
        </div>
      )}

      {filtered && view === 'grid' && (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((topic) => (
            <TopicGridCard key={topic.id} topic={topic} />
          ))}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            disabled={writableGroups.length === 0}
            className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed p-3.5 text-center text-muted-foreground hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="text-lg">+</span>
            <span className="text-xs">
              {writableGroups.length === 0 ? 'New Topic · join a group first' : 'New Topic'}
            </span>
          </button>
        </div>
      )}

      {filtered?.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">No topics match &quot;{query}&quot;.</p>
      )}

      {/* Rewritten 2026-09-19 (Phase 2 FR-15.2) -- was "Due counts per topic
          land with Module 3 — reviews are cross-topic in the meantime, see
          the Home tab.", an internal module-milestone name that reached
          production copy. Says the same thing in learner-facing language;
          the underlying per-topic due-count feature itself is still not
          built (phase 2.md open question 1 defers that decision to
          Product), so this is a copy fix only, not a feature. */}
      <p className="text-center text-xs text-muted-foreground">
        Review counts are combined across all your topics for now — see Home for what&apos;s due.
      </p>

      <CreateTopicModal open={modalOpen} onOpenChange={setModalOpen} groups={writableGroups} />
    </div>
  );
}
