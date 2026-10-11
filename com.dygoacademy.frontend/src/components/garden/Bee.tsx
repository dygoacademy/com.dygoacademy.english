import * as React from 'react';

import { gcn } from './cn';

/**
 * A7 "Bees are waiting" art (canvas `source/AdultTopicDetail.dc.html`,
 * 2026-10-11): the bee and the ripe flower it waits on. Decorative.
 *
 * `BeeGlyph` hovers (`.bee-hover`, 1.6s loop) unless `still`; the
 * pollinated flower and its tick pop in once (`.spark`, 0.5s). Both stop
 * under prefers-reduced-motion (globals.css).
 */
export function BeeGlyph({
  size,
  still = false,
  className,
}: {
  size: number;
  still?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className={gcn(!still && 'bee-hover', className)}
    >
      <BeeShape />
    </svg>
  );
}

/**
 * The bee drawing itself, in a 32 × 32 box, for use inside another SVG
 * (the Pronunciation pond draws the same bee as A7).
 */
export function BeeShape() {
  return (
    <>
      <ellipse
        cx="12"
        cy="9"
        rx="6"
        ry="4.5"
        fill="var(--bee-wing)"
        stroke="var(--bee-wing-line)"
        strokeWidth="1"
        transform="rotate(-25 12 9)"
      />
      <ellipse
        cx="20"
        cy="9"
        rx="6"
        ry="4.5"
        fill="var(--bee-wing)"
        stroke="var(--bee-wing-line)"
        strokeWidth="1"
        transform="rotate(25 20 9)"
      />
      <ellipse cx="16" cy="19" rx="9" ry="7" fill="var(--bee-body)" />
      <path d="M12 13.2 V24.8" stroke="var(--bee-stripe)" strokeWidth="2.4" />
      <path d="M17 12.2 V25.8" stroke="var(--bee-stripe)" strokeWidth="2.4" />
      <circle cx="23.5" cy="17.5" r="1.3" fill="var(--bee-stripe)" />
      <path d="M7 19 L5 19" stroke="var(--bee-stripe)" strokeWidth="1.6" strokeLinecap="round" />
    </>
  );
}

/** The ripe flower on a bee row: pale pollen centre, or gold once pollinated. */
export function BeeFlower({ pollinated }: { pollinated: boolean }) {
  return (
    <svg width={30} height={36} viewBox="0 0 40 52" aria-hidden="true" focusable="false">
      <path d="M20 52 V20" stroke="var(--stage-sprout-leaf)" strokeWidth="2.5" />
      <path d="M20 38 C14 37 11 33 13 29 C18 29 20 33 20 38 Z" fill="var(--stage-sprout-leaf)" />
      <circle cx="20" cy="10" r="5" fill="var(--stage-flower)" />
      <circle cx="26" cy="15" r="5" fill="var(--stage-flower)" />
      <circle cx="24" cy="22" r="5" fill="var(--stage-flower)" />
      <circle cx="16" cy="22" r="5" fill="var(--stage-flower)" />
      <circle cx="14" cy="15" r="5" fill="var(--stage-flower)" />
      {pollinated ? (
        <circle cx="20" cy="17" r="5.5" fill="var(--stage-tree-fruit)" />
      ) : (
        <circle cx="20" cy="17" r="4" fill="var(--color-gold-light)" />
      )}
    </svg>
  );
}
