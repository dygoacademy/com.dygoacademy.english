import localFont from 'next/font/local';

/**
 * Word Garden fonts, self-hosted from woff2 files committed in ./fonts
 * (OFL licences next to them). Decided 2026-09-26: the canvas wins.
 *
 * - Body: **DM Sans** 400–700 (latin + latin-ext), with **Be Vietnam Pro**
 *   400–700 (vietnamese + latin-ext) as a per-glyph fallback, so Vietnamese
 *   letters DM Sans doesn't have (ả, ệ, ớ…) come from Be Vietnam Pro.
 * - Display: **Fraunces** variable with the optical-size axis (opsz 9–144,
 *   wght 100–900). The browser picks opsz from the font size
 *   (font-optical-sizing: auto), exactly as the canvas renders it.
 *
 * Why local files, not next/font/google: builds must not need Google
 * (the sandbox, CI and mainland China can't reach it), and the pixel diff
 * against docs/design/garden/reference needs the exact files the canvas
 * references were rendered with (@fontsource 5.3.0).
 *
 * Each unicode subset is its own family with its own `unicode-range`
 * (except the latin catch-alls), and the stack in globals.css chains them
 * in the canvas renderer's order, which gives the per-glyph fallback. `adjustFontFallback: false` keeps next/font from inserting a
 * metric-adjusted Arial between them (it would catch every glyph first).
 * Chinese is never downloaded; see --font-cjk in globals.css.
 *
 * next/font needs every option as a literal, so the unicode ranges (copied
 * from the @fontsource CSS: latin, latin-ext, vietnamese) are repeated.
 */

export const dmSansLatin = localFont({
  src: [
    { path: './fonts/dm-sans-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/dm-sans-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: './fonts/dm-sans-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: './fonts/dm-sans-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  // No unicode-range (UI-L): like the canvas renderer, the latin file is
  // this family's catch-all, after latin-ext in the chain (globals.css).
  display: 'swap',
  adjustFontFallback: false,
  variable: '--font-dm-sans-latin',
});

export const dmSansLatinExt = localFont({
  src: [
    { path: './fonts/dm-sans-latin-ext-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/dm-sans-latin-ext-500-normal.woff2', weight: '500', style: 'normal' },
    { path: './fonts/dm-sans-latin-ext-600-normal.woff2', weight: '600', style: 'normal' },
    { path: './fonts/dm-sans-latin-ext-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
    },
  ],
  display: 'swap',
  adjustFontFallback: false,
  preload: false,
  variable: '--font-dm-sans-latin-ext',
});

export const beVietnamProVietnamese = localFont({
  src: [
    { path: './fonts/be-vietnam-pro-vietnamese-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/be-vietnam-pro-vietnamese-500-normal.woff2', weight: '500', style: 'normal' },
    { path: './fonts/be-vietnam-pro-vietnamese-600-normal.woff2', weight: '600', style: 'normal' },
    { path: './fonts/be-vietnam-pro-vietnamese-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB',
    },
  ],
  display: 'swap',
  adjustFontFallback: false,
  preload: false,
  variable: '--font-be-vietnam-pro-vi',
});

export const beVietnamProLatinExt = localFont({
  src: [
    { path: './fonts/be-vietnam-pro-latin-ext-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/be-vietnam-pro-latin-ext-500-normal.woff2', weight: '500', style: 'normal' },
    { path: './fonts/be-vietnam-pro-latin-ext-600-normal.woff2', weight: '600', style: 'normal' },
    { path: './fonts/be-vietnam-pro-latin-ext-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
    },
  ],
  display: 'swap',
  adjustFontFallback: false,
  preload: false,
  variable: '--font-be-vietnam-pro-latin-ext',
});

export const frauncesLatin = localFont({
  src: [{ path: './fonts/fraunces-latin-opsz-normal.woff2', weight: '100 900', style: 'normal' }],
  // No unicode-range (UI-L): like the canvas renderer, the latin file is
  // this family's catch-all, after latin-ext in the chain (globals.css).
  display: 'swap',
  adjustFontFallback: false,
  variable: '--font-fraunces-latin',
});

export const frauncesLatinExt = localFont({
  src: [
    { path: './fonts/fraunces-latin-ext-opsz-normal.woff2', weight: '100 900', style: 'normal' },
  ],
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
    },
  ],
  display: 'swap',
  adjustFontFallback: false,
  preload: false,
  variable: '--font-fraunces-latin-ext',
});

/** Not in the canvas (it has no Vietnamese headings); keeps Vietnamese topic names in Fraunces. */
export const frauncesVietnamese = localFont({
  src: [
    { path: './fonts/fraunces-vietnamese-opsz-normal.woff2', weight: '100 900', style: 'normal' },
  ],
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB',
    },
  ],
  display: 'swap',
  adjustFontFallback: false,
  preload: false,
  variable: '--font-fraunces-vi',
});

/** Every font variable class, for the element that sets `data-ui="garden"`. */
export const gardenFontVariables = [
  dmSansLatin,
  dmSansLatinExt,
  beVietnamProVietnamese,
  beVietnamProLatinExt,
  frauncesLatin,
  frauncesLatinExt,
  frauncesVietnamese,
]
  .map((font) => font.variable)
  .join(' ');
