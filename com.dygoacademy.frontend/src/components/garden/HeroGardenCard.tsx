import * as React from 'react';
import { useTranslations } from 'next-intl';

import { gcn } from './cn';
import { DripDrop } from './PlantGlyph';
import type { PlantStage } from './plantStage';

/**
 * Hero garden card (canvas A1 / A5): forest card, radius 26, 16px padding
 * with no bottom padding, the overline + title (Fraunces 22) with an
 * optional trailing icon (the evening moon), a legend row (8px dots), and
 * the garden illustration bleeding to both edges.
 *
 * - `normal` (A1): forest background, the plants on dark soil, a drop
 *   above each thirsty plant.
 * - `comeback` (A5): the muted background, no heading, the same garden
 *   faded, and a rain cloud.
 *
 * The illustration is drawn exactly as in the canvas: up to 9 (normal) or
 * 8 (comeback) planting spots, left to right, each holding the plant for
 * the matching entry of `plants`. Trees and flowers alternate between the
 * canvas's two drawings by spot, as the canvas does. It's decorative
 * (aria-label on the SVG describes it); the legend carries the numbers.
 */
export interface HeroLegendItem {
  stage: PlantStage;
  /** The full legend text, e.g. "18 thirsty" (already formatted). */
  label: string;
}

export type HeroPlant = PlantStage | { stage: PlantStage; thirsty?: boolean };

export interface HeroGardenCardProps {
  variant?: 'normal' | 'comeback';
  overline?: string;
  title?: string;
  /** Decorative icon at the top right, e.g. <MoonIcon width={30} height={30} />. */
  trailing?: React.ReactNode;
  /** The plants drawn in the illustration, left to right. */
  plants: readonly HeroPlant[];
  legend: readonly HeroLegendItem[];
  /** Heading level for the title. Defaults to h2. */
  headingLevel?: 'h1' | 'h2' | 'h3';
  className?: string;
}

const DOT: Record<PlantStage, string> = {
  thirsty: 'bg-stage-due',
  tree: 'bg-stage-tree-fruit',
  wilting: 'bg-stage-wilt',
  flower: 'bg-stage-flower',
  sprout: 'bg-stage-sprout',
  seed: 'bg-stage-seed',
};

const NORMAL_SLOTS = [6, 46, 86, 124, 166, 204, 242, 280, 316] as const;
const COMEBACK_SLOTS = [10, 56, 98, 142, 186, 228, 272, 312] as const;

const LEAF = 'var(--stage-sprout-leaf)';
const LEAF_LIGHT = 'var(--stage-sprout)';
const WILT = 'var(--stage-wilt)';

const LEAF_LEFT = 'M20 118 C13 117 9 112 11 107 C17 107 20 112 20 118 Z';
const LEAF_RIGHT = 'M20 118 C27 117 31 112 29 107 C23 107 20 112 20 118 Z';

function Petals5() {
  return (
    <>
      {[
        [20, 82],
        [26, 87],
        [24, 94],
        [16, 94],
        [14, 87],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="5" fill="var(--stage-flower)" />
      ))}
      <circle cx="20" cy="89" r="4" fill="var(--color-gold-light)" />
    </>
  );
}

function Wilting() {
  return (
    <>
      <path d="M20 130 C20 118 22 112 28 110" stroke={WILT} strokeWidth="2.5" fill="none" />
      <path d="M21 120 C15 122 10 120 8 115 C14 113 19 115 21 120 Z" fill={WILT} />
      <path d="M26 112 C32 115 35 119 35 124 C29 123 27 118 26 112 Z" fill={WILT} />
    </>
  );
}

function Seed() {
  return (
    <>
      <ellipse cx="20" cy="127" rx="7" ry="3.5" fill="var(--stage-seed)" />
      <path
        d="M20 124 C20 120 22 118 24 117"
        stroke={LEAF}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </>
  );
}

function Tree({
  big,
  trunk,
  canopy,
  fruit,
}: {
  big: boolean;
  trunk: string;
  canopy: string;
  fruit: ReadonlyArray<readonly [number, number]>;
}) {
  const c = big
    ? [
        [20, 88, 18],
        [8, 99, 11],
        [32, 99, 11],
      ]
    : [
        [20, 90, 16],
        [9, 99, 10],
        [31, 99, 10],
      ];
  return (
    <>
      <rect x="18" y="100" width="4" height="30" fill={trunk} />
      {c.map(([cx, cy, r]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={canopy} />
      ))}
      {fruit.map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.5" fill="var(--stage-tree-fruit)" />
      ))}
    </>
  );
}

/** A1: one planting spot. Returns the drawing and where a drip would sit. */
function normalPlant(stage: PlantStage, slot: number): { art: React.ReactNode; dripY: number } {
  const odd = slot % 2 === 1;
  switch (stage) {
    case 'tree':
      return {
        dripY: 50,
        art: odd ? (
          <Tree
            big
            trunk="var(--stage-trunk)"
            canopy="var(--stage-tree-canopy)"
            fruit={[
              [13, 86],
              [27, 90],
              [19, 100],
              [30, 102],
            ]}
          />
        ) : (
          <Tree
            big={false}
            trunk="var(--stage-trunk)"
            canopy="var(--stage-tree-canopy)"
            fruit={[
              [14, 88],
              [26, 92],
              [20, 101],
            ]}
          />
        ),
      };
    case 'flower':
      return {
        dripY: 62,
        art: (
          <>
            <path d="M20 130 V94" stroke={LEAF} strokeWidth="2.5" />
            <path d={odd ? LEAF_LEFT : LEAF_RIGHT} fill={LEAF} />
            <Petals5 />
          </>
        ),
      };
    case 'sprout':
      return {
        dripY: 80,
        art: (
          <>
            <path d="M20 130 V110" stroke={LEAF} strokeWidth="2.5" />
            <path d={LEAF_LEFT} fill={LEAF} />
            <path d="M20 114 C27 113 31 108 29 103 C23 103 20 108 20 114 Z" fill={LEAF_LIGHT} />
          </>
        ),
      };
    case 'wilting':
      return { dripY: 90, art: <Wilting /> };
    case 'seed':
      return { dripY: 102, art: <Seed /> };
    case 'thirsty':
      return { dripY: 108, art: null };
  }
}

/** A5: the same garden, faded. */
function comebackPlant(stage: PlantStage, slot: number): React.ReactNode {
  switch (stage) {
    case 'tree':
      return slot % 2 === 0 ? (
        <Tree
          big={false}
          trunk="var(--comeback-trunk)"
          canopy="var(--comeback-canopy)"
          fruit={[
            [14, 88],
            [26, 92],
          ]}
        />
      ) : (
        <>
          <rect x="18" y="100" width="4" height="30" fill="var(--comeback-trunk)" />
          <circle cx="20" cy="92" r="14" fill="var(--comeback-canopy)" />
          <circle cx="10" cy="100" r="9" fill="var(--comeback-canopy)" />
          <circle cx="30" cy="100" r="9" fill="var(--comeback-canopy)" />
          <circle cx="20" cy="98" r="2.5" fill="var(--stage-tree-fruit)" />
        </>
      );
    case 'wilting':
      return slot % 3 === 2 ? (
        <>
          <path d="M20 130 C20 110 24 100 32 98" stroke={WILT} strokeWidth="2.5" fill="none" />
          <path d="M21 118 C15 120 10 118 8 113 C14 111 19 113 21 118 Z" fill={WILT} />
          <circle cx="34" cy="102" r="4" fill="var(--comeback-petal-dry)" />
          <circle cx="30" cy="106" r="4" fill="var(--comeback-petal-dry)" />
          <circle cx="37" cy="108" r="3.5" fill="var(--comeback-petal-dry)" />
        </>
      ) : (
        <Wilting />
      );
    case 'flower':
      return (
        <>
          <path d="M20 130 V100" stroke="var(--comeback-stem)" strokeWidth="2.5" />
          <path d={LEAF_LEFT} fill="var(--comeback-stem)" />
          <circle cx="20" cy="90" r="5" fill="var(--comeback-petal)" />
          <circle cx="26" cy="95" r="5" fill="var(--comeback-petal)" />
          <circle cx="14" cy="95" r="5" fill="var(--comeback-petal)" />
          <circle cx="20" cy="96" r="3.5" fill="var(--comeback-pollen)" />
        </>
      );
    case 'sprout':
      return (
        <>
          <path d="M20 130 V112" stroke="var(--comeback-stem)" strokeWidth="2.5" />
          <path
            d="M20 120 C13 119 9 114 11 109 C17 109 20 114 20 120 Z"
            fill="var(--comeback-stem)"
          />
        </>
      );
    case 'seed':
      return <Seed />;
    case 'thirsty':
      return null;
  }
}

function normalize(plant: HeroPlant): { stage: PlantStage; thirsty: boolean } {
  return typeof plant === 'string'
    ? { stage: plant, thirsty: plant === 'thirsty' }
    : { stage: plant.stage, thirsty: Boolean(plant.thirsty) };
}

function NormalScene({ plants, label }: { plants: readonly HeroPlant[]; label: string }) {
  return (
    <svg
      width="358"
      height="132"
      viewBox="0 0 358 132"
      aria-label={label}
      role="img"
      className="mx-[-16px] mt-1 max-w-none"
    >
      <rect x="0" y="118" width="358" height="14" fill="var(--color-forest-deep)" />
      {plants.slice(0, NORMAL_SLOTS.length).map((plant, slot) => {
        const { stage, thirsty } = normalize(plant);
        const { art, dripY } = normalPlant(stage, slot);
        return (
          <g key={slot} transform={`translate(${NORMAL_SLOTS[slot]},-10)`}>
            {art}
            {thirsty ? <DripDrop y={dripY} className="garden-drip" /> : null}
          </g>
        );
      })}
    </svg>
  );
}

function ComebackScene({ plants, label }: { plants: readonly HeroPlant[]; label: string }) {
  return (
    <svg
      width="358"
      height="150"
      viewBox="0 0 358 150"
      aria-label={label}
      role="img"
      className="mx-[-16px] max-w-none"
    >
      <g transform="translate(250,6)">
        <path
          d="M14 30 C4 30 4 16 14 16 C14 6 30 2 36 12 C42 4 60 6 60 18 C72 16 74 30 64 30 Z"
          fill="var(--comeback-cloud)"
        />
        {[
          ['M22 36 V42', '0s'],
          ['M36 38 V44', '.4s'],
          ['M50 36 V42', '.8s'],
        ].map(([d, delay]) => (
          <path
            key={d}
            className="garden-rain"
            d={d}
            stroke="var(--stage-due)"
            strokeWidth="3"
            strokeLinecap="round"
            style={{ animationDelay: delay }}
          />
        ))}
      </g>
      <rect x="0" y="136" width="358" height="14" fill="var(--comeback-soil)" />
      {plants.slice(0, COMEBACK_SLOTS.length).map((plant, slot) => (
        <g key={slot} transform={`translate(${COMEBACK_SLOTS[slot]},8)`}>
          {comebackPlant(normalize(plant).stage, slot)}
        </g>
      ))}
    </svg>
  );
}

export function HeroGardenCard({
  variant = 'normal',
  overline,
  title,
  trailing,
  plants,
  legend,
  headingLevel = 'h2',
  className,
}: HeroGardenCardProps) {
  const t = useTranslations('components.hero');
  const Heading = headingLevel;
  const comeback = variant === 'comeback';

  return (
    <section
      data-variant={variant}
      className={gcn(
        'flex flex-col overflow-hidden rounded-hero px-4 pt-4 text-garden-on-forest',
        comeback ? 'gap-1.5 bg-garden-forest-muted' : 'gap-1 bg-garden-forest',
        className,
      )}
    >
      {overline || title || trailing ? (
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            {overline ? (
              <span className="overline-label text-[12px] font-semibold text-stage-sprout">
                {overline}
              </span>
            ) : null}
            {title ? (
              <Heading className="font-display text-[22px] font-medium">{title}</Heading>
            ) : null}
          </div>
          {trailing}
        </div>
      ) : null}

      <ul
        aria-label={t('legend')}
        className="flex gap-[14px] text-[12px] text-garden-on-forest-muted"
      >
        {legend.map((item) => (
          <li key={item.stage} className="flex items-center gap-[5px]">
            <span aria-hidden="true" className={gcn('h-2 w-2 rounded-[4px]', DOT[item.stage])} />
            {item.label}
          </li>
        ))}
      </ul>

      {comeback ? (
        <ComebackScene plants={plants} label={t('comebackScene')} />
      ) : (
        <NormalScene plants={plants} label={t('scene')} />
      )}
    </section>
  );
}
