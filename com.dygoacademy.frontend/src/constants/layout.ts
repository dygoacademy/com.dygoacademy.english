/**
 * Word Garden content widths (design system §6.2, rebuild plan UI-1).
 *
 * Single source of truth for content-container widths, per size class.
 * Extend this object rather than hardcoding a `max-w-*` at a call site.
 * (UI-8 U8-3 deleted the classic one-width-for-all object; U8-4 renames
 * this one.)
 *
 *   tier     compact (<600)  medium (600–1023)  expanded (1024+)
 *   narrow   full width      540                540    sheets, dialogs
 *   default  full width      560                640    review card, single-item screens
 *   wide     full width      720                1080   page content (excl. sidebar)
 *
 * `medium:` / `expanded:` are the garden screens in tailwind.config.ts.
 */
export const GARDEN_CONTENT_WIDTH = {
  narrow: 'w-full medium:max-w-[540px]',
  default: 'w-full medium:max-w-[560px] expanded:max-w-[640px]',
  wide: 'w-full medium:max-w-[720px] expanded:max-w-[1080px]',
} as const;
