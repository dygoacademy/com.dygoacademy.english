import type { SVGProps } from 'react';

/**
 * Drawings used only by the quiz result screen (UI-5 QZ-2, canvas Q6–Q8),
 * copied path for path from docs/design/garden/reference/Q6-quiz-result.html
 * (watering can) and Q7-quiz-result-perfect.html (bloom). Both sit in the
 * 148px forest circle; decorative (aria-hidden).
 */
type SvgProps = SVGProps<SVGSVGElement>;

const LEAF = 'var(--stage-sprout-leaf)';
const LEAF_LIGHT = 'var(--stage-sprout)';
const PETAL = 'var(--stage-flower)';
const POLLEN = 'var(--color-gold-light)';
const DROP = 'var(--stage-due)';
/** Canvas-only colours of these two drawings (no garden token). */
const SHADOW = '#1B362C';
const CAN = '#E0B04A';

function Svg({ children, ...props }: SvgProps) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 60 60" {...props}>
      {children}
    </svg>
  );
}

/** Watering can over a sprout (Q6, Q8: some words missed), drawn at 104px. */
export function QuizWateringArt(props: SvgProps) {
  return (
    <Svg width={104} height={104} {...props}>
      <ellipse cx="30" cy="55" rx="18" ry="3.5" fill={SHADOW} />
      <path d="M30 54 V36" stroke={LEAF} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M30 46 C23 45 19 40 21 36 C27 36 30 40 30 46 Z" fill={LEAF} />
      <path d="M30 43 C37 42 41 37 39 33 C33 33 30 37 30 43 Z" fill={LEAF_LIGHT} />
      <path d="M10 14 H28 V26 C28 28 26 30 24 30 H14 C12 30 10 28 10 26 Z" fill={CAN} />
      <path d="M28 17 L40 11" stroke={CAN} strokeWidth="3" strokeLinecap="round" />
      <path d="M10 17 C5 17 5 25 10 25" stroke={CAN} strokeWidth="2.5" fill="none" />
      <circle cx="40" cy="18" r="1.6" fill={DROP} />
      <circle cx="43" cy="23" r="1.6" fill={DROP} />
      <circle cx="38" cy="25" r="1.6" fill={DROP} />
      <circle cx="42" cy="29" r="1.6" fill={DROP} />
    </Svg>
  );
}

/** Full bloom (Q7: every answer right), drawn at 110px. */
export function QuizBloomArt(props: SvgProps) {
  return (
    <Svg width={110} height={110} {...props}>
      <path d="M30 56 V28" stroke={LEAF} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M30 46 C22 45 18 40 20 35 C27 35 30 40 30 46 Z" fill={LEAF} />
      <path d="M30 42 C38 41 42 36 40 31 C33 31 30 36 30 42 Z" fill={LEAF_LIGHT} />
      <circle cx="30" cy="12" r="7" fill={PETAL} />
      <circle cx="39" cy="18" r="7" fill={PETAL} />
      <circle cx="36" cy="28" r="7" fill={PETAL} />
      <circle cx="24" cy="28" r="7" fill={PETAL} />
      <circle cx="21" cy="18" r="7" fill={PETAL} />
      <circle cx="30" cy="21" r="6" fill={POLLEN} />
      <circle cx="10" cy="10" r="1.5" fill={POLLEN} />
      <circle cx="52" cy="14" r="1.5" fill={POLLEN} />
      <circle cx="48" cy="40" r="1.2" fill={POLLEN} />
      <circle cx="8" cy="38" r="1.2" fill={POLLEN} />
    </Svg>
  );
}
