'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { GardenLoader, SPINNER_MS, isAppStart } from '@/components/garden/loader/GardenLoader';
import { GardenTabBar, type GardenTab } from '@/components/garden/screens/GardenTabBar';
import { Spinner } from '@/components/garden/Spinner';
import { usePathname } from 'next/navigation';

/**
 * Route-level loading state for every /garden screen (UI-3 U3-1).
 *
 * A skeleton in the same screen column as the real screens (SCREEN_CLASSES
 * in screens/GardenTabBar.tsx: centred, max 560 wide, full height, garden
 * background), so the page keeps its width and background while the next
 * screen loads and nothing jumps when it arrives. Blocks follow the usual
 * layout: small label + display title, then a hero card and list rows.
 * The shimmer stops for reduced motion. A spinner on top shows even then. The tab bar
 * stays on screen so the page is never empty and the learner can still switch tab.
 *
 * When the page itself is loading (open, refresh, sign-in, back button: no link
 * click, so `NavProgress` is not involved) this file is what shows, so it follows
 * the loading screen plan too: at app start the loader (LD1, then LD3 at 4 s);
 * afterwards this skeleton, then LD3 at 2.5 s. Either way the slow message and
 * Try again come at 10 s.
 */
// bg-border, not bg-surface-sunken: that one (#f7f4ec) is almost the same colour as the
// screen background (#f4f1ea), so on a slow network the skeleton looked like a blank page.
const BLOCK = 'animate-pulse rounded-[18px] bg-border motion-reduce:animate-none';

/** The tab the new path belongs to, so the bar highlights where the learner is going. */
function tabFor(pathname: string): GardenTab {
  const first = (pathname ?? '').split('/')[1];
  return first === 'missions' || first === 'topics' || first === 'groups' || first === 'me'
    ? first
    : 'garden';
}

function RouteSkeleton() {
  const t = useTranslations('screens.live');
  const pathname = usePathname();
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="off"
      className="mx-auto flex min-h-screen-dvh w-full max-w-[560px] flex-col gap-[14px] bg-bg pt-[22px] text-text"
    >
      <span className="sr-only">{t('loading')}</span>
      <div aria-hidden="true" className="flex items-center gap-3 px-5 text-forest">
        <Spinner />
      </div>
      <div aria-hidden="true" className="flex flex-col gap-2 px-5">
        <div className={`${BLOCK} h-[14px] w-[40%] rounded-full`} />
        <div className={`${BLOCK} h-[30px] w-[65%] rounded-full`} />
      </div>
      <div aria-hidden="true" className="flex flex-col gap-2 px-4">
        <div className={`${BLOCK} h-[180px] rounded-hero`} />
        <div className={`${BLOCK} h-[64px]`} />
        <div className={`${BLOCK} h-[64px]`} />
        <div className={`${BLOCK} h-[64px]`} />
      </div>
      <GardenTabBar active={tabFor(pathname)} />
    </div>
  );
}

export default function GardenLoading() {
  // Same on the server and on the first client render: nothing has been shown yet.
  const [appStart] = React.useState(() => isAppStart());
  const [late, setLate] = React.useState(false);
  React.useEffect(() => {
    if (appStart) return;
    const id = window.setTimeout(() => setLate(true), SPINNER_MS);
    return () => window.clearTimeout(id);
  }, [appStart]);
  if (appStart) return <GardenLoader />;
  return late ? <GardenLoader startAtBee /> : <RouteSkeleton />;
}
