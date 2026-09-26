import * as React from 'react';

import { gcn } from './cn';
import type { PlantStage } from './plantStage';

/**
 * Plant glyph: one plant per stage (seed, sprout, flower, tree, wilting)
 * plus the thirsty drop, drawn exactly as the canvas draws them
 * (docs/design/garden/reference). Colours come from the stage tokens.
 *
 * The canvas draws each plant a little differently depending on where it
 * sits, so `variant` picks the drawing:
 * - `row` (default): the 40px well in a word row (A7), no soil.
 * - `tile`: the stage filter tiles (A7), on a light soil ellipse.
 * - `topic`: the forest tile of a topic row (A6), stems in leaf green.
 *
 * Without `size`, the glyph has the canvas size for that variant and
 * stage (e.g. a row flower is 30 × 36). With `size`, it is `size` wide and
 * keeps the drawing's proportions.
 *
 * Decorative by default (`aria-hidden`); pass `aria-label` when the glyph
 * is the only place the stage is shown and it becomes `role="img"`.
 * `animate="drip"` adds the canvas's water drop above the plant (the
 * ambient "needs water" loop); `animate="bloom"` scales it in once. Both
 * respect prefers-reduced-motion (globals.css).
 */
export const PLANT_GLYPH_SIZES = [24, 32, 40, 56, 72] as const;
export type PlantGlyphSize = (typeof PLANT_GLYPH_SIZES)[number];
export type PlantGlyphVariant = 'row' | 'tile' | 'topic';

export interface PlantGlyphProps {
  stage: PlantStage;
  variant?: PlantGlyphVariant;
  /** Width in px; the height follows the drawing. Omit for the canvas size. */
  size?: number;
  animate?: 'drip' | 'bloom';
  'aria-label'?: string;
  className?: string;
}

interface Art {
  /** Canvas width and height of the <svg>. */
  w: number;
  h: number;
  /** viewBox width and height (x and y start at 0). */
  vw: number;
  vh: number;
  body: React.ReactNode;
  /** Where the drip sits, in viewBox units (top of the drop). */
  dripY: number;
}

const C = {
  seed: 'var(--stage-seed)',
  stem: 'var(--stage-tree-canopy)',
  leaf: 'var(--stage-sprout-leaf)',
  leafLight: 'var(--stage-sprout)',
  petal: 'var(--stage-flower)',
  pollen: 'var(--color-gold-light)',
  canopy: 'var(--stage-tree-canopy)',
  fruit: 'var(--stage-tree-fruit)',
  trunk: 'var(--stage-trunk)',
  wilt: 'var(--stage-wilt)',
  due: 'var(--stage-due)',
  soil: 'var(--stage-soil-light)',
} as const;

function Petals({ y = 0 }: { y?: number }) {
  return (
    <>
      <circle cx="20" cy={10 + y} r="5" fill={C.petal} />
      <circle cx="26" cy={15 + y} r="5" fill={C.petal} />
      <circle cx="24" cy={22 + y} r="5" fill={C.petal} />
      <circle cx="16" cy={22 + y} r="5" fill={C.petal} />
      <circle cx="14" cy={15 + y} r="5" fill={C.petal} />
      <circle cx="20" cy={17 + y} r="4" fill={C.pollen} />
    </>
  );
}

function Canopy() {
  return (
    <>
      <circle cx="22" cy="20" r="15" fill={C.canopy} />
      <circle cx="11" cy="29" r="9" fill={C.canopy} />
      <circle cx="33" cy="29" r="9" fill={C.canopy} />
      <circle cx="16" cy="18" r="3" fill={C.fruit} />
      <circle cx="28" cy="22" r="3" fill={C.fruit} />
    </>
  );
}

const SPROUT_LEAVES = (
  <>
    <path d="M20 30 C14 29 11 25 13 21 C18 21 20 25 20 30 Z" fill={C.leaf} />
    <path d="M20 27 C26 26 29 22 27 18 C22 18 20 22 20 27 Z" fill={C.leafLight} />
  </>
);

const WILT_BODY = (
  <>
    <path d="M20 40 C20 30 22 26 28 24" stroke={C.wilt} strokeWidth="2.5" fill="none" />
    <path d="M21 33 C15 35 10 33 8 28 C14 26 19 28 21 33 Z" fill={C.wilt} />
    <path d="M26 25 C32 28 35 32 35 37 C29 36 27 31 26 25 Z" fill={C.wilt} />
  </>
);

const THIRSTY_BODY = (
  <path d="M20 6 C20 6 10 19 10 26 A10 10 0 0 0 30 26 C30 19 20 6 20 6 Z" fill={C.due} />
);

// A7 word rows.
const ROW: Record<PlantStage, Art> = {
  seed: {
    w: 30,
    h: 30,
    vw: 40,
    vh: 40,
    dripY: 12,
    body: (
      <>
        <ellipse cx="20" cy="33" rx="6" ry="4" fill={C.seed} />
        <path
          d="M20 30 C20 26 22 24 25 23"
          stroke={C.stem}
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
      </>
    ),
  },
  sprout: {
    w: 30,
    h: 30,
    vw: 40,
    vh: 40,
    dripY: 4,
    body: (
      <>
        <path d="M20 40 V22" stroke={C.stem} strokeWidth="2.5" />
        {SPROUT_LEAVES}
      </>
    ),
  },
  flower: {
    w: 30,
    h: 36,
    vw: 40,
    vh: 52,
    dripY: -8,
    body: (
      <>
        <path d="M20 52 V20" stroke={C.stem} strokeWidth="2.5" />
        <Petals />
      </>
    ),
  },
  tree: {
    w: 34,
    h: 38,
    vw: 44,
    vh: 56,
    dripY: -10,
    body: (
      <>
        <rect x="20" y="30" width="4" height="26" fill={C.trunk} />
        <Canopy />
      </>
    ),
  },
  wilting: { w: 30, h: 30, vw: 40, vh: 40, dripY: 8, body: WILT_BODY },
  thirsty: { w: 30, h: 30, vw: 40, vh: 40, dripY: 0, body: THIRSTY_BODY },
};

// A7 stage filter tiles: the same plants standing on a soil ellipse.
const TILE: Record<PlantStage, Art> = {
  seed: {
    w: 34,
    h: 34,
    vw: 40,
    vh: 40,
    dripY: 12,
    body: (
      <>
        <ellipse cx="20" cy="34" rx="12" ry="3" fill={C.soil} />
        <ellipse cx="20" cy="30" rx="5" ry="3.5" fill={C.seed} />
        <path
          d="M20 27 C20 24 22 22 24 21"
          stroke={C.stem}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </>
    ),
  },
  sprout: {
    w: 34,
    h: 34,
    vw: 40,
    vh: 40,
    dripY: 4,
    body: (
      <>
        <ellipse cx="20" cy="36" rx="12" ry="3" fill={C.soil} />
        <path d="M20 35 V20" stroke={C.stem} strokeWidth="2.5" />
        <path d="M20 28 C14 27 11 23 13 19 C18 19 20 23 20 28 Z" fill={C.leaf} />
        <path d="M20 25 C26 24 29 20 27 16 C22 16 20 20 20 25 Z" fill={C.leafLight} />
      </>
    ),
  },
  flower: {
    w: 34,
    h: 40,
    vw: 40,
    vh: 52,
    dripY: -8,
    body: (
      <>
        <ellipse cx="20" cy="48" rx="12" ry="3" fill={C.soil} />
        <path d="M20 47 V20" stroke={C.stem} strokeWidth="2.5" />
        <Petals />
      </>
    ),
  },
  tree: {
    w: 36,
    h: 44,
    vw: 44,
    vh: 56,
    dripY: -10,
    body: (
      <>
        <ellipse cx="22" cy="52" rx="13" ry="3" fill={C.soil} />
        <rect x="20" y="30" width="4" height="22" fill={C.trunk} />
        <Canopy />
      </>
    ),
  },
  wilting: {
    w: 34,
    h: 34,
    vw: 40,
    vh: 40,
    dripY: 8,
    body: (
      <>
        <ellipse cx="20" cy="37" rx="12" ry="3" fill={C.soil} />
        {WILT_BODY}
      </>
    ),
  },
  thirsty: { w: 34, h: 34, vw: 40, vh: 40, dripY: 0, body: THIRSTY_BODY },
};

// A6 topic rows: the plant on the forest tile, leaf-green stems, no soil.
const TOPIC: Record<PlantStage, Art> = {
  ...ROW,
  sprout: {
    w: 40,
    h: 40,
    vw: 40,
    vh: 40,
    dripY: 4,
    body: (
      <>
        <path d="M20 40 V22" stroke={C.leaf} strokeWidth="2.5" />
        {SPROUT_LEAVES}
      </>
    ),
  },
  flower: {
    w: 36,
    h: 46,
    vw: 40,
    vh: 52,
    dripY: -8,
    body: (
      <>
        <path d="M20 52 V20" stroke={C.leaf} strokeWidth="2.5" />
        <Petals />
      </>
    ),
  },
  tree: { ...ROW.tree, w: 46, h: 50 },
  seed: { ...ROW.seed, w: 40, h: 40 },
  wilting: { ...ROW.wilting, w: 40, h: 40 },
  thirsty: { ...ROW.thirsty, w: 40, h: 40 },
};

const ART: Record<PlantGlyphVariant, Record<PlantStage, Art>> = {
  row: ROW,
  tile: TILE,
  topic: TOPIC,
};

/** The canvas's falling drop, 10 units wide, top at (cx, y). */
export function DripDrop({
  cx = 20,
  y,
  className,
}: {
  cx?: number;
  y: number;
  className?: string;
}) {
  return (
    <path
      className={className}
      d={`M${cx} ${y} C${cx} ${y} ${cx - 5} ${y + 7} ${cx - 5} ${y + 10} A5 5 0 0 0 ${cx + 5} ${y + 10} C${cx + 5} ${y + 7} ${cx} ${y} ${cx} ${y} Z`}
      fill={C.due}
    />
  );
}

export function PlantGlyph({
  stage,
  variant = 'row',
  size,
  animate,
  'aria-label': ariaLabel,
  className,
}: PlantGlyphProps) {
  const art = ART[variant][stage];
  const labelled = typeof ariaLabel === 'string' && ariaLabel.length > 0;
  const width = size ?? art.w;
  const height = size ? Math.round((size * art.h) / art.w) : art.h;
  const drip = animate === 'drip';

  return (
    <svg
      viewBox={`0 0 ${art.vw} ${art.vh}`}
      width={width}
      height={height}
      focusable="false"
      data-stage={stage}
      data-variant={variant}
      {...(labelled ? { role: 'img', 'aria-label': ariaLabel } : { 'aria-hidden': true as const })}
      // No shrink-0: like the canvas, a glyph may shrink a little in a
      // tight flex column (the Fruiting stage tile).
      className={gcn(drip && 'overflow-visible', animate === 'bloom' && 'garden-bloom', className)}
    >
      {art.body}
      {drip ? <DripDrop cx={art.vw / 2} y={art.dripY} className="garden-drip" /> : null}
    </svg>
  );
}
