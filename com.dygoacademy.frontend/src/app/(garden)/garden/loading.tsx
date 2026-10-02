'use client';

import { useTranslations } from 'next-intl';

/**
 * Route-level loading state for every /garden screen (UI-3 U3-1).
 *
 * A skeleton in the same screen column as the real screens (SCREEN_CLASSES
 * in screens/GardenTabBar.tsx: centred, max 560 wide, full height, garden
 * background), so the page keeps its width and background while the next
 * screen loads and nothing jumps when it arrives. Blocks follow the usual
 * layout: small label + display title, then a hero card and list rows.
 * The shimmer stops for reduced motion.
 */
const BLOCK = 'animate-pulse rounded-[18px] bg-surface-sunken motion-reduce:animate-none';

export default function GardenLoading() {
  const t = useTranslations('screens.live');
  return (
    <div
      role="status"
      aria-busy="true"
      className="mx-auto flex min-h-screen-dvh w-full max-w-[560px] flex-col gap-[14px] bg-bg pt-[22px] text-text"
    >
      <span className="sr-only">{t('loading')}</span>
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
    </div>
  );
}
