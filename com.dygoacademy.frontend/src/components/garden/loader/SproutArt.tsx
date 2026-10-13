import { useTranslations } from 'next-intl';

import { BeeShape } from '../Bee';

/**
 * LD1 "Seed to sprout" (canvas `LoadingSprout`, `reference/LD1-loading-sprout.png`):
 * the logo grows (seed → stem → leaves → the bee lands on the right leaf),
 * "dygo", and a line that rotates every 2.5 s. The base styles are the
 * still frame (globals.css, `dg-ld-`). Decorative: the owner announces
 * "Loading your garden…" once.
 */
export function SproutArt() {
  const t = useTranslations('screens.loader.sprout');
  return (
    <div aria-hidden="true" className="flex w-full flex-col items-center">
      <svg
        width="240"
        height="240"
        viewBox="0 0 100 100"
        focusable="false"
        className="overflow-visible"
      >
        <g className="dg-ld-fadeAll">
          <ellipse className="dg-ld-soil" cx="50" cy="80" rx="22" ry="4.5" fill="#E3DDD0" />
          <ellipse
            className="dg-ld-seedc dg-ld-seed"
            cx="50"
            cy="77"
            rx="3.2"
            ry="2.4"
            fill="#8A6A4A"
          />
          <g className="dg-ld-sway">
            <path
              className="dg-ld-stem"
              d="M50 79 V44"
              stroke="#24463A"
              strokeWidth="5.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              className="dg-ld-leafL"
              d="M50 64 C36 64 26 54 29 41 C42 40 50 50 50 64 Z"
              fill="#24463A"
            />
            <path
              className="dg-ld-leafR"
              d="M50 52 C64 51 74 41 71 27 C58 27 50 37 50 52 Z"
              fill="#3D6B57"
            />
          </g>
          <g className="dg-ld-beeA">
            <g className="dg-ld-beebob">
              <g transform="translate(-12.8 -14) scale(.8)">
                <BeeShape flap />
              </g>
            </g>
          </g>
        </g>
      </svg>
      <div className="mt-[6px] font-display text-[38px] font-semibold leading-normal tracking-[-0.01em] text-forest">
        {'dygo'}
      </div>
      <div className="dg-ld-lines relative mt-[14px] h-[22px] w-full text-[15px] text-muted-foreground">
        <span>{t('1')}</span>
        <span>{t('2')}</span>
        <span>{t('3')}</span>
      </div>
    </div>
  );
}
