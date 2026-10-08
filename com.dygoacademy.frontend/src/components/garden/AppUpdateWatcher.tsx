'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import {
  BUILD_ID,
  checkForNewBuild,
  getUpdateStatus,
  isChunkLoadError,
  subscribeUpdateStatus,
  type UpdateStatus,
} from '@/lib/app-version';

import { CloseIcon, RetryIcon } from './icons';

/** How often an open app asks for a new build. */
export const CHECK_EVERY_MS = 15 * 60 * 1000;
/** Back after this long away with a new build ready: reload on the spot (nothing was in progress). */
export const AWAY_RELOAD_MS = 5 * 60 * 1000;

const CHUNK_RELOAD_KEY = 'dygo_chunk_reload';

/** Updates the service worker (sw.js), then loads the new JavaScript. */
export async function reloadApp(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    await registration?.update();
  } catch {
    // No service worker, or offline: the reload below still fetches new JS.
  }
  window.location.reload();
}

/**
 * PWA updates (2026-10-08): keeps an open app on the deployed build
 * (`lib/app-version.ts`). Checks `/api/version` on start, every 15 min and
 * whenever the app comes back to the foreground.
 * - New build: a banner with Reload (can be closed); if the learner was
 *   away 5+ min, it reloads by itself when they come back.
 * - Old JS asking for a chunk the new build removed: reload once.
 */
export function AppUpdateWatcher() {
  const t = useTranslations('garden.update');
  const status = React.useSyncExternalStore<UpdateStatus>(
    subscribeUpdateStatus,
    getUpdateStatus,
    () => 'current',
  );
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    void checkForNewBuild();
    const timer = window.setInterval(() => void checkForNewBuild(), CHECK_EVERY_MS);
    let hiddenAt = document.visibilityState === 'hidden' ? Date.now() : 0;

    async function onVisibility() {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
      }
      const away = hiddenAt ? Date.now() - hiddenAt : 0;
      hiddenAt = 0;
      const now = await checkForNewBuild();
      if (now === 'available' && away >= AWAY_RELOAD_MS) void reloadApp();
    }

    function onChunkError(reason: unknown) {
      if (!isChunkLoadError(reason)) return;
      try {
        if (window.sessionStorage.getItem(CHUNK_RELOAD_KEY) === BUILD_ID) return;
        window.sessionStorage.setItem(CHUNK_RELOAD_KEY, BUILD_ID);
      } catch {
        // Storage blocked: reload anyway, once per page load.
      }
      void reloadApp();
    }
    const onError = (event: ErrorEvent) => onChunkError(event.error ?? event.message);
    const onRejection = (event: PromiseRejectionEvent) => onChunkError(event.reason);

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  const show = status === 'available' && !dismissed;
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(72px+var(--safe-bottom,0px))] z-50 flex justify-center px-4 md:bottom-auto md:top-[calc(16px+var(--safe-top,0px))]"
    >
      {show ? (
        <div
          data-update={status}
          className="pointer-events-auto flex w-full max-w-[420px] items-center gap-2 rounded-[16px] bg-forest py-2 pl-4 pr-2 text-[15px] text-white shadow-[0_6px_20px_rgba(28,43,36,.25)]"
        >
          <span className="min-w-0 grow leading-[1.35]">{t('available')}</span>
          <button
            type="button"
            onClick={() => void reloadApp()}
            className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-[12px] bg-white px-3.5 text-[15px] font-bold text-forest"
          >
            <RetryIcon width={16} height={16} />
            {t('reload')}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label={t('later')}
            className="flex size-11 shrink-0 items-center justify-center rounded-[12px] text-white/80"
          >
            <CloseIcon width={18} height={18} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
