import { MEDIA_CACHE, isMediaUrl } from '@/lib/media-cache';

/**
 * Audio start times from real phones (option 2, 2026-10-04): tap → sound
 * in ms, whether the file was already in the phone's media cache, played or
 * failed, and the network type. Batched to `POST /telemetry/media`; the
 * backend adds Cloudflare's country/city. No URL path or IP is sent, only
 * the host. Failures to report are ignored: this must never affect playback.
 */
export type MediaKind = 'word' | 'speaking';

export interface MediaLoadEvent {
  kind: MediaKind;
  host: string;
  outcome: 'played' | 'error';
  ms: number;
  from_cache: boolean;
  effective_type?: string;
}

/** Send when this many plays are queued, or FLUSH_AFTER_MS after the first. */
export const FLUSH_AT = 20;
export const FLUSH_AFTER_MS = 15_000;

let queue: MediaLoadEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let hiddenHookAdded = false;
const active = new WeakMap<HTMLAudioElement, AbortController>();

function networkType(): string | undefined {
  const c = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  return c?.effectiveType?.slice(0, 10) || undefined;
}

/** Sends what's queued now. Exported for tests. */
export async function flushMediaTimings(): Promise<void> {
  if (timer) clearTimeout(timer);
  timer = null;
  if (queue.length === 0) return;
  const events = queue;
  queue = [];
  try {
    // Loaded lazily: api-client validates env at import, and this module is
    // imported by AudioButton, which renders in tests without that env.
    const { apiClient } = await import('@/lib/api-client');
    await apiClient.post('/telemetry/media', { events });
  } catch {
    // Signed out, offline, old backend without the endpoint: drop them.
  }
}

function record(event: MediaLoadEvent): void {
  queue.push(event);
  if (!hiddenHookAdded && typeof document !== 'undefined') {
    hiddenHookAdded = true;
    // Send before the tab goes to the background (iOS may kill it after).
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void flushMediaTimings();
    });
  }
  if (queue.length >= FLUSH_AT) void flushMediaTimings();
  else if (!timer) timer = setTimeout(() => void flushMediaTimings(), FLUSH_AFTER_MS);
}

/**
 * Call right before `audio.play()`: records the time until the element
 * starts `playing` (or fails). A newer call for the same element cancels the
 * older measurement, so an interrupted play is never counted twice.
 */
export function trackAudioStart(audio: HTMLAudioElement, url: string, kind: MediaKind): void {
  let host: string;
  try {
    host = new URL(url, typeof location !== 'undefined' ? location.href : undefined).host;
  } catch {
    return;
  }
  active.get(audio)?.abort();
  const controller = new AbortController();
  active.set(audio, controller);

  const startedAt = performance.now();
  let fromCache = false;
  if (isMediaUrl(url) && typeof caches !== 'undefined') {
    caches
      .open(MEDIA_CACHE)
      .then((cache) => cache.match(url))
      .then((hit) => {
        fromCache = Boolean(hit);
      })
      .catch(() => undefined);
  }

  const finish = (outcome: MediaLoadEvent['outcome']) => {
    controller.abort();
    if (active.get(audio) === controller) active.delete(audio);
    record({
      kind,
      host,
      outcome,
      ms: Math.min(120_000, Math.max(0, Math.round(performance.now() - startedAt))),
      from_cache: fromCache,
      effective_type: networkType(),
    });
  };
  audio.addEventListener('playing', () => finish('played'), { once: true, signal: controller.signal });
  audio.addEventListener('error', () => finish('error'), { once: true, signal: controller.signal });
}

/** Test helper: empties the queue and timer without sending. */
export function resetMediaTimingsForTest(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  queue = [];
}
