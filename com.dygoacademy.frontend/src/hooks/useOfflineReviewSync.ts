'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { apiClient } from '@/lib/api-client';
import { getQueuedReviews, removeQueuedReviews } from '@/lib/offline-review-queue';
import type { SyncItemResult } from '@/types';

/**
 * Drains the IndexedDB offline-review queue (`lib/offline-review-queue.ts`)
 * through the backend's existing `POST /srs/sync` (SrsService.sync, unit
 * tested since Phase 2) whenever the browser regains connectivity. Mounted
 * once, near the app root (`components/layout/QueryProvider.tsx`), rather
 * than on `/study` itself — a review queued there should still sync after
 * the student has navigated to `/topics` or `/analytics` before
 * reconnecting, and a page-scoped effect would miss that.
 *
 * Fire-and-forget by design: a failed drain (e.g. the browser fires
 * `online` a moment before the API is actually reachable) leaves the
 * records in the queue for the next `online` event or the next mount —
 * there's nothing useful for a student to do with a sync-failed toast
 * mid-flashcard-session.
 */
export function useOfflineReviewSync(): void {
  const queryClient = useQueryClient();
  const isSyncing = useRef(false);

  useEffect(() => {
    async function drainQueue() {
      if (isSyncing.current) return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;

      const queued = await getQueuedReviews();
      if (queued.length === 0) return;

      isSyncing.current = true;
      try {
        const results = await apiClient.post<SyncItemResult[]>('/srs/sync', {
          reviews: queued.map((q) => ({
            topicWordId: q.topicWordId,
            rating: q.rating,
            reviewedAt: q.reviewedAt,
            responseMs: q.responseMs,
          })),
        });

        // Every item the server processed — applied or rejected — is done
        // being this queue's problem. An 'error' result (e.g. the word was
        // deleted since it was queued offline) isn't retryable by
        // resubmitting the same payload, so it's cleared too rather than
        // retried forever. Only reviews from a request that never reached
        // the server at all (the whole call throwing, below) stay queued.
        if (results.length === queued.length) {
          await removeQueuedReviews(queued.map((q) => q.id));
          void queryClient.invalidateQueries({ queryKey: ['srs'] });
        }
      } catch {
        // Still offline, or the server is unreachable — leave the queue
        // intact for the next 'online' event or mount.
      } finally {
        isSyncing.current = false;
      }
    }

    const handleOnline = () => void drainQueue();

    void drainQueue();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [queryClient]);
}
