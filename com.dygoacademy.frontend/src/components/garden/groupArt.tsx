import type { SVGProps } from 'react';

/**
 * Drawings used only by the group screens (UI-G, canvas GR1–GR7), copied
 * path for path from docs/design/garden/reference/GR*.html. Everything is
 * decorative (aria-hidden) unless a caller passes an aria-label; colours
 * come from the garden tokens.
 */
type SvgProps = SVGProps<SVGSVGElement>;

const LEAF = 'var(--stage-sprout-leaf)';
const LEAF_LIGHT = 'var(--stage-sprout)';
const PETAL = 'var(--stage-flower)';
const POLLEN = 'var(--color-gold-light)';
const CANOPY = 'var(--stage-tree-canopy)';
const FRUIT = 'var(--stage-tree-fruit)';
const TRUNK = 'var(--stage-trunk)';
const DROP = 'var(--stage-due)';

/** The plant on a garden or bed tile. */
export type GroupTilePlant = 'tree' | 'flower' | 'sprout';

function Svg({ children, ...props }: SvgProps) {
  return (
    <svg aria-hidden="true" focusable="false" {...props}>
      {children}
    </svg>
  );
}

/** Tree (viewBox 44 × 56): GR1 tile 46 × 50, GR2 bed tile 36 × 40, GR6 46 × 50. */
export function TileTree(props: SvgProps) {
  return (
    <Svg viewBox="0 0 44 56" {...props}>
      <rect x="20" y="30" width="4" height="26" fill={TRUNK} />
      <circle cx="22" cy="20" r="15" fill={CANOPY} />
      <circle cx="11" cy="29" r="9" fill={CANOPY} />
      <circle cx="33" cy="29" r="9" fill={CANOPY} />
      <circle cx="16" cy="18" r="3" fill={FRUIT} />
      <circle cx="28" cy="22" r="3" fill={FRUIT} />
    </Svg>
  );
}

/** Flower with a leaf (viewBox 40 × 52): GR1 40 × 50, GR2 bed 32 × 40, GR6 40 × 50. */
export function TileFlower(props: SvgProps) {
  return (
    <Svg viewBox="0 0 40 52" {...props}>
      <path d="M20 52 V20" stroke={LEAF} strokeWidth="2.5" />
      <path d="M20 38 C14 37 11 33 13 29 C18 29 20 33 20 38 Z" fill={LEAF} />
      <circle cx="20" cy="10" r="5" fill={PETAL} />
      <circle cx="26" cy="15" r="5" fill={PETAL} />
      <circle cx="24" cy="22" r="5" fill={PETAL} />
      <circle cx="16" cy="22" r="5" fill={PETAL} />
      <circle cx="14" cy="15" r="5" fill={PETAL} />
      <circle cx="20" cy="17" r="4" fill={POLLEN} />
    </Svg>
  );
}

/** Sprout (viewBox 40 × 40): GR1 40 × 40, GR2 bed 32 × 32, GR6 40 × 40. */
export function TileSprout(props: SvgProps) {
  return (
    <Svg viewBox="0 0 40 40" {...props}>
      <path d="M20 40 V22" stroke={LEAF} strokeWidth="2.5" />
      <path d="M20 30 C14 29 11 25 13 21 C18 21 20 25 20 30 Z" fill={LEAF} />
      <path d="M20 27 C26 26 29 22 27 18 C22 18 20 22 20 27 Z" fill={LEAF_LIGHT} />
    </Svg>
  );
}

/** Canvas sizes of the tile plants: `garden` = GR1 / GR6 (56px tile), `bed` = GR2 (44px tile). */
const TILE_SIZES: Record<'garden' | 'bed', Record<GroupTilePlant, [number, number]>> = {
  garden: { tree: [46, 50], flower: [40, 50], sprout: [40, 40] },
  bed: { tree: [36, 40], flower: [32, 40], sprout: [32, 32] },
};

export function TilePlant({
  plant,
  size = 'garden',
}: {
  plant: GroupTilePlant;
  size?: 'garden' | 'bed';
}) {
  const [width, height] = TILE_SIZES[size][plant];
  if (plant === 'tree') return <TileTree width={width} height={height} />;
  if (plant === 'flower') return <TileFlower width={width} height={height} />;
  return <TileSprout width={width} height={height} />;
}

/** Rain cloud with three falling drops (viewBox 80 × 52): GR1 46 × 40, GR3 40 × 30. */
export function RainCloud(props: SvgProps) {
  return (
    <Svg viewBox="0 0 80 52" {...props}>
      <path
        d="M14 32 C4 32 4 18 14 18 C14 8 30 4 36 14 C42 6 60 8 60 20 C72 18 74 32 64 32 Z"
        fill="var(--comeback-cloud)"
      />
      <path className="rain" d="M24 38 V44" stroke={DROP} strokeWidth="3" strokeLinecap="round" />
      <path
        className="rain"
        d="M38 40 V46"
        stroke={DROP}
        strokeWidth="3"
        strokeLinecap="round"
        style={{ animationDelay: '.4s' }}
      />
      <path
        className="rain"
        d="M52 38 V44"
        stroke={DROP}
        strokeWidth="3"
        strokeLinecap="round"
        style={{ animationDelay: '.8s' }}
      />
    </Svg>
  );
}

/** Water drop (GR2 rain-day banner, 30 × 30). */
export function RainDrop(props: SvgProps) {
  return (
    <Svg viewBox="0 0 24 24" {...props}>
      <path d="M12 3 C12 3 5 11 5 15 A7 7 0 0 0 19 15 C19 11 12 3 12 3 Z" fill="var(--color-water)" />
    </Svg>
  );
}

/** Wilting sprout (GR3 tricky patch, 26 × 26). */
export function WiltSprout(props: SvgProps) {
  const wilt = 'var(--stage-wilt)';
  return (
    <Svg viewBox="0 0 40 40" {...props}>
      <path d="M20 40 C20 30 22 26 28 24" stroke={wilt} strokeWidth="2.5" fill="none" />
      <path d="M21 33 C15 35 10 33 8 28 C14 26 19 28 21 33 Z" fill={wilt} />
      <path d="M26 25 C32 28 35 32 35 37 C29 36 27 31 26 25 Z" fill={wilt} />
    </Svg>
  );
}

function Stroke({ children, strokeWidth = '2', ...props }: SvgProps) {
  return (
    <Svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </Svg>
  );
}

/** Chain link ("Join with a link", invite links). */
export function LinkIcon(props: SvgProps) {
  return (
    <Stroke strokeWidth="2.2" {...props}>
      <path d="M10 14 L14 10" />
      <path d="M8 12 L6 14 A3 3 0 0 0 10 18 L12 16" />
      <path d="M16 12 L18 10 A3 3 0 0 0 14 6 L12 8" />
    </Stroke>
  );
}

/** Sun-like gear ("Manage garden" on GR2). */
export function ManageIcon(props: SvgProps) {
  return (
    <Stroke {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2 V5 M12 19 V22 M2 12 H5 M19 12 H22 M4.9 4.9 L7 7 M17 17 L19.1 19.1 M4.9 19.1 L7 17 M17 7 L19.1 4.9" />
    </Stroke>
  );
}

/** Chevron down (role picker on GR4, 14px). */
export function ChevronDownIcon(props: SvgProps) {
  return (
    <Stroke strokeWidth="2.4" {...props}>
      <path d="M6 9 L12 15 L18 9" />
    </Stroke>
  );
}

/** Check (GR6 "what you get" list, 18px, success green). */
export function JoinCheckIcon(props: SvgProps) {
  return (
    <Svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-success)"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M5 12 L10 17 L19 7" />
    </Svg>
  );
}

/** Groups tab: two people. */
export function GroupsTabIcon(props: SvgProps) {
  return (
    <Stroke {...props}>
      <circle cx="9" cy="8" r="3.5" />
      <circle cx="17" cy="10" r="2.5" />
      <path d="M3 20 C3 15 6 13 9 13 C12 13 15 15 15 20" />
      <path d="M15 15 C16 14 21 14 21 19" />
    </Stroke>
  );
}

/**
 * GR2 shared-plot hero: five plots on dark soil (358 × 96). One plot per
 * stage the group has most of, in the canvas order; decorative in the
 * live garden (the numbers above it carry the meaning).
 */
export function SharedPlot({ label }: { label: string }) {
  return (
    <svg
      width="358"
      height="96"
      viewBox="0 0 358 96"
      role="img"
      aria-label={label}
      className="-mx-4 mt-0.5 shrink-0"
    >
      <rect x="0" y="84" width="358" height="12" fill="var(--color-forest-deep)" />
      <g transform="translate(14,-34)">
        <rect x="18" y="100" width="4" height="20" fill={TRUNK} />
        <circle cx="20" cy="92" r="14" fill={CANOPY} />
        <circle cx="10" cy="100" r="9" fill={CANOPY} />
        <circle cx="30" cy="100" r="9" fill={CANOPY} />
        <circle cx="15" cy="90" r="2.5" fill={FRUIT} />
        <circle cx="26" cy="96" r="2.5" fill={FRUIT} />
      </g>
      <g transform="translate(84,-34)">
        <path d="M20 118 V92" stroke={LEAF} strokeWidth="2.5" />
        <circle cx="20" cy="82" r="5" fill={PETAL} />
        <circle cx="26" cy="87" r="5" fill={PETAL} />
        <circle cx="24" cy="94" r="5" fill={PETAL} />
        <circle cx="16" cy="94" r="5" fill={PETAL} />
        <circle cx="14" cy="87" r="5" fill={PETAL} />
        <circle cx="20" cy="89" r="4" fill={POLLEN} />
      </g>
      <g transform="translate(154,-34)">
        <rect x="18" y="100" width="4" height="20" fill={TRUNK} />
        <circle cx="20" cy="90" r="16" fill={CANOPY} />
        <circle cx="9" cy="99" r="10" fill={CANOPY} />
        <circle cx="31" cy="99" r="10" fill={CANOPY} />
        <circle cx="14" cy="88" r="2.5" fill={FRUIT} />
        <circle cx="26" cy="92" r="2.5" fill={FRUIT} />
        <circle cx="20" cy="100" r="2.5" fill={FRUIT} />
      </g>
      <g transform="translate(224,-34)">
        <path d="M20 118 V100" stroke={LEAF} strokeWidth="2.5" />
        <path d="M20 108 C13 107 9 102 11 97 C17 97 20 102 20 108 Z" fill={LEAF} />
        <path d="M20 104 C27 103 31 98 29 93 C23 93 20 98 20 104 Z" fill={LEAF_LIGHT} />
        <path d="M20 70 C20 70 15 77 15 80 A5 5 0 0 0 25 80 C25 77 20 70 20 70 Z" fill={DROP} />
      </g>
      <g transform="translate(294,-34)">
        <path d="M20 118 V92" stroke={LEAF} strokeWidth="2.5" />
        <path d="M20 108 C27 107 31 102 29 97 C23 97 20 102 20 108 Z" fill={LEAF} />
        <circle cx="20" cy="82" r="5" fill={PETAL} />
        <circle cx="26" cy="87" r="5" fill={PETAL} />
        <circle cx="24" cy="94" r="5" fill={PETAL} />
        <circle cx="16" cy="94" r="5" fill={PETAL} />
        <circle cx="14" cy="87" r="5" fill={PETAL} />
        <circle cx="20" cy="89" r="4" fill={POLLEN} />
      </g>
    </svg>
  );
}
