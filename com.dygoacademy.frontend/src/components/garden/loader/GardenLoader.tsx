'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { usePathname } from 'next/navigation';

import { gcn } from '../cn';
import { GardenTabBar } from '../screens/GardenTabBar';
import { BeeOrbitArt } from './BeeOrbitArt';
import { SproutArt } from './SproutArt';
import { tabFor } from './tabs';

export type LoaderPhase = 'sprout' | 'bee' | 'slow';

/** App start: LD1 for this long, then LD3. */
export const SPROUT_MS = 4000;
/** A caller that has already made the learner wait this long (`NavProgress`) starts at LD3. */
export const SPINNER_MS = 2500;
/** Either way, the slow message and Try again after this long. */
export const SLOW_MS = 10000;

/** A loader that mounts this soon after another one went continues the same wait. */
export const CONTINUE_MS = 500;

/**
 * The wait in progress: when it began and whether it is the app-start wait
 * (LD1 first). Screens often hand over from one loader to the next (the route
 * fallback, then a screen's own `LiveLoading`); the next one continues the wait
 * instead of starting the timers again.
 */
interface Wait {
  start: number;
  first: boolean;
}
let wait: Wait | null = null;
let active = 0;
let lastEnd = 0;
/**
 * Has a loader already been shown (and gone) since this page loaded? The
 * server render and the first client render both see `false`, so there is
 * no hydration mismatch. Set in the cleanup of the first loader to unmount.
 */
let booted = false;

/** Whether the first loader since the page loaded is still to come (the route fallback uses it). */
export function isAppStart(): boolean {
  return !booted;
}

/** The learner has used the app (clicked a link): later loaders are "later loads", not app start. */
export function markAppStarted(): void {
  booted = true;
}

/** For tests only. */
export function resetLoaderBootForTests(): void {
  booted = false;
  wait = null;
  active = 0;
  lastEnd = 0;
}

function joinWait(startAtBee: boolean): { wait: Wait; continued: boolean } {
  const now = Date.now();
  if (wait && (active > 0 || now - lastEnd < CONTINUE_MS)) return { wait, continued: true };
  wait = { start: startAtBee ? now - SPINNER_MS : now, first: !booted && !startAtBee };
  return { wait, continued: false };
}

function phaseAt(elapsed: number, first: boolean): LoaderPhase {
  if (elapsed >= SLOW_MS) return 'slow';
  if (!first || elapsed >= SPROUT_MS) return 'bee';
  return 'sprout';
}

/**
 * The loading screen (docs/plans/Loading screen implementation plan.md).
 *
 * - App start (the first loader since the page loaded): nothing for 400 ms
 *   (CSS delay, so it also holds before hydration), then LD1 "Seed to
 *   sprout"; at 4 s LD3 "Bee's flight" with a "While you wait" word; at
 *   10 s "Still loading… check your connection" and Try again.
 * - Later loads: LD3 (fades in after 400 ms, so a fast load never flashes it),
 *   the slow message at 10 s. No spinner.
 * - A loader that follows another within 0.5 s continues its wait (same
 *   phase, same clock), so a screen handing over from the route fallback
 *   to its own loader does not start over.
 * - No minimum display time: it unmounts the moment data arrives.
 *
 * `data-phase` carries the phase for tests. `phase` pins it (reference
 * pages): no timers, and `pathname` pins the path (the tab bar). `startAtBee` is for a
 * caller that has already made the learner wait 2.5 s. Reduced motion shows
 * the still frames (globals.css); the phase changes still happen.
 */
export function GardenLoader({
  onRetry,
  phase: pinned,
  pathname: pinnedPath,
  startAtBee = false,
}: {
  onRetry?: () => void;
  phase?: LoaderPhase;
  /** The path being loaded (default: the current one); pins it for the reference pages and tests. */
  pathname?: string;
  startAtBee?: boolean;
}) {
  const live = useTranslations('screens.live');
  const t = useTranslations('screens.loader');
  const [{ wait: joined, continued }] = React.useState(() => joinWait(startAtBee));
  const [phase, setPhase] = React.useState<LoaderPhase>(
    () => pinned ?? phaseAt(Date.now() - joined.start, joined.first),
  );
  const later = !joined.first;
  const currentPath = usePathname();
  const tab = tabFor(pinnedPath ?? currentPath);

  React.useEffect(() => {
    if (pinned) return;
    active += 1;
    const elapsed = Date.now() - joined.start;
    const timers = [...(joined.first ? [[SPROUT_MS, 'bee']] : []), [SLOW_MS, 'slow']].flatMap(
      ([at, next]) =>
        elapsed < (at as number)
          ? [window.setTimeout(() => setPhase(next as LoaderPhase), (at as number) - elapsed)]
          : [],
    );
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      active -= 1;
      lastEnd = Date.now();
      booted = true;
    };
  }, [pinned, joined]);

  const current = pinned ?? phase;
  const slow = current === 'slow';
  const art = current === 'bee' || slow;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-phase={current}
      className={gcn(
        'relative mx-auto flex min-h-screen-dvh w-full max-w-[560px] flex-col items-center overflow-hidden bg-bg text-text',
        !art && 'justify-center',
      )}
    >
      <span className="sr-only">{slow ? t('slow') : live('loading')}</span>
      {current === 'sprout' ? (
        <div
          className={gcn(
            'flex w-full flex-col items-center',
            !later && !continued && 'dg-ld-appear',
          )}
        >
          <SproutArt />
        </div>
      ) : null}
      {art ? (
        <>
          <div
            className={gcn(
              'flex w-full flex-1 flex-col items-center justify-center pb-5',
              later && !startAtBee && !continued ? 'dg-ld-appear' : 'dg-ld-in',
            )}
          >
            <div className="-mt-10 flex w-full justify-center">
              <BeeOrbitArt />
            </div>
            {slow ? (
              <div className="-mt-[70px] flex flex-col items-center px-6 text-center text-[15px] text-muted-foreground">
                <span>{t('slow')}</span>
                <button
                  type="button"
                  onClick={() => (onRetry ? onRetry() : window.location.reload())}
                  className="mt-1 inline-flex h-11 items-center px-4 text-[15px] font-semibold text-forest"
                >
                  {live('retry')}
                </button>
              </div>
            ) : (
              <div
                aria-hidden="true"
                className="dg-ld-lines relative -mt-[70px] h-[22px] w-full text-[15px] text-muted-foreground"
              >
                <span>{t('bee.1')}</span>
                <span>{t('bee.2')}</span>
                <span>{t('bee.3')}</span>
              </div>
            )}
          </div>
          {tab ? (
            // The column centres its children; the tab bar must span it.
            <div className="w-full">
              <GardenTabBar active={tab} />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
