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

## Running the diff

```sh
cd com.dygoacademy.frontend
npm run dev                      # in one terminal
npm run garden:diff -- --base http://localhost:3000 --cookie dygo_ui=garden
```

The fixture pages are `/garden/_reference/<name>` (dev only, garden flag or cookie; they 404 in production). The script uses your installed Chrome (or `--chrome` / `CHROME_PATH`), writes `actual` and `diff` PNGs to `com.dygoacademy.frontend/.garden-diff/` (gitignored) and prints the table. In a diff PNG, red pixels count; yellow ones are anti-aliasing that pixelmatch ignores.

## Diff results (2026-09-26, UI-fidelity pass)

Measured in headless Chromium 153 on Linux (the sandbox), against `next dev`. The **noise floor** is the diff of the reference HTML itself, rendered in the same browser with the same fonts: it's what a pixel-perfect page scores here, because this Chromium anti-aliases text slightly differently from the one that made the PNGs.

| Reference | Diff | Noise floor | Result |
| --- | ---: | ---: | --- |
| A1-todays-garden | 0.153% | 0.153% | pass, at the floor |
| A2-review-question | 0.074% | 0.074% | pass, at the floor |
| A2-review-answer | 0.258% | 0.131% | pass (Vietnamese line, see below) |
| A2-review-finished | 0.022% | 0.021% | pass, at the floor |
| A3-mission-complete | 0.134% | 0.133% | pass, at the floor |
| A4-weekly-harvest | 0.293% | 0.293% | pass, at the floor |
| A5-welcome-back | 0.184% | 0.184% | pass, at the floor |
| A6-topics | 0.221% | 0.221% | pass, at the floor |
| A7-topic-bed | 0.741% | 0.254% | **over 0.5%: Vietnamese glyph fallback only** |
| A7-topic-bed-filter-sprouts | 0.324% | 0.139% | pass (Vietnamese lines) |
| A8-me | 0.271% | 0.236% | pass ("Tiếng Việt") |

**The only remaining difference is decided, not a bug.** The canvas renders Vietnamese letters that DM Sans doesn't have (ạ, ả, ấ, ễ, ộ, ợ…) with the browser's system fallback; the app uses **Be Vietnam Pro** for them (Dylan's decision, 2026-09-26). A7 shows 11 Vietnamese meanings, so it goes over 0.5%. Proof: with the body stack cut to DM Sans only (scratch copy, not committed), A7 scores 0.263%, A7-sprouts 0.147%, A8 0.238% and A2-answer 0.131%, i.e. the noise floor.

## Known differences (resolved 2026-09-26)

| # | Canvas | Resolution |
| --- | --- | --- |
| 1 | Body font DM Sans | Done in UI-fidelity (1): DM Sans, Be Vietnam Pro only as the per-glyph Vietnamese fallback (the A7 note above). |
| 2 | Fraunces with the optical-size axis | Done in UI-fidelity (1): the variable opsz files the references were rendered with. |
| 3 | Plant, hero and icon SVGs | Done in UI-fidelity (2): exact canvas paths, per context (`PlantGlyph` `variant`), and the canvas hero illustrations. |
| 4 | Component sizes | Done in UI-fidelity (2). |

Two canvas quirks the code reproduces on purpose, because the canvas is the source of truth:

- **Links are content-box, buttons are border-box.** Browsers size `<button>` border-box and `<a>` content-box, and the canvas sets heights on both. So a bordered link is 2px bigger than the same-looking button: Close / Back are 46×46 but Search / Options are 44×44; the A7 Quiz link is 54px next to the 52px Add button; the A8 settings rows are 52px + a 1px divider. `IconButton asChild`, `Button asChild variant="secondary"` and `SettingsRow` do this.
- **The A8 frame overflows by 3px**, pushing the tab bar 3px past the bottom edge. The reference pages keep the tab bar in the flow (`stickyNav={false}`); live pages make it sticky.

## Scope

- **iPhone (390 px):** match 100%.
- **Other widths:** the canvas has only iPhone artboards. For iPhone SE, Pro Max and iPad, keep the same components and spacing and follow the design system doc §10, until iPad artboards are added to the canvas. Then those become references too.
- **Real data:** long topic names, bigger counts and other languages will wrap differently. The fixture pages are what must match; the live pages must use the same components and styles.
- **Motion:** the references are frozen frames; match the canvas animations (drip, bloom, rise) from the keyframes in `source/*.dc.html`.

If the canvas changes, re-run `tools/render.js`, commit the new references in their own commit, and say so in the session report.
