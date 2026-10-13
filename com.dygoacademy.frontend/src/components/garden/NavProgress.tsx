'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { GardenLoader, SPINNER_MS } from './loader/GardenLoader';
import { Spinner } from './Spinner';

/** A click on a link shows the spinner after this long, so fast loads don't flash it. */
export const SPINNER_AFTER_MS = 200;

/**
 * Instant feedback for in-app navigation (slow 3G: the next screen can take
 * seconds to arrive and the old one just sits there, or the new one is blank).
 * A click on an internal link starts a thin bar at once, and after 200 ms a
 * spinner over the screen; both go when the path changes. It listens on the
 * document so it covers every link (tab bar, rail, sidebar, cards) without
 * touching them. New tabs, downloads, hash-only and same-page links are
 * ignored. The status text reuses `screens.live.loading` (no new copy).
 *
 * After 2.5 s still waiting, the loading screen LD3 "Bee's flight" covers the
 * page (slow message and Try again at 10 s). This does not depend on Next's
 * route `loading.tsx`, which only shows when the route was prefetched in
 * time: on a slow network the old screen otherwise just stays.
 */
export function NavProgress() {
  const t = useTranslations('screens.live');
  const pathname = usePathname();
  const [pending, setPending] = React.useState(false);
  const [spinner, setSpinner] = React.useState(false);
  const [bee, setBee] = React.useState(false);

  React.useEffect(() => {
    setPending(false);
    setSpinner(false);
    setBee(false);
  }, [pathname]);

  React.useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a');
      if (
        !anchor ||
        (anchor.target && anchor.target !== '_self') ||
        anchor.hasAttribute('download')
      ) {
        return;
      }
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }
      setPending(true);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  React.useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(() => setSpinner(true), SPINNER_AFTER_MS);
    const beeTimer = window.setTimeout(() => setBee(true), SPINNER_MS);
    // Safety net: a navigation that never finishes (offline) must not hang the overlay.
    const giveUp = window.setTimeout(() => {
      setPending(false);
      setBee(false);
    }, 60000);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(beeTimer);
      window.clearTimeout(giveUp);
    };
  }, [pending]);

  if (!pending) return null;
  if (bee) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-bg">
        <GardenLoader startAtBee />
      </div>
    );
  }
  return (
    <div role="status" aria-busy="true" className="pointer-events-none fixed inset-0 z-50">
      <span className="sr-only">{t('loading')}</span>
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[3px] overflow-hidden bg-gold/20"
      >
        <div className="h-full w-1/3 animate-[nav-progress_1.2s_ease-in-out_infinite] bg-gold motion-reduce:w-full motion-reduce:animate-none" />
      </div>
      {spinner ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center bg-bg/60"
        >
          <Spinner className="h-9 w-9 text-forest" />
        </div>
      ) : null}
    </div>
  );
}
