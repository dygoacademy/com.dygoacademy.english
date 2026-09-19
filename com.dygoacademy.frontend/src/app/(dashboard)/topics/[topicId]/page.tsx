'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

import { AddWordModal } from '@/components/topics/AddWordModal';
import { Button } from '@/components/ui/button';
import { EmptyTopicState } from '@/components/topics/EmptyTopicState';
import { WordStatusRow } from '@/components/topics/WordStatusRow';
import { ROUTES } from '@/constants/routes';
import { useDeleteTopic } from '@/hooks/useTopicMutations';
import { useGroups } from '@/hooks/useGroups';
import { useTopic } from '@/hooks/useTopic';
import { ApiError } from '@/lib/api-client';
import { CONTENT_WIDTH } from '@/constants/layout';

/**
 * Topic detail — wireframes 1j (empty), 1k (enriching), 1l (failed).
 *
 * Was built against `GET /api/v1/topics` (list) plus a client-side find,
 * with the word list itself mocked, because `GET /topics/:id` didn't exist
 * yet. It's live now (topics.service.ts `findById`, Module 1) and returns
 * real `words[]` with real status — this page now polls it directly via
 * useTopic rather than reaching into the list query.
 *
 * Delete added 2026-09-04: `useDeleteTopic()` already existed
 * (useTopicMutations.ts) and was wired into GroupTopicsPanel, but this
 * page — the other place someone naturally lands on a topic — had no way
 * to trigger it at all. Same ADMIN-gating and confirm-dialog pattern as
 * GroupTopicsPanel, since `topics_delete_admin` is the same RLS policy
 * either caller hits; `GET /topics/:id` doesn't return the caller's role
 * in the topic's group, so `useGroups()` is queried here too, same as the
 * group detail page, to find it.
 */
export default function TopicDetailPage() {
  const params = useParams<{ topicId: string }>();
  const router = useRouter();
  const { data: topic, isPending, isError } = useTopic(params.topicId);
  const { data: groups } = useGroups();
  const deleteTopic = useDeleteTopic();
  const [addWordOpen, setAddWordOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (isPending) {
    return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  }

  if (isError || !topic) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          {isError ? "Couldn't load this topic right now." : 'Topic not found.'}
        </p>
        <Link href="/topics" className="text-sm underline underline-offset-4">
          Back to topics
        </Link>
      </div>
    );
  }

  const isEmpty = topic.words.length === 0;
  const canManage = groups?.find((g) => g.id === topic.group_id)?.role === 'ADMIN';

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${topic.title}"? This can't be undone.`)) return;
    setDeleteError(null);
    try {
      await deleteTopic.mutateAsync(topic.id);
      router.push(ROUTES.groupDetail(topic.group_id));
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Could not delete this topic.');
    }
  };

  return (
    <div className={`mx-auto flex ${CONTENT_WIDTH.default} flex-col gap-3 p-6`}>
      <Link href="/topics" className="text-xs text-muted-foreground underline underline-offset-4">
        ← Your topics
      </Link>
      {/* Title and the Study/Quiz/Add-word actions each get their own
          line -- live-requested 2026-09-18 ("The Topic Name and All
          function show be in individual lines"). Was `justify-between`
          on one row (title left, button row pinned right), which got
          tight on a long topic title -- flex-col here stacks them, and
          the button row keeps its own `flex-wrap` so Study/Quiz/+Add a
          word can still wrap onto a second line rather than overflow on
          a narrow phone, same mobile-first convention as everywhere else
          (§16 of the architecture doc). Buttons stay on the existing
          `ui/button.tsx` (Radix Primitives' Slot + Tailwind/shadcn, the
          same pattern Dialog and Navigation Menu use) rather than Radix
          Themes' separate pre-styled Button -- installing Radix Themes
          here would mean a second, visually-inconsistent design system
          alongside every other button in the app; confirmed with the
          user before proceeding.

          Redesigned again the same day ("refactor ui/ux design of those
          button Study, Quiz, Add Word that will be follow the radix-ui
          buttom") -- still the same Radix-Slot-backed `Button`, just
          styled with clearer visual hierarchy the way a Radix UI button
          group typically reads: Study/Quiz are the frequent, secondary
          actions (`outline`), "Add a word" is the one primary action on
          this row (`default`/solid) so it's the button your eye lands on
          first. Each now carries a small icon next to its label -- an
          open book for Study, a checklist for Quiz, a plus for Add a
          word -- so the row scans by shape, not just text, and bumped
          from `size="sm"` to the default size for a bigger, easier tap
          target (matching the same "make it easier to tap" reasoning
          behind the flashcard's Play Sound button redesign). */}
      <div className="flex flex-col gap-3">
        <h1 className="text-lg font-semibold">{topic.title}</h1>
        {!isEmpty && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" asChild>
              <Link href={`/study?topicId=${topic.id}`}>
                <BookIcon className="h-4 w-4" />
                Study
              </Link>
            </Button>
            <Button variant="outline" className="gap-2" asChild>
              <Link href={`/quiz?topicId=${topic.id}`}>
                <QuizIcon className="h-4 w-4" />
                Quiz
              </Link>
            </Button>
            <Button className="gap-2" onClick={() => setAddWordOpen(true)}>
              <PlusIcon className="h-4 w-4" />
              Add a word
            </Button>
          </div>
        )}
      </div>

      {isEmpty ? (
        <EmptyTopicState onAddWord={() => setAddWordOpen(true)} />
      ) : (
        <div className="flex flex-col gap-2">
          {topic.words.map((word) => (
            <WordStatusRow key={word.id} word={word} topicId={topic.id} />
          ))}
        </div>
      )}

      <AddWordModal topicId={topic.id} open={addWordOpen} onOpenChange={setAddWordOpen} />

      {/* Moved to the bottom, separated from the primary actions above —
          a destructive, irreversible action sitting next to frequently-used
          ones (Study/Quiz/Add word) invites a misclick. */}
      {canManage && (
        <div className="mt-4 border-t pt-4">
          {deleteError && <p className="mb-2 text-xs text-destructive">{deleteError}</p>}
          <Button size="sm" onClick={handleDelete} disabled={deleteTopic.isPending}>
            Delete this topic
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Small stroke icons for the Study/Quiz/Add-word action row --
 * live-requested 2026-09-18 ("refactor ui/ux design of those button
 * Study, Quiz, Add Word"). Hand-rolled inline SVGs rather than a new
 * icon package dependency, matching the codebase's existing convention
 * (see ui/dialog.tsx's XIcon, ui/select.tsx's Chevron/Check icons,
 * ui/navigation-menu.tsx's ChevronDownIcon) -- same viewBox/stroke/
 * strokeWidth/linecap/linejoin recipe so every icon in the app reads as
 * one consistent family.
 */
function BookIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  );
}

function QuizIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}
