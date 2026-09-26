import type { SVGProps } from 'react';

/**
 * Icons shared by garden components, drawn exactly as in the canvas
 * (docs/design/garden/reference/*.html): same 24-unit viewBox, paths,
 * stroke widths and caps. Every one is aria-hidden: the control that uses
 * it carries the accessible name. Stroke icons use currentColor unless the
 * canvas gives them a fixed colour, which then comes from a garden token.
 *
 * Sizes: pass `width` / `height` (the canvas size for that spot), or let a
 * parent size the SVG with CSS.
 */
type IconProps = SVGProps<SVGSVGElement>;

function StrokeIcon({ children, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

function FillIcon({ children, ...props }: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false" {...props}>
      {children}
    </svg>
  );
}

/** Speaker (review card audio button). Canvas: 24px, stroke 2.2. */
export function SpeakerIcon(props: IconProps) {
  return (
    <StrokeIcon strokeWidth="2.2" {...props}>
      <path d="M4 9 H8 L13 5 V19 L8 15 H4 Z" />
      <path d="M16.5 8.5 C18 10 18 14 16.5 15.5" />
      <path d="M19 6 C22 9 22 15 19 18" />
    </StrokeIcon>
  );
}

/** Speaker, no sound (not in the canvas; same speaker with a cross). */
export function SpeakerOffIcon(props: IconProps) {
  return (
    <StrokeIcon strokeWidth="2.2" {...props}>
      <path d="M4 9 H8 L13 5 V19 L8 15 H4 Z" />
      <path d="M17 10 L21 14" />
      <path d="M21 10 L17 14" />
    </StrokeIcon>
  );
}

/** Retry (not in the canvas). */
export function RetryIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M20 12 A8 8 0 1 1 17.66 6.34" />
      <path d="M20 4 V9 H15" />
    </StrokeIcon>
  );
}

/** Check (done mission: stroke 3; streak day: stroke 3.5 at 14px). */
export function CheckIcon(props: IconProps) {
  return (
    <StrokeIcon strokeWidth="3" {...props}>
      <path d="M5 12 L10 17 L19 7" />
    </StrokeIcon>
  );
}

/** Close ×. Canvas: 20px, stroke 2.4, round caps. */
export function CloseIcon(props: IconProps) {
  return (
    <StrokeIcon strokeWidth="2.4" strokeLinejoin={undefined} {...props}>
      <path d="M6 6 L18 18" />
      <path d="M18 6 L6 18" />
    </StrokeIcon>
  );
}

/** Info (not in the canvas). */
export function InfoIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11 V16" />
      <path d="M12 8 H12.01" />
    </StrokeIcon>
  );
}

/** A two-leaf sprout: the streak pill (20px, stroke = success). */
export function SproutIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M12 21 V11" />
      <path d="M12 14 C7 14 5 10 5 7 C9 7 12 9 12 14 Z" />
      <path d="M12 12 C17 12 19 8 19 5 C15 5 12 7 12 12 Z" />
    </StrokeIcon>
  );
}

/** Tab bar: Garden (the sprout on a ground line). */
export function GardenTabIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M12 21 V11" />
      <path d="M12 14 C7 14 5 10 5 7 C9 7 12 9 12 14 Z" />
      <path d="M12 12 C17 12 19 8 19 5 C15 5 12 7 12 12 Z" />
      <path d="M5 21 H19" />
    </StrokeIcon>
  );
}

/** Tab bar: Missions (a target). Also the "Daily goal" row icon. */
export function MissionsTabIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </StrokeIcon>
  );
}

/** Tab bar: Topics (an open book). */
export function TopicsTabIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M4 5 C4 4 5 4 6 4 H11 V20 H6 C5 20 4 20 4 19 Z" />
      <path d="M20 5 C20 4 19 4 18 4 H13 V20 H18 C19 20 20 20 20 19 Z" />
    </StrokeIcon>
  );
}

/** Tab bar: Me (a person). */
export function MeTabIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21 C4 16 8 14 12 14 C16 14 20 16 20 21" />
    </StrokeIcon>
  );
}

/** Water drop, filled (the watering mission; white on the topic bed's "Water" button). */
export function WaterIcon({ fill = 'var(--color-water)', ...props }: IconProps) {
  return (
    <FillIcon {...props}>
      <path d="M12 2 C12 2 4 11 4 15 A8 8 0 0 0 20 15 C20 11 12 2 12 2 Z" fill={fill} />
    </FillIcon>
  );
}

/** Planting mission (the canvas only shows it done, as a check; this is the sprout). */
export function PlantIcon(props: IconProps) {
  return <SproutIcon {...props} />;
}

/** Collocation challenge: two linked arrows (stroke = gold text). */
export function ChallengeIcon(props: IconProps) {
  return (
    <StrokeIcon stroke="var(--color-gold-text)" {...props}>
      <path d="M9 6 H5 V10" />
      <path d="M15 18 H19 V14" />
      <path d="M5 10 C5 7 8 6 11 8 L13 10" />
      <path d="M19 14 C19 17 16 18 13 16 L11 14" />
    </StrokeIcon>
  );
}

/** Kept for the gallery; the canvas uses ChallengeIcon for challenges. */
export const StarIcon = ChallengeIcon;

/**
 * Golden Bloom: five pale petals, a gold centre, a stem. The canvas draws
 * it three ways: the A1 banner puts the centre under the petals
 * (`centreFirst`) with a 14→22 stem; A3 and A8 draw the centre on top with
 * a 14→23 stem (A8's stem is leaf green: pass `stem`).
 */
export function GoldenBloomIcon({
  stem = 'var(--stage-tree-canopy)',
  stemTo = 22,
  centreFirst = false,
  ...props
}: IconProps & { stem?: string; stemTo?: number; centreFirst?: boolean }) {
  const centre = <circle cx="12" cy="9" r="3.5" fill="var(--stage-tree-fruit)" />;
  return (
    <FillIcon {...props}>
      {centreFirst ? centre : null}
      <circle cx="12" cy="4" r="3" fill="var(--color-gold-light)" />
      <circle cx="17" cy="8" r="3" fill="var(--color-gold-light)" />
      <circle cx="7" cy="8" r="3" fill="var(--color-gold-light)" />
      <circle cx="15" cy="13" r="3" fill="var(--color-gold-light)" />
      <circle cx="9" cy="13" r="3" fill="var(--color-gold-light)" />
      {centreFirst ? null : centre}
      <path d={`M12 14 V${stemTo}`} stroke={stem} strokeWidth="2" />
    </FillIcon>
  );
}

/** Arrow → on primary buttons. Canvas: 24px, stroke 2.5. */
export function ArrowRightIcon(props: IconProps) {
  return (
    <StrokeIcon strokeWidth="2.5" {...props}>
      <path d="M5 12 H19" />
      <path d="M13 6 L19 12 L13 18" />
    </StrokeIcon>
  );
}

/** Bell (reminders). */
export function BellIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M6 8 A6 6 0 0 1 18 8 C18 15 21 17 21 17 H3 C3 17 6 15 6 8" />
      <path d="M10 21 H14" />
    </StrokeIcon>
  );
}

/** Crescent moon (evening greeting on the hero card), 30px. */
export function MoonIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 30 30" focusable="false" {...props}>
      <path d="M20 4 A11 11 0 1 0 26 22 A9 9 0 1 1 20 4 Z" fill="var(--color-gold-light)" />
    </svg>
  );
}

/** Leaf that rides the end of the review progress vine (22px). */
export function LeafIcon(props: IconProps) {
  return (
    <FillIcon {...props}>
      <path d="M12 20 C4 18 3 10 6 4 C12 5 20 9 12 20 Z" fill="var(--color-success)" />
    </FillIcon>
  );
}

/** Search. Canvas: stroke 2.2, round caps. */
export function SearchIcon(props: IconProps) {
  return (
    <StrokeIcon strokeWidth="2.2" strokeLinejoin={undefined} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20 L16 16" />
    </StrokeIcon>
  );
}

/** Back chevron ‹. Canvas: stroke 2.4. */
export function BackIcon(props: IconProps) {
  return (
    <StrokeIcon strokeWidth="2.4" {...props}>
      <path d="M15 5 L8 12 L15 19" />
    </StrokeIcon>
  );
}

/** Row chevron ›. Canvas: 16px, stroke 2.4. */
export function ChevronRightIcon(props: IconProps) {
  return (
    <StrokeIcon strokeWidth="2.4" {...props}>
      <path d="M9 5 L16 12 L9 19" />
    </StrokeIcon>
  );
}

/** Three dots (options). */
export function MoreIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" focusable="false" {...props}>
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

/** Plus. Canvas: stroke 2.4, round caps. */
export function PlusIcon(props: IconProps) {
  return (
    <StrokeIcon strokeWidth="2.4" strokeLinejoin={undefined} {...props}>
      <path d="M12 5 V19" />
      <path d="M5 12 H19" />
    </StrokeIcon>
  );
}

/** Rain barrel (streak freezes). */
export function RainBarrelIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M5 6 H19 L17.5 21 H6.5 Z" />
      <path d="M4 6 H20" />
      <path d="M6 11 H18" />
      <path d="M6.5 16 H17.5" />
    </StrokeIcon>
  );
}

/** Seed pack: a seed with its seam, and (unlocked) a curl of sprout. */
export function SeedPackIcon({
  seed = 'var(--stage-tree-fruit)',
  sprout = true,
  ...props
}: IconProps & { seed?: string; sprout?: boolean }) {
  return (
    <FillIcon {...props}>
      <ellipse cx="12" cy="13" rx="6" ry="8" fill={seed} />
      <path d="M12 5 V21" stroke="var(--color-gold-text)" strokeWidth="1.5" />
      {sprout ? (
        <path
          d="M9 3 C10 1 14 1 15 3"
          stroke="var(--stage-sprout-leaf)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      ) : null}
    </FillIcon>
  );
}

/** Padlock (locked seed pack). */
export function LockIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10 V7 A4 4 0 0 1 16 7 V10" />
    </StrokeIcon>
  );
}

/** Translate (the "Meanings in" setting). */
export function TranslateIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M4 5 H14" />
      <path d="M9 3 V5" />
      <path d="M6 5 C6 10 9 13 13 14" />
      <path d="M12 5 C12 10 8 13 4 14" />
      <path d="M13 21 L17 11 L21 21" />
      <path d="M14.5 18 H19.5" />
    </StrokeIcon>
  );
}

/** Two people (the Family row). */
export function FamilyIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <circle cx="9" cy="8" r="3.5" />
      <circle cx="17" cy="10" r="2.5" />
      <path d="M3 20 C3 15 6 13 9 13 C12 13 15 15 15 20" />
      <path d="M15 15 C16 14 21 14 21 19" />
    </StrokeIcon>
  );
}

/** Keepsake "First harvest": a gold fruit on a curled stem. */
export function HarvestFruitIcon(props: IconProps) {
  return (
    <FillIcon {...props}>
      <circle cx="12" cy="14" r="7" fill="var(--stage-tree-fruit)" />
      <path
        d="M12 7 C12 4 14 3 16 3"
        stroke="var(--stage-sprout-leaf)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </FillIcon>
  );
}
