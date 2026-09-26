# Word Garden: design reference (source of truth)

**Rule: the adult garden UI must match the "Dygo Word Garden" design canvas 100%.** Same layout, spacing, sizes, colours, fonts, radii, shadows, icons, illustrations and copy, screen by screen. If the code and the canvas disagree, the canvas is right and the code changes.

Exported from the canvas on 2026-09-26 (canvas version `1790379466-5563`, Adult page).

## What's in this folder

| Folder | What | Use it for |
| --- | --- | --- |
| `reference/*.png` | Each adult screen at 390 × 844, rendered at 2× (780 × 1688 px), animations frozen | Side-by-side and pixel-diff checks (gate G1, and every screen in UI-4 to UI-7) |
| `reference/*.html` | The same screens as plain, static HTML with every inline style | **Exact values**: open in a browser and use DevTools to read any size, colour, padding or SVG path. Don't guess from the PNG. |
| `source/*.dc.html` | The canvas artboard files as exported | Regenerating the references; the sample data behind each screen |
| `tools/render.js` | Renders `source/` → `reference/` | Re-export after the canvas changes: `cd tools && npm install && node render.js` (uses Chrome; set `CHROME_PATH` to use another Chromium) |

## Screens

| Reference | Canvas artboard | Garden route (planned) | Step |
| --- | --- | --- | --- |
| `A1-todays-garden` | A1 · Today's Garden | `/garden` | UI-4 |
| `A2-review-question`, `A2-review-answer`, `A2-review-finished` | A2 · Watering (Review), three states | `/garden/review` | UI-4 |
| `A3-mission-complete` | A3 · Mission Complete | `/garden/review/done` | UI-4 |
| `A4-weekly-harvest` | A4 · Weekly Harvest | `/garden/missions` | UI-6 |
| `A5-welcome-back` | A5 · Welcome Back | `/garden` after 2+ missed days | UI-6 |
| `A6-topics` | A6 · Topics (Beds) | `/garden/topics` | UI-5 |
| `A7-topic-bed`, `A7-topic-bed-filter-sprouts` | A7 · Topic Bed, unfiltered and "Sprouts" selected | `/garden/topics/[id]` | UI-5 |
| `A8-me` | A8 · Me | `/garden/me` | UI-6 |

## How a screen is checked against the canvas

1. **Fixture page.** Each screen gets a flag-only route `/garden/_reference/<screen>` that renders the **real** garden components with the **same sample data** as the canvas ("Good evening, Minh", 412 words, "mitigate", and so on). That makes the comparison like for like; the real pages use live data.
2. **Pixel diff.** Playwright screenshots the fixture page at 390 × 844 @2x with animations off, and diffs it against `reference/<screen>.png` (pixelmatch, threshold 0.1).
   - **Pass:** at most 0.5% of pixels differ, and every differing area is font anti-aliasing only.
   - **Anything else** (a shifted element, a different size, colour, radius or icon) is a bug: fix it, don't accept it.
3. **Values, not eyeballing.** When something differs, read the exact value from `reference/<screen>.html` in DevTools and use that token (or add the token if it's missing from `globals.css`).
4. **Report.** Every build pass lists each screen's diff percentage in its session report.

## Known differences to resolve (as of 2026-09-26)

| # | Canvas | Code today | To match 100% |
| --- | --- | --- | --- |
| 1 | Body font **DM Sans** (400–700) | Be Vietnam Pro (chosen in UI-1 because DM Sans has no Vietnamese subset) | Use **DM Sans** for all text, with Be Vietnam Pro only as a per-glyph fallback for Vietnamese characters (`font-family: 'DM Sans', 'Be Vietnam Pro', …`). Needs Dylan's OK, since mixed glyphs in Vietnamese words may look uneven. |
| 2 | Fraunces with the **optical-size axis** (`opsz 9..144`), weights 500–700 | Fraunces 500/600, static | Load Fraunces with `axes: ['opsz']` in `next/font` so headings get the same letter shapes and widths as the canvas |
| 3 | Plant, hero and icon SVGs as drawn in the canvas | UI-2 components drawn from the design system doc | Copy paths and coordinates from `reference/*.html` into `PlantGlyph`, `HeroGardenCard` and `icons.tsx` |
| 4 | Component sizes in the canvas (for example, the rating buttons are 68 px tall with 8 px gaps, and the missions card has 14 px × 16 px padding) | Built from the design system doc | Check every UI-2 component against its reference in the gallery; the canvas wins wherever the doc differs |

## Scope

- **iPhone (390 px):** match 100%.
- **Other widths:** the canvas has only iPhone artboards. For iPhone SE, Pro Max and iPad, keep the same components and spacing and follow the design system doc §10, until iPad artboards are added to the canvas. Then those become references too.
- **Real data:** long topic names, bigger counts and other languages will wrap differently. The fixture pages are what must match; the live pages must use the same components and styles.
- **Motion:** the references are frozen frames; match the canvas animations (drip, bloom, rise) from the keyframes in `source/*.dc.html`.

If the canvas changes, re-run `tools/render.js`, commit the new references in their own commit, and say so in the session report.
