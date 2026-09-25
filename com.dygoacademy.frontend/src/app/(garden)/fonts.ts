import { Be_Vietnam_Pro, Fraunces } from 'next/font/google';

/**
 * Word Garden fonts (design system §4.1, rebuild plan UI-1).
 *
 * next/font downloads the files at build time and serves them from our
 * own domain — Google Fonts itself is blocked in mainland China (§14.6).
 * Only the weights the type scale uses are loaded.
 *
 * Body font is Be Vietnam Pro, not DM Sans: the plan's decision is still
 * open, and DM Sans ships no `vietnamese` subset in Next's own Google
 * Fonts table (node_modules/next/.../font-data.json lists only latin and
 * latin-ext), so stacked diacritics would fall back to a system font.
 * Chinese is never downloaded; see --font-cjk in globals.css.
 */
export const displayFont = Fraunces({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  weight: ['500', '600'],
  display: 'swap',
  variable: '--font-display',
});

export const bodyFont = Be_Vietnam_Pro({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-body',
});
