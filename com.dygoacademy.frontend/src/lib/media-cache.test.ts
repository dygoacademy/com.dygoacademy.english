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
    registration: {},
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
  return { request, caches, listeners };
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
