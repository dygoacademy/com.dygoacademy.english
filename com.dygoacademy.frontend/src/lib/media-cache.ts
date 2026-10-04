/**
 * Phone-side media cache (option 2, 2026-10-04). `public/sw.js` serves
 * files from media.dygoacademy.com cache-first; this file registers that
 * worker for every signed-in garden visit and lets screens warm the cache
 * ahead of time (Review: the next few cards' audio).
 *
 * Keep MEDIA_CACHE / MEDIA_HOSTS in sync with public/sw.js.
 */
export const MEDIA_CACHE = 'dygo-media-v1';
export const MEDIA_HOSTS = ['media.dygoacademy.com'];

/** True for a URL the service worker caches. */
export function isMediaUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    return MEDIA_HOSTS.includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** Registers /sw.js (idempotent; the push code registers the same file). */
export function registerMediaCache(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js').catch(() => {
    // No worker (private mode, old browser): audio just streams as before.
  });
}

/**
 * Downloads `urls` into the media cache in the background, skipping files
 * already cached and anything that isn't a media URL. Never throws: a
 * prefetch that fails just means the file streams when it's played.
 */
export async function prefetchMedia(urls: Array<string | null | undefined>): Promise<void> {
  if (typeof caches === 'undefined') return;
  const wanted = [...new Set(urls.filter(isMediaUrl))];
  if (wanted.length === 0) return;
  try {
    const cache = await caches.open(MEDIA_CACHE);
    await Promise.all(
      wanted.map(async (url) => {
        if (await cache.match(url)) return;
        const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
        if (res.status === 200 && res.type !== 'opaque') await cache.put(url, res);
      }),
    );
  } catch {
    // Offline, no CORS header on a cached CDN copy, storage full: ignore.
  }
}
