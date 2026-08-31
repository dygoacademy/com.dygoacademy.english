/**
 * Web Push registration helpers (FR-6.5). Kept out of the hooks themselves
 * so `usePushSubscription.ts` stays about *state*, not browser-API plumbing
 * — same split `api-client.ts` keeps between "how to call the API" and the
 * hooks that decide when to call it.
 */

/** True only in a browser that actually supports the Push API — SSR and older browsers both fail this. */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * The Push API wants the VAPID public key as a `Uint8Array`, not the
 * base64url string the backend hands back — this is the standard
 * conversion (RFC 4648 §5 base64url, padded back out to a multiple of 4).
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

/**
 * Registers `/sw.js` (idempotent — the browser no-ops a re-register of the
 * same script) and returns the live registration once it's `ready`, so
 * callers never race a subscribe() against an installing worker.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.register('/sw.js');
  return navigator.serviceWorker.ready.then(() => registration);
}

/** Subscribes (or reuses an existing subscription) and returns it as plain JSON, ready to POST to `/notifications/subscribe`. */
export async function subscribeToPush(
  registration: ServiceWorkerRegistration,
  vapidPublicKey: string,
): Promise<PushSubscriptionJSON> {
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true, // required by Chrome/Firefox — every push must show a visible notification
      // TS's lib.dom BufferSource type doesn't line up with Uint8Array's own
      // generic ArrayBufferLike param across TS versions — the browser only
      // cares that this is a byte view, so a cast is safe here.
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    }));
  return subscription.toJSON();
}

/** Unsubscribes at the browser level. The caller is still responsible for telling the backend (DELETE /notifications/subscribe). */
export async function unsubscribeFromPush(registration: ServiceWorkerRegistration): Promise<string | null> {
  const existing = await registration.pushManager.getSubscription();
  if (!existing) return null;
  const endpoint = existing.endpoint;
  await existing.unsubscribe();
  return endpoint;
}
