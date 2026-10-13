// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MEDIA_CACHE, isMediaUrl, prefetchMedia } from './media-cache';

const AUDIO = 'https://media.dygoacademy.com/audio/en/us/abc.m4a';

/** Minimal Cache Storage: one Map per cache name, insertion-ordered. */
class FakeCache {
  store = new Map<string, Response>();
  async match(req: string | Request) {
    const hit = this.store.get(typeof req === 'string' ? req : req.url);
    return hit ? hit.clone() : undefined;
  }
  async put(req: string | Request, res: Response) {
    this.store.set(typeof req === 'string' ? req : req.url, res.clone());
  }
  async keys() {
    return [...this.store.keys()].map((url) => new Request(url));
  }
  async delete(req: string | Request) {
    return this.store.delete(typeof req === 'string' ? req : req.url);
  }
}

function fakeCaches() {
  const byName = new Map<string, FakeCache>();
  return {
    byName,
    open: async (name: string) => {
      if (!byName.has(name)) byName.set(name, new FakeCache());
      return byName.get(name)!;
    },
    keys: async () => [...byName.keys()],
    delete: async (name: string) => byName.delete(name),
    match: async (req: string | Request, opts?: { cacheName?: string }) =>
      opts?.cacheName ? byName.get(opts.cacheName)?.match(req) : undefined,
  };
}

const bytes = (n: number) => new Uint8Array(Array.from({ length: n }, (_, i) => i));
const audioResponse = (n = 10) =>
  new Response(bytes(n), { status: 200, headers: { 'Content-Type': 'audio/mp4' } });

/** Loads the real public/sw.js with a fake `self`, `caches` and `fetch`. */
function loadServiceWorker(fetchMock: ReturnType<typeof vi.fn>) {
  const listeners: Record<string, (event: unknown) => void> = {};
  const self = {
    addEventListener: (type: string, fn: (event: unknown) => void) => {
      listeners[type] = fn;
    },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn(async () => undefined) },
    registration: { navigationPreload: { enable: vi.fn(async () => undefined) } },
    location: { origin: 'https://www.dygoacademy.com' },
  };
  const caches = fakeCaches();
  const src = readFileSync(path.resolve(__dirname, '../../public/sw.js'), 'utf8');
  new Function('self', 'caches', 'fetch', src)(self, caches, fetchMock);

  /** Fires a fetch event; resolves to the worker's response, or null if it didn't respond. */
  async function request(url: string, init?: RequestInit): Promise<Response | null> {
    let responded: Promise<Response> | null = null;
    listeners.fetch({ request: new Request(url, init), respondWith: (p: Promise<Response>) => (responded = p) });
    return responded ? await responded : null;
  }
  /** Fires a page-load fetch event (`mode: 'navigate'` can't be set on a real Request). */
  async function navigate(url: string, preloadResponse?: Promise<Response | undefined>) {
    let responded: Promise<Response> | null = null;
    const pageRequest = { url, method: 'GET', mode: 'navigate', headers: new Headers() };
    listeners.fetch({
      request: pageRequest,
      preloadResponse: preloadResponse ?? Promise.resolve(undefined),
      respondWith: (p: Promise<Response>) => (responded = p),
    });
    return { response: responded ? await responded : null, pageRequest };
  }
  /** Runs an install or activate event to completion. */
  async function lifecycle(type: 'install' | 'activate') {
    let done: Promise<unknown> = Promise.resolve();
    listeners[type]({ waitUntil: (p: Promise<unknown>) => (done = p) });
    await done;
  }
  return { request, navigate, lifecycle, caches, listeners, self };
}

describe('public/sw.js media cache', () => {
  it('leaves pages, the API and other hosts alone', async () => {
    const fetchMock = vi.fn();
    const sw = loadServiceWorker(fetchMock);
    expect(await sw.request('https://www.dygoacademy.com/review')).toBeNull();
    expect(await sw.request('https://api.dygoacademy.com/api/v1/srs/due')).toBeNull();
    expect(await sw.request(AUDIO, { method: 'POST', body: 'x' })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fetches a media file once with CORS, caches it, then serves it from the cache', async () => {
    const fetchMock = vi.fn(async () => audioResponse());
    const sw = loadServiceWorker(fetchMock);

    const first = await sw.request(AUDIO);
    expect(first!.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(AUDIO, { mode: 'cors', credentials: 'omit' });

    const second = await sw.request(AUDIO);
    expect(second!.status).toBe(200);
    expect(new Uint8Array(await second!.arrayBuffer())).toEqual(bytes(10));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('answers byte-range requests (iOS Safari <audio>) with 206 slices of the cached file', async () => {
    const fetchMock = vi.fn(async () => audioResponse(10));
    const sw = loadServiceWorker(fetchMock);

    const probe = await sw.request(AUDIO, { headers: { Range: 'bytes=0-1' } });
    expect(probe!.status).toBe(206);
    expect(probe!.headers.get('Content-Range')).toBe('bytes 0-1/10');
    expect(probe!.headers.get('Content-Type')).toBe('audio/mp4');
    expect(new Uint8Array(await probe!.arrayBuffer())).toEqual(new Uint8Array([0, 1]));

    const rest = await sw.request(AUDIO, { headers: { Range: 'bytes=4-' } });
    expect(rest!.headers.get('Content-Range')).toBe('bytes 4-9/10');
    expect(rest!.headers.get('Content-Length')).toBe('6');

    const tail = await sw.request(AUDIO, { headers: { Range: 'bytes=-3' } });
    expect(new Uint8Array(await tail!.arrayBuffer())).toEqual(new Uint8Array([7, 8, 9]));

    const beyond = await sw.request(AUDIO, { headers: { Range: 'bytes=20-' } });
    expect(beyond!.status).toBe(416);
    expect(beyond!.headers.get('Content-Range')).toBe('bytes */10');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to a plain network fetch when the file can not be cached (no CORS → opaque)', async () => {
    const passthrough = audioResponse();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ status: 0, type: 'opaque' })
      .mockResolvedValueOnce(passthrough);
    const sw = loadServiceWorker(fetchMock);

    const res = await sw.request(AUDIO, { headers: { Range: 'bytes=0-1' } });
    expect(res).toBe(passthrough);
    const [req] = fetchMock.mock.calls[1] as [Request];
    expect(req.headers.get('range')).toBe('bytes=0-1'); // the original request, Range kept
    expect(sw.caches.byName.get('dygo-media-v1')?.store.size ?? 0).toBe(0);
  });

  it('falls back to the network when the cache path throws', async () => {
    const passthrough = audioResponse();
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError('CORS')).mockResolvedValueOnce(passthrough);
    const sw = loadServiceWorker(fetchMock);
    expect(await sw.request(AUDIO)).toBe(passthrough);
  });

  it('on activate, deletes older media caches but keeps the current one', async () => {
    const sw = loadServiceWorker(vi.fn());
    await sw.caches.open('dygo-media-v0');
    await sw.caches.open(MEDIA_CACHE);
    await sw.caches.open('something-else');
    let done: Promise<unknown> = Promise.resolve();
    sw.listeners.activate({ waitUntil: (p: Promise<unknown>) => (done = p) });
    await done;
    expect([...sw.caches.byName.keys()].sort()).toEqual([MEDIA_CACHE, 'something-else']);
  });
});

describe('public/sw.js offline page', () => {
  const PAGE = 'https://www.dygoacademy.com/review';
  const OFFLINE = 'https://www.dygoacademy.com/offline.html';
  const offlinePage = () => new Response('<h1>offline</h1>', { status: 200 });

  it('caches /offline.html on install', async () => {
    const fetchMock = vi.fn(async () => offlinePage());
    const sw = loadServiceWorker(fetchMock);
    // cache.add(request) on the fake: fetch it and store it, like the real one.
    const cache = await sw.caches.open('dygo-offline-v1');
    Object.assign(cache, {
      add: async (req: Request) => cache.put(req, await fetchMock()),
    });
    await sw.lifecycle('install');
    expect(sw.self.skipWaiting).toHaveBeenCalled();
    expect(await cache.match(OFFLINE)).toBeDefined();
  });

  it('install still finishes when the offline page can not be fetched', async () => {
    const sw = loadServiceWorker(vi.fn());
    const cache = await sw.caches.open('dygo-offline-v1');
    Object.assign(cache, { add: async () => Promise.reject(new TypeError('offline')) });
    await expect(sw.lifecycle('install')).resolves.toBeUndefined();
  });

  it('loads pages from the network when online', async () => {
    const page = new Response('<h1>review</h1>');
    const fetchMock = vi.fn(async () => page);
    const sw = loadServiceWorker(fetchMock);
    const { response, pageRequest } = await sw.navigate(PAGE);
    expect(response).toBe(page);
    expect(fetchMock).toHaveBeenCalledWith(pageRequest);
  });

  it('uses the navigation preload response when there is one', async () => {
    const preloaded = new Response('<h1>preloaded</h1>');
    const fetchMock = vi.fn();
    const sw = loadServiceWorker(fetchMock);
    const { response } = await sw.navigate(PAGE, Promise.resolve(preloaded));
    expect(response).toBe(preloaded);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows the cached offline page when the network fails', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const sw = loadServiceWorker(fetchMock);
    await (await sw.caches.open('dygo-offline-v1')).put(OFFLINE, offlinePage());

    const viaFetch = await sw.navigate(PAGE);
    expect(await viaFetch.response!.text()).toBe('<h1>offline</h1>');

    const viaPreload = await sw.navigate(PAGE, Promise.reject(new TypeError('Failed to fetch')));
    expect(await viaPreload.response!.text()).toBe('<h1>offline</h1>');
  });

  it('returns a network error when offline and the offline page was never cached', async () => {
    const sw = loadServiceWorker(vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const { response } = await sw.navigate(PAGE);
    expect(response!.type).toBe('error');
  });

  it('on activate, enables navigation preload and replaces older offline caches', async () => {
    const sw = loadServiceWorker(vi.fn());
    await sw.caches.open('dygo-offline-v0');
    await sw.caches.open('dygo-offline-v1');
    await sw.lifecycle('activate');
    expect(sw.caches.byName.has('dygo-offline-v0')).toBe(false);
    expect(sw.caches.byName.has('dygo-offline-v1')).toBe(true);
    expect(sw.self.registration.navigationPreload.enable).toHaveBeenCalled();
    expect(sw.self.clients.claim).toHaveBeenCalled();
  });
});

describe('lib/media-cache', () => {
  let caches: ReturnType<typeof fakeCaches>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    caches = fakeCaches();
    fetchMock = vi.fn(async () => audioResponse());
    vi.stubGlobal('caches', caches);
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('isMediaUrl: only media.dygoacademy.com', () => {
    expect(isMediaUrl(AUDIO)).toBe(true);
    expect(isMediaUrl('https://pub-x.r2.dev/audio/en/us/abc.wav')).toBe(false);
    expect(isMediaUrl(null)).toBe(false);
    expect(isMediaUrl('not a url')).toBe(false);
  });

  it('prefetchMedia caches media URLs once and ignores the rest', async () => {
    await prefetchMedia([AUDIO, AUDIO, null, 'https://pub-x.r2.dev/a.wav']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(AUDIO, { mode: 'cors', credentials: 'omit' });
    expect(await (await caches.open(MEDIA_CACHE)).match(AUDIO)).toBeDefined();

    await prefetchMedia([AUDIO]);
    expect(fetchMock).toHaveBeenCalledTimes(1); // already cached
  });

  it('prefetchMedia never throws', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'));
    await expect(prefetchMedia([AUDIO])).resolves.toBeUndefined();
  });
});
