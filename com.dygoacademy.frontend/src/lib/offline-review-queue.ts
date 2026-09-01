'use client';

import type { SrsRating } from '@/types';

/**
 * Module 4's flagged gap — "Offline-first sync capability using local
 * SQLite/IndexedDB cache" — was never built on the frontend, even though
 * the backend's `POST /srs/sync` (SrsService.sync) has existed and been
 * unit tested since Phase 2. This is the missing half: a durable local
 * queue so a rating submitted with no network isn't silently lost, which
 * is exactly what happened before this file existed — `useRateWord`'s
 * mutation would reject, React Query would record the error internally,
 * and nothing retried it or told the student.
 *
 * IndexedDB, not localStorage: a queued review is exactly the kind of
 * structured data that should survive a tab close or crash, and unlike
 * localStorage, IndexedDB access doesn't block the main thread. No new
 * dependency (idb, Dexie, ...) — the native API is a handful of lines for
 * one object store, and this is the only IndexedDB usage in the codebase
 * so far, making a wrapper library premature.
 */

const DB_NAME = 'dygo-offline-queue';
const DB_VERSION = 1;
const STORE_NAME = 'pending-reviews';

export interface QueuedReviewRecord {
  /** IndexedDB auto-increment key. Local bookkeeping only — never sent to the server. */
  id: number;
  topicWordId: string;
  rating: SrsRating;
  reviewedAt: string;
  responseMs?: number;
}

function isIndexedDbAvailable(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open offline queue database.'));
  });
}

/**
 * Adds one review to the durable queue. Deliberately never throws for the
 * caller to handle mid-study-session — a queue failure (private browsing
 * mode with IndexedDB disabled, quota exceeded, etc.) degrades to "this one
 * review is lost," the same outcome as before this file existed, rather
 * than surfacing a scary error over what the student experiences as
 * tapping a flashcard rating button.
 */
export async function enqueueReview(review: Omit<QueuedReviewRecord, 'id'>): Promise<void> {
  if (!isIndexedDbAvailable()) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).add(review);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to queue offline review.'));
    });
    db.close();
  } catch {
    // See header comment — deliberately swallowed.
  }
}

export async function getQueuedReviews(): Promise<QueuedReviewRecord[]> {
  if (!isIndexedDbAvailable()) return [];
  try {
    const db = await openDb();
    const records = await new Promise<QueuedReviewRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result as QueuedReviewRecord[]);
      req.onerror = () => reject(req.error ?? new Error('Failed to read the offline review queue.'));
    });
    db.close();
    return records;
  } catch {
    return [];
  }
}

export async function removeQueuedReviews(ids: number[]): Promise<void> {
  if (!isIndexedDbAvailable() || ids.length === 0) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      ids.forEach((id) => store.delete(id));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to clear synced offline reviews.'));
    });
    db.close();
  } catch {
    // See enqueueReview's header comment — deliberately swallowed.
  }
}

export async function countQueuedReviews(): Promise<number> {
  return (await getQueuedReviews()).length;
}
