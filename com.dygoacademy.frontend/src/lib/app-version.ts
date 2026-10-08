/**
 * App version check (PWA updates, 2026-10-08). A phone can keep an old
 * copy of the app's JavaScript open for days (a home-screen app, a tab
 * left open). Every `next build` gets its own `BUILD_ID`, baked into this
 * JavaScript; `/api/version` answers with the server's current one, and a
 * different value means a newer build is deployed, so the app offers a
 * reload.
 */
export const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || 'dev';
/** Same-origin route that reports the deployed build (src/app/api/version). */
export const VERSION_PATH = '/api/version';

export type UpdateStatus = 'current' | 'available';

let status: UpdateStatus = 'current';
const listeners = new Set<() => void>();

function markAvailable() {
  if (status === 'available') return;
  status = 'available';
  listeners.forEach((listener) => listener());
}

export function getUpdateStatus(): UpdateStatus {
  return status;
}

export function subscribeUpdateStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Asks the server which build is deployed; network errors are ignored (offline). */
export async function checkForNewBuild(fetcher: typeof fetch = fetch): Promise<UpdateStatus> {
  if (BUILD_ID === 'dev') return status;
  try {
    const res = await fetcher(VERSION_PATH, { cache: 'no-store' });
    if (res.ok) {
      const body = (await res.json()) as { build_id?: string };
      if (body.build_id && body.build_id !== BUILD_ID) markAvailable();
    }
  } catch {
    // Offline or the server is restarting: try again next time.
  }
  return status;
}

/** A chunk of old JS that the new build no longer has. */
export function isChunkLoadError(reason: unknown): boolean {
  const text =
    reason instanceof Error ? `${reason.name} ${reason.message}` : typeof reason === 'string' ? reason : '';
  return /ChunkLoadError|Loading chunk [\w-]+ failed|Failed to fetch dynamically imported module/i.test(text);
}

/** For tests only. */
export function resetUpdateStatusForTests(): void {
  status = 'current';
  listeners.clear();
}
