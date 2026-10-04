/**
 * Dygo service worker: Web Push (FR-6.1/6.3/6.4 delivery, FR-6.5 the 1-tap
 * link) and, since 2026-10-04, a phone-side cache for media files.
 *
 * Push: turns a push event into a visible notification, and a notification
 * click into a focused/opened tab at the deep link the backend sent
 * (PushDispatchService's `payload.url`, an absolute URL so this file needs
 * no knowledge of the frontend's own origin).
 *
 * Media cache (option 2, docs/phase13-notes.md §15): audio from
 * media.dygoacademy.com is immutable (keyed by content hash), so it's
 * served cache-first from Cache Storage `dygo-media-v1` (newest
 * MEDIA_CACHE_MAX files kept). Replays are instant and work offline.
 * <audio> on iOS Safari always asks for byte ranges, so ranges are cut
 * from the cached file as 206 responses. Everything else (pages, the API,
 * other hosts) is not touched: no respondWith, the browser handles it.
 * Any failure (e.g. a response without CORS headers) falls back to a
 * plain network fetch of the original request.
 */

const MEDIA_CACHE = 'dygo-media-v1';
const MEDIA_HOSTS = ['media.dygoacademy.com'];
const MEDIA_CACHE_MAX = 400;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((n) => n.startsWith('dygo-media-') && n !== MEDIA_CACHE)
            .map((n) => caches.delete(n)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isMediaRequest(request) {
  if (request.method !== 'GET') return false;
  try {
    return MEDIA_HOSTS.includes(new URL(request.url).hostname);
  } catch {
    return false;
  }
}

/** "bytes=a-b" | "bytes=a-" | "bytes=-n" → { start, end } (inclusive), or null if unsatisfiable. */
function parseRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec((header || '').trim());
  if (!m || (m[1] === '' && m[2] === '')) return null;
  let start;
  let end;
  if (m[1] === '') {
    start = Math.max(0, size - Number(m[2]));
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (start > end || start >= size) return null;
  return { start, end };
}

async function trimMediaCache(cache) {
  const keys = await cache.keys();
  const extra = keys.length - MEDIA_CACHE_MAX;
  for (let i = 0; i < extra; i += 1) await cache.delete(keys[i]);
}

/** The whole file, from the cache or the network (then cached). Null if it can't be cached. */
async function fullMediaResponse(url) {
  const cache = await caches.open(MEDIA_CACHE);
  const hit = await cache.match(url);
  if (hit) return hit;
  const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
  if (res.status !== 200 || res.type === 'opaque') return null;
  await cache.put(url, res.clone());
  trimMediaCache(cache);
  return res;
}

async function rangeResponse(full, rangeHeader) {
  const buf = await full.arrayBuffer();
  const size = buf.byteLength;
  const r = parseRange(rangeHeader, size);
  if (!r) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  }
  const body = buf.slice(r.start, r.end + 1);
  return new Response(body, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': full.headers.get('Content-Type') || 'application/octet-stream',
      'Content-Range': `bytes ${r.start}-${r.end}/${size}`,
      'Content-Length': String(body.byteLength),
      'Accept-Ranges': 'bytes',
    },
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!isMediaRequest(request)) return;
  event.respondWith(
    (async () => {
      try {
        const full = await fullMediaResponse(request.url);
        if (!full) return fetch(request);
        const range = request.headers.get('range');
        return range ? rangeResponse(full, range) : full;
      } catch {
        return fetch(request);
      }
    })(),
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  const { title, body, url, tag } = payload;
  event.waitUntil(
    self.registration.showNotification(title || 'Dygo Academy', {
      body,
      tag, // same tag replaces, rather than stacks, an unread reminder of the same kind
      data: { url },
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data && event.notification.data.url;
  if (!targetUrl) return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus an already-open tab on the same origin rather than opening a
      // second one — a student who already has Dygo open shouldn't end up
      // with two tabs after tapping a reminder.
      const existing = clients.find((c) => c.url.startsWith(self.location.origin));
      if (existing) {
        return existing.navigate(targetUrl).then(() => existing.focus());
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
