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
 * - `comeback` (A5 / A5b): the muted background, no heading, the same
 *   garden faded, and a rain cloud; a thirsty flower or sprout gets a
 *   still drop (a thirsty sprout is the two-leaf one, A5b).
 * - `resting` (A1b All watered): forest background, a `subtitle` line in
 *   place of the legend, the sun at the top right with a small butterfly,
 *   and the garden with no drops (the flowers sway).
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
  variant?: 'normal' | 'comeback' | 'resting';
  overline?: string;
  title?: string;
  /** A line under the title in place of the legend (A1b: "Nothing is thirsty…"). */
  subtitle?: string;
  /** Decorative icon at the top right, e.g. <MoonIcon width={30} height={30} />. */
  trailing?: React.ReactNode;
  /** The plants drawn in the illustration, left to right. */
  plants: readonly HeroPlant[];
  /** Empty hides the legend row. */
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
/** A1b: nine spots, 39.775 apart, as the canvas draws them. */
const RESTING_SLOTS = [-0.1, 39.7, 79.4, 119.2, 159, 198.8, 238.6, 278.3, 318.1] as const;

/** The canvas draws the scene 358 wide (a 390 iPhone). */
const SCENE_WIDTH = 358;

/**
 * A spot's x as a share of the scene width: at 358 it lands on the canvas
 * pixel, on a wider card (iPad, max 560 column) the spots and the soil
 * spread across the whole card instead of bunching up on the left.
 */
function spotX(x: number): string {
  return `${(x / SCENE_WIDTH) * 100}%`;
}

/** Full card width (the scene bleeds over the card's 16px padding). */
const SCENE_CLASSES = 'mx-[-16px] w-[calc(100%+32px)] max-w-none';

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

/** A5: the same garden, faded. A5b: a drop over each thirsty plant. */
function comebackPlant(stage: PlantStage, slot: number, thirsty: boolean): React.ReactNode {
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
          {thirsty ? <DripDrop y={70} /> : null}
        </>
      );
    case 'sprout':
      return thirsty ? (
        <>
          <path d="M20 130 V110" stroke="var(--comeback-stem)" strokeWidth="2.5" />
          <path d={LEAF_LEFT} fill="var(--comeback-stem)" />
          <path
            d="M20 114 C27 113 31 108 29 103 C23 103 20 108 20 114 Z"
            fill="var(--comeback-leaf-light)"
          />
          <DripDrop y={82} />
        </>
      ) : (
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

/** A1b: the resting garden's tree (rounder canopy than A1's) and swaying flowers, no drops. */
function restingPlant(stage: PlantStage, slot: number): React.ReactNode {
  switch (stage) {
    case 'tree':
      return (
        <>
          <rect x="18" y="100" width="4" height="30" fill="var(--stage-trunk)" />
          <circle cx="20" cy="90" r="17" fill="var(--stage-tree-canopy)" />
          <circle cx="8" cy="100" r="10" fill="var(--stage-tree-canopy)" />
          <circle cx="32" cy="100" r="10" fill="var(--stage-tree-canopy)" />
          {[
            [13, 88],
            [27, 92],
            [20, 102],
          ].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.5" fill="var(--stage-tree-fruit)" />
          ))}
        </>
      );
    case 'flower':
      return <g className="sway">{normalPlant('flower', slot).art}</g>;
    case 'thirsty':
      return null;
    default:
      return normalPlant(stage, slot).art;
  }
}

/**
 * Unlike A1 / A5, the canvas scales this scene with the card (a 358 × 132
 * viewBox at full width), so the plants grow with it.
 */
function RestingScene({ plants, label }: { plants: readonly HeroPlant[]; label: string }) {
  return (
    <svg
      viewBox="0 0 358 132"
      aria-label={label}
      role="img"
      className={gcn(SCENE_CLASSES, 'mt-1 block h-auto')}
    >
      <rect x="0" y="120" width="358" height="12" fill="var(--color-forest-deep)" />
      {plants.slice(0, RESTING_SLOTS.length).map((plant, slot) => (
        <g key={slot} transform={`translate(${RESTING_SLOTS[slot]},-10)`}>
          {restingPlant(normalize(plant).stage, slot)}
        </g>
      ))}
    </svg>
  );
}

/** A1b: the sun (36px, eight rays) at the top right of the resting card. */
function Sun() {
  return (
    <svg
      aria-hidden="true"
      width="36"
      height="36"
      viewBox="0 0 36 36"
      className="absolute right-4 top-[14px]"
    >
      <circle cx="18" cy="18" r="9" fill="var(--color-gold-light)" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <path
          key={deg}
          d="M18 2 V6"
          stroke="var(--color-gold-light)"
          strokeWidth="2.4"
          strokeLinecap="round"
          transform={`rotate(${deg} 18 18)`}
        />
      ))}
    </svg>
  );
}

/** A1b: the small butterfly beside the sun (`flutter`). */
function Butterfly() {
  return (
    <svg
      aria-hidden="true"
      width="26"
      height="20"
      viewBox="0 0 26 20"
      className="flutter absolute right-[70px] top-[46px]"
    >
      <path d="M13 10 C8 0 0 2 2 9 C4 15 11 13 13 10 Z" fill="var(--color-gold-light)" />
      <path d="M13 10 C18 0 26 2 24 9 C22 15 15 13 13 10 Z" fill="var(--stage-flower)" />
    </svg>
  );
}

function NormalScene({ plants, label }: { plants: readonly HeroPlant[]; label: string }) {
  return (
    <svg height="132" aria-label={label} role="img" className={gcn(SCENE_CLASSES, 'mt-1')}>
      <rect x="0" y="118" width="100%" height="14" fill="var(--color-forest-deep)" />
      {plants.slice(0, NORMAL_SLOTS.length).map((plant, slot) => {
        const { stage, thirsty } = normalize(plant);
        const { art, dripY } = normalPlant(stage, slot);
        return (
          <svg key={slot} x={spotX(NORMAL_SLOTS[slot])} y="-10" width="40" height="142" overflow="visible">
            {art}
            {thirsty ? <DripDrop y={dripY} className="drip" /> : null}
          </svg>
        );
      })}
    </svg>
  );
}

function ComebackScene({ plants, label }: { plants: readonly HeroPlant[]; label: string }) {
  return (
    <svg height="150" aria-label={label} role="img" className={SCENE_CLASSES}>
      <svg x={spotX(250)} y="6" width="80" height="50" overflow="visible">
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
            className="rain"
            d={d}
            stroke="var(--stage-due)"
            strokeWidth="3"
            strokeLinecap="round"
            style={{ animationDelay: delay }}
          />
        ))}
      </svg>
      <rect x="0" y="136" width="100%" height="14" fill="var(--comeback-soil)" />
      {plants.slice(0, COMEBACK_SLOTS.length).map((plant, slot) => {
        const { stage, thirsty } = normalize(plant);
        return (
          <svg key={slot} x={spotX(COMEBACK_SLOTS[slot])} y="8" width="40" height="142" overflow="visible">
            {comebackPlant(stage, slot, thirsty)}
          </svg>
        );
      })}
    </svg>
  );
}

export function HeroGardenCard({
  variant = 'normal',
  overline,
  title,
  subtitle,
  trailing,
  plants,
  legend,
  headingLevel = 'h2',
  className,
}: HeroGardenCardProps) {
  const t = useTranslations('components.hero');
  const Heading = headingLevel;
  const comeback = variant === 'comeback';
  const resting = variant === 'resting';

  return (
    <section
      data-variant={variant}
      className={gcn(
        'flex flex-col overflow-hidden rounded-hero px-4 pt-4 text-on-forest',
        comeback ? 'gap-1.5 bg-forest-muted' : 'gap-1 bg-forest',
        resting && 'relative',
        className,
      )}
    >
      {overline || title || trailing ? (
        <div className="flex items-start justify-between">
          <div className={gcn('flex flex-col', resting && 'gap-1')}>
            {overline ? (
              <span className="overline-label text-[12px] font-semibold text-stage-sprout">
                {overline}
              </span>
            ) : null}
            {title ? (
              <Heading
                className={gcn('font-display font-medium', resting ? 'text-[24px]' : 'text-[22px]')}
              >
                {title}
              </Heading>
            ) : null}
          </div>
          {trailing}
        </div>
      ) : null}

      {subtitle ? <p className="text-[13px] text-on-forest-muted">{subtitle}</p> : null}

      {legend.length > 0 ? (
        <ul
          aria-label={t('legend')}
          className="flex gap-[14px] text-[12px] text-on-forest-muted"
        >
          {legend.map((item) => (
            <li key={item.stage} className="flex items-center gap-[5px]">
              <span aria-hidden="true" className={gcn('h-2 w-2 rounded-[4px]', DOT[item.stage])} />
              {item.label}
            </li>
          ))}
        </ul>
      ) : null}

      {resting ? (
        <>
          <Butterfly />
          <Sun />
        </>
      ) : null}

      {resting ? (
        <RestingScene plants={plants} label={t('restingScene')} />
      ) : comeback ? (
        <ComebackScene
          plants={plants}
          label={t(
            plants.some((plant) => normalize(plant).stage === 'wilting')
              ? 'comebackScene'
              : 'comebackSceneThirsty',
          )}
        />
      ) : (
        <NormalScene plants={plants} label={t('scene')} />
      )}
    </section>
  );
}
