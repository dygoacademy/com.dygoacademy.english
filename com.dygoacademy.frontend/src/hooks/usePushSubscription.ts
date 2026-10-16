'use client';

import { useCallback, useEffect, useState } from 'react';

import { apiClient } from '@/lib/api-client';
import { isPushSupported, registerServiceWorker, subscribeToPush, unsubscribeFromPush } from '@/lib/push';

export type PushPermissionState = 'unsupported' | 'default' | 'denied' | 'subscribed' | 'unsubscribed';

/**
 * Owns the whole FR-6.5 subscribe/unsubscribe lifecycle: browser support
 * check, the `Notification.permission` prompt, service worker registration,
 * fetching the server's VAPID key, and syncing the resulting subscription
 * with `POST`/`DELETE /notifications/subscribe`.
 *
 * Not a TanStack Query hook like the rest of `src/hooks/` — the thing being
 * tracked (a live `PushSubscription` object) lives in the browser's Push API,
 * not the server, so there is no `queryFn` to point at; `useState` +
 * `useEffect` is the honest shape here, same reasoning `useStudySessionStore`
 * (Zustand, not TanStack Query) uses for client-only session state.
 */
export function usePushSubscription() {
  const [state, setState] = useState<PushPermissionState>('default');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** False until the first check of this browser's real state has finished. */
  const [checked, setChecked] = useState(false);

  const refreshState = useCallback(async () => {
    try {
      if (!isPushSupported()) {
        setState('unsupported');
        return;
      }
      if (Notification.permission === 'denied') {
        setState('denied');
        return;
      }
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      const existing = await registration?.pushManager.getSubscription();
      setState(existing ? 'subscribed' : 'unsubscribed');
    } finally {
      setChecked(true);
    }
  }, []);

  useEffect(() => {
    void refreshState();
  }, [refreshState]);

  /**
   * Asks for permission if needed, subscribes this browser and saves the
   * subscription on the server. Resolves true only when the server has it,
   * so a caller never shows a reminder as on when nothing can arrive. Safe
   * to call when already subscribed: it re-saves the subscription, which
   * repairs a server row that was pruned or taken over by another account.
   */
  const subscribe = useCallback(async (): Promise<boolean> => {
    setError(null);
    setIsPending(true);
    try {
      if (!isPushSupported()) {
        setState('unsupported');
        return false;
      }
      const permission =
        Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'default');
        return false;
      }

      const registration = await registerServiceWorker();
      const { publicKey } = await apiClient.get<{ publicKey: string }>('/notifications/vapid-public-key');
      if (!publicKey) {
        throw new Error('Push notifications are not configured on the server yet.');
      }

      const subscription = await subscribeToPush(registration, publicKey);
      if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
        throw new Error('Browser did not return a usable push subscription.');
      }

      await apiClient.post('/notifications/subscribe', {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
        userAgent: navigator.userAgent,
      });

      setState('subscribed');
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not enable push notifications.');
      return false;
    } finally {
      setIsPending(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setError(null);
    setIsPending(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      const endpoint = registration ? await unsubscribeFromPush(registration) : null;
      if (endpoint) {
        await apiClient.delete<void>('/notifications/subscribe', { endpoint }).catch(() => {
          // Browser-side unsubscribe already happened — a failed server
          // cleanup just leaves a dead row PushDispatchService will prune
          // itself on the next 410 anyway, not worth blocking the UI on.
        });
      }
      setState('unsubscribed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not disable push notifications.');
    } finally {
      setIsPending(false);
    }
  }, []);

  return { state, checked, isPending, error, subscribe, unsubscribe };
}
