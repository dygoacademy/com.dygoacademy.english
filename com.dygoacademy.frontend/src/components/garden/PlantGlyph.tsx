import { gcn } from './cn';
import type { PlantStage } from './plantStage';

/**
 * Plant glyph (design system §11): one SVG per stage (seed, sprout,
 * flower, tree, wilting) plus the thirsty drop. Colours come only from
 * the §5.2 stage tokens, and the shapes differ per stage, so colour is
 * never the only signal. No text inside the SVG (§14.5).
 *
 * - Decorative by default (`aria-hidden`). Pass `aria-label` (e.g.
 *   t('components.plant.tree')) when the glyph is the only place the
 *   stage is shown; it then becomes `role="img"`.
 * - `animate="drip"` adds a falling drop, the ambient "needs water" loop
 *   (§12: only on plants that need attention). `animate="bloom"` scales
 *   the glyph in (.6 → 1.06 → 1) once. Both collapse to nothing / a
 *   150ms fade under prefers-reduced-motion (globals.css).
 */
export const PLANT_GLYPH_SIZES = [24, 32, 40, 56, 72] as const;
export type PlantGlyphSize = (typeof PLANT_GLYPH_SIZES)[number];

export interface PlantGlyphProps {
  stage: PlantStage;
  size?: PlantGlyphSize;
  animate?: 'drip' | 'bloom';
  'aria-label'?: string;
  className?: string;
}

export function PlantGlyph({
  stage,
  size = 40,
  animate,
  'aria-label': ariaLabel,
  className,
}: PlantGlyphProps) {
  const labelled = typeof ariaLabel === 'string' && ariaLabel.length > 0;
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      focusable="false"
      data-stage={stage}
      {...(labelled
        ? { role: 'img', 'aria-label': ariaLabel }
        : { 'aria-hidden': true as const })}
      className={gcn('shrink-0 overflow-visible', animate === 'bloom' && 'garden-bloom', className)}
    >
      {STAGE_ART[stage]}
      {animate === 'drip' ? (
        <path
          className="garden-drip"
          d="M33 4c1.6 2.2 2.6 3.6 2.6 5a2.6 2.6 0 0 1-5.2 0c0-1.4 1-2.8 2.6-5z"
          fill="var(--stage-due)"
          stroke="var(--color-water)"
          strokeWidth="0.8"
        />
      ) : null}
    </svg>
  );
}

const soil = (
  <path d="M7 34.5h26" stroke="var(--stage-seed)" strokeOpacity="0.35" strokeWidth="2.5" strokeLinecap="round" />
);

const STAGE_ART: Record<PlantStage, React.ReactNode> = {
  seed: (
    <>
      {soil}
      <ellipse cx="20" cy="26" rx="6.5" ry="8.5" transform="rotate(-18 20 26)" fill="var(--stage-seed)" />
      <path
        d="M17.4 21.2c.9-1.6 2.3-2.6 3.8-2.9"
        stroke="var(--color-surface)"
        strokeOpacity="0.55"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
    </>
  ),
  sprout: (
    <>
      {soil}
      <path d="M20 34V20" stroke="var(--stage-sprout-leaf)" strokeWidth="2.5" strokeLinecap="round" />
      <path
        d="M20 24c0-6-4.5-9.5-11-9.5 0 6 4.5 9.5 11 9.5z"
        fill="var(--stage-sprout)"
        stroke="var(--stage-sprout-leaf)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M20 21c0-6.5 4.5-10 11-10 0 6.5-4.5 10-11 10z"
        fill="var(--stage-sprout)"
        stroke="var(--stage-sprout-leaf)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </>
  ),
  flower: (
    <>
      {soil}
      <path d="M20 34V17" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" />
      <path
        d="M20 29c0-4.5-3.5-7-8-7 0 4.5 3.5 7 8 7z"
        fill="var(--stage-sprout-leaf)"
        stroke="var(--color-success)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <g fill="var(--stage-flower)">
        <circle cx="20" cy="7.5" r="4.6" />
        <circle cx="26.2" cy="12" r="4.6" />
        <circle cx="23.8" cy="19.2" r="4.6" />
        <circle cx="16.2" cy="19.2" r="4.6" />
        <circle cx="13.8" cy="12" r="4.6" />
      </g>
      <circle cx="20" cy="13.6" r="3.6" fill="var(--stage-tree-fruit)" />
    </>
  ),
  tree: (
    <>
      {soil}
      <path d="M20 34.5V22" stroke="var(--stage-seed)" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M20 26.5l-4-3.5" stroke="var(--stage-seed)" strokeWidth="2.2" strokeLinecap="round" />
      <path
        d="M20 3.5c6.8 0 11.5 4.4 11.5 9.9 0 5.7-4.9 9.6-11.5 9.6S8.5 19.1 8.5 13.4C8.5 7.9 13.2 3.5 20 3.5z"
        fill="var(--stage-tree-canopy)"
        stroke="var(--stage-tree)"
        strokeWidth="1.8"
      />
      <g fill="var(--stage-tree-fruit)" stroke="var(--stage-tree)" strokeWidth="0.8">
        <circle cx="15" cy="11" r="2.3" />
        <circle cx="24.5" cy="9.5" r="2.3" />
        <circle cx="21" cy="17" r="2.3" />
        <circle cx="27" cy="15.5" r="2" />
      </g>
    </>
  ),
  wilting: (
    <>
      {soil}
      <path
        d="M19 34.5c0-7 .6-11 3.4-15 2-2.8 5-3.8 6.8-2.4"
        stroke="var(--stage-wilt)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M19.6 28c-1.8-4.3-5.2-6.2-9.8-5.4 1 4 4.7 6.3 9.8 5.4z"
        fill="var(--stage-wilt)"
        fillOpacity="0.55"
        stroke="var(--stage-wilt)"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <g fill="var(--stage-wilt)">
        <ellipse cx="29.2" cy="21.2" rx="3.1" ry="4.2" transform="rotate(-20 29.2 21.2)" />
        <ellipse cx="32.8" cy="18.4" rx="2.6" ry="3.6" transform="rotate(-70 32.8 18.4)" fillOpacity="0.8" />
        <ellipse cx="25.8" cy="18.2" rx="2.6" ry="3.6" transform="rotate(40 25.8 18.2)" fillOpacity="0.8" />
      </g>
    </>
  ),
  thirsty: (
    <>
      <path
        d="M20 4.5c5.6 7.3 9.5 12.3 9.5 17.6a9.5 9.5 0 0 1-19 0c0-5.3 3.9-10.3 9.5-17.6z"
        fill="var(--stage-due)"
        stroke="var(--color-water)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 22.5a4.8 4.8 0 0 0 3.2 4.6"
        stroke="var(--color-surface)"
        strokeOpacity="0.8"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    </>
  ),
};
