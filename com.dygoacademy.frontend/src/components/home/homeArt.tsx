import * as React from 'react';

/**
 * Home page HP-1 · the illustrations of the public home page, with the
 * SVG paths copied from `docs/design/garden/reference/H1-home-phone.html`
 * and `H2-home-desktop.html` (canvas page "Home page", be408bc). Garden
 * art only, no app screenshots. Every drawing is decorative
 * (`aria-hidden`) except Dygo the bird, which the canvas labels "Dygo".
 * Sizes come from the caller (`width`/`height` or classes), so one
 * component serves the phone and the desktop sizes.
 */
type ArtProps = React.SVGProps<SVGSVGElement>;

function Art({ viewBox, children, ...props }: ArtProps & { viewBox: string }) {
  return (
    <svg viewBox={viewBox} aria-hidden="true" focusable="false" {...props}>
      {children}
    </svg>
  );
}

/** The Dygo logo mark (sprout on forest), 40 × 40. */
export function LogoMark(props: ArtProps) {
  return (
    <Art viewBox="0 0 40 40" {...props}>
      <circle cx="20" cy="20" r="20" fill="#24463A" />
      <path d="M20 31 V18" stroke="#9CC39A" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M20 25 C14 24 11 20 13 16 C18 16 20 20 20 25 Z" fill="#9CC39A" />
      <path d="M20 22 C26 21 29 17 27 13 C22 13 20 17 20 22 Z" fill="#B7D6AE" />
    </Art>
  );
}

/** The globe used by the language chip and the languages line, 24 × 24. */
export function GlobeIcon(props: ArtProps) {
  return (
    <Art viewBox="0 0 24 24" fill="none" stroke="#24463A" strokeWidth="2" strokeLinecap="round" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12 H21" />
      <path d="M12 3 C15 6 15 18 12 21 C9 18 9 6 12 3" />
    </Art>
  );
}

/** The sun in the hero, 40 × 40. */
export function HomeSun(props: ArtProps) {
  return (
    <Art viewBox="0 0 40 40" {...props}>
      <circle cx="20" cy="20" r="8" fill="#F2D28B" />
      <g stroke="#F2D28B" strokeWidth="2.5" strokeLinecap="round">
        <path d="M20 4 V8" />
        <path d="M20 32 V36" />
        <path d="M4 20 H8" />
        <path d="M32 20 H36" />
        <path d="M8.7 8.7 L11.5 11.5" />
        <path d="M28.5 28.5 L31.3 31.3" />
        <path d="M8.7 31.3 L11.5 28.5" />
        <path d="M28.5 11.5 L31.3 8.7" />
      </g>
    </Art>
  );
}

/** The watering can (with its first drops) in the hero, 60 × 60. */
export function HomeWateringCan(props: ArtProps) {
  return (
    <Art viewBox="0 0 60 60" {...props}>
      <path d="M10 14 H28 V26 C28 28 26 30 24 30 H14 C12 30 10 28 10 26 Z" fill="#E0B04A" />
      <path d="M28 17 L40 11" stroke="#E0B04A" strokeWidth="3" strokeLinecap="round" />
      <path d="M10 17 C5 17 5 25 10 25" stroke="#E0B04A" strokeWidth="2.5" fill="none" />
      <circle cx="40" cy="18" r="1.6" fill="#8EC5E8" />
      <circle cx="43" cy="23" r="1.6" fill="#8EC5E8" />
      <circle cx="38" cy="25" r="1.6" fill="#8EC5E8" />
      <circle cx="42" cy="29" r="1.6" fill="#8EC5E8" />
    </Art>
  );
}

/** Stage 1, a seed with a shoot, 40 × 40. */
export function HomeSeed(props: ArtProps) {
  return (
    <Art viewBox="0 0 40 40" {...props}>
      <ellipse cx="20" cy="34" rx="12" ry="3" fill="#C9BCA2" />
      <ellipse cx="20" cy="30" rx="5" ry="3.5" fill="#6B5040" />
      <path d="M20 27 C20 24 22 22 24 21" stroke="#7FA487" strokeWidth="2" fill="none" strokeLinecap="round" />
    </Art>
  );
}

/** Stage 2, a two-leaf sprout, 40 × 40. */
export function HomeSprout(props: ArtProps) {
  return (
    <Art viewBox="0 0 40 40" {...props}>
      <ellipse cx="20" cy="36" rx="12" ry="3" fill="#C9BCA2" />
      <path d="M20 35 V20" stroke="#7FA487" strokeWidth="2.5" />
      <path d="M20 28 C14 27 11 23 13 19 C18 19 20 23 20 28 Z" fill="#9CC39A" />
      <path d="M20 25 C26 24 29 20 27 16 C22 16 20 20 20 25 Z" fill="#B7D6AE" />
    </Art>
  );
}

/** Stage 3, a flower, 40 × 52. */
export function HomeFlower(props: ArtProps) {
  return (
    <Art viewBox="0 0 40 52" {...props}>
      <ellipse cx="20" cy="48" rx="12" ry="3" fill="#C9BCA2" />
      <path d="M20 47 V20" stroke="#7FA487" strokeWidth="2.5" />
      <circle cx="20" cy="10" r="5" fill="#E8A87C" />
      <circle cx="26" cy="15" r="5" fill="#E8A87C" />
      <circle cx="24" cy="22" r="5" fill="#E8A87C" />
      <circle cx="16" cy="22" r="5" fill="#E8A87C" />
      <circle cx="14" cy="15" r="5" fill="#E8A87C" />
      <circle cx="20" cy="17" r="4" fill="#F2D28B" />
    </Art>
  );
}

/** Stage 4, a fruiting tree, 44 × 56. */
export function HomeTree(props: ArtProps) {
  return (
    <Art viewBox="0 0 44 56" {...props}>
      <ellipse cx="22" cy="52" rx="13" ry="3" fill="#C9BCA2" />
      <rect x="20" y="30" width="4" height="22" fill="#8A6A4F" />
      <circle cx="22" cy="20" r="15" fill="#7FA487" />
      <circle cx="11" cy="29" r="9" fill="#7FA487" />
      <circle cx="33" cy="29" r="9" fill="#7FA487" />
      <circle cx="16" cy="18" r="3" fill="#E0B04A" />
      <circle cx="28" cy="22" r="3" fill="#E0B04A" />
    </Art>
  );
}

/** A gold star (kids card, parents list), 24 × 24. */
export function HomeStar(props: ArtProps) {
  return (
    <Art viewBox="0 0 24 24" {...props}>
      <path
        d="M12 3 L14.6 8.6 L20.6 9.2 L16 13.3 L17.4 19.3 L12 16.2 L6.6 19.3 L8 13.3 L3.4 9.2 L9.4 8.6 Z"
        fill="#F5C443"
        stroke="#E0B04A"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </Art>
  );
}

/** The bee on the kids card, 64 × 64. */
export function HomeBee(props: ArtProps) {
  return (
    <Art viewBox="0 0 64 64" {...props}>
      <ellipse cx="26" cy="20" rx="10" ry="14" fill="#DDF0FA" stroke="#8FC9E8" strokeWidth="2" transform="rotate(-25 26 20)" />
      <ellipse cx="40" cy="20" rx="10" ry="14" fill="#DDF0FA" stroke="#8FC9E8" strokeWidth="2" transform="rotate(25 40 20)" />
      <ellipse cx="32" cy="38" rx="18" ry="14" fill="#F5C443" />
      <path d="M28 25 V51 M38 26 V50" stroke="#2E2A26" strokeWidth="5" />
      <circle cx="47" cy="34" r="2.5" fill="#2E2A26" />
    </Art>
  );
}

/** Dygo the bird, 64 × 64. The one labelled drawing (`aria-label`). */
export function DygoBird({ label, ...props }: ArtProps & { label: string }) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={label} {...props}>
      <path d="M30 13 C27 6 34 3 35 10" stroke="#B4552E" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="32" cy="36" r="24" fill="#B4552E" />
      <ellipse cx="32" cy="44" rx="14" ry="11" fill="#F7D9C4" />
      <circle cx="24" cy="30" r="5" fill="#FFFFFF" />
      <circle cx="40" cy="30" r="5" fill="#FFFFFF" />
      <circle cx="25" cy="31" r="2.5" fill="#2E2A26" />
      <circle cx="41" cy="31" r="2.5" fill="#2E2A26" />
      <path d="M28 36 L36 36 L32 42 Z" fill="#F5C443" />
    </svg>
  );
}

/** The apple picture on the kids card, 120 × 120. */
export function HomeApple(props: ArtProps) {
  return (
    <Art viewBox="0 0 120 120" {...props}>
      <path d="M60 36 C44 26 22 32 22 58 C22 84 42 104 60 96 C78 104 98 84 98 58 C98 32 76 26 60 36 Z" fill="#E0533D" />
      <path d="M60 38 C60 28 62 20 68 14" stroke="#6B4226" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M64 26 C72 14 86 14 90 20 C82 30 70 30 64 26 Z" fill="#6DB85F" />
    </Art>
  );
}

/** The cat picture on the kids card, 120 × 120. */
export function HomeCat(props: ArtProps) {
  return (
    <Art viewBox="0 0 120 120" {...props}>
      <path d="M28 50 L34 18 L54 38 Z" fill="#F2A65A" />
      <path d="M92 50 L86 18 L66 38 Z" fill="#F2A65A" />
      <circle cx="60" cy="66" r="38" fill="#F2A65A" />
      <circle cx="46" cy="62" r="5" fill="#2E2A26" />
      <circle cx="74" cy="62" r="5" fill="#2E2A26" />
      <path d="M56 74 L64 74 L60 79 Z" fill="#E27A8A" />
    </Art>
  );
}

/** The white tick in the green badge on the right picture, 24 × 24. */
export function HomeTick(props: ArtProps) {
  return (
    <Art viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12 L10 17 L19 7" />
    </Art>
  );
}

/** Feature icons (24 × 24, `currentColor` lines), in the canvas order. */
export function FeatureWaterIcon(props: ArtProps) {
  return (
    <Art viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3 C12 3 5 11 5 15 A7 7 0 0 0 19 15 C19 11 12 3 12 3 Z" fill="#1D6A9A" stroke="none" />
    </Art>
  );
}

export function FeatureQuizIcon(props: ArtProps) {
  return (
    <Art viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M8.5 12.5 L11 15 L16 9.5" />
    </Art>
  );
}

export function FeatureBedsIcon(props: ArtProps) {
  return (
    <Art viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 18 H20" />
      <path d="M8 18 V12" />
      <path d="M8 14 C5 13.5 4 11 5 9 C7.5 9 8.5 11 8 14 Z" />
      <path d="M16 18 V10" />
      <path d="M16 12 C19 11.5 20 9 19 7 C16.5 7 15.5 9 16 12 Z" />
    </Art>
  );
}

export function FeatureBloomIcon(props: ArtProps) {
  return (
    <Art viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="8" r="3" />
      <circle cx="16.5" cy="11" r="3" />
      <circle cx="7.5" cy="11" r="3" />
      <circle cx="12" cy="11" r="1.6" fill="currentColor" />
      <path d="M12 14 V21" />
    </Art>
  );
}

export function FeatureGroupIcon(props: ArtProps) {
  return (
    <Art viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="9" cy="9" r="3" />
      <circle cx="17" cy="10" r="2.5" />
      <path d="M3.5 19 C4 15.5 6.5 14 9 14 C11.5 14 14 15.5 14.5 19" />
      <path d="M15 14.5 C17.5 14.3 20 15.5 20.5 18.5" />
    </Art>
  );
}

export function FeatureLanguageIcon(props: ArtProps) {
  return (
    <Art viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12 H21" />
      <path d="M12 3 C15 6 15 18 12 21 C9 18 9 6 12 3" />
    </Art>
  );
}
