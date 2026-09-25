import type { SVGProps } from 'react';

/**
 * Small decorative icons shared by garden components. Every one is
 * aria-hidden: the control that uses it carries the accessible name.
 * Stroke icons use currentColor so they follow the text colour.
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

export function SpeakerIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M4 10v4h4l5 4V6L8 10H4z" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7" />
      <path d="M19 6a8.5 8.5 0 0 1 0 12" />
    </StrokeIcon>
  );
}

export function SpeakerOffIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M4 10v4h4l5 4V6L8 10H4z" />
      <path d="M17 10l4 4M21 10l-4 4" />
    </StrokeIcon>
  );
}

export function RetryIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20 4v5h-5" />
    </StrokeIcon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </StrokeIcon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </StrokeIcon>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </StrokeIcon>
  );
}

/** Tab bar: Garden (a sprout). */
export function GardenTabIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M12 21v-9" />
      <path d="M12 13c0-4-3-6-7-6 0 4 3 6 7 6z" />
      <path d="M12 11c0-4 3-6 7-6 0 4-3 6-7 6z" />
      <path d="M5 21h14" />
    </StrokeIcon>
  );
}

/** Tab bar: Missions (a target). */
export function MissionsTabIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.5" />
    </StrokeIcon>
  );
}

/** Tab bar: Topics (garden beds). */
export function TopicsTabIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
    </StrokeIcon>
  );
}

/** Tab bar: Me (a person). */
export function MeTabIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c1.2-4 4-6 7.5-6s6.3 2 7.5 6" />
    </StrokeIcon>
  );
}

/** Missions: a watering can. */
export function WaterIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M12 3.5c3 4 5 6.6 5 9.5a5 5 0 0 1-10 0c0-2.9 2-5.5 5-9.5z" />
    </StrokeIcon>
  );
}

/** Missions: a seed being planted. */
export function PlantIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M12 20v-7" />
      <path d="M12 14c-3.5 0-6-2-6-6 3.5 0 6 2 6 6z" />
      <path d="M12 12c0-3 2-5 5.5-5 0 3-2 5-5.5 5z" />
      <path d="M6 20h12" />
    </StrokeIcon>
  );
}

/** Missions: a star (challenge). */
export function StarIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />
    </StrokeIcon>
  );
}
