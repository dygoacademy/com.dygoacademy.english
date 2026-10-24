# Seeds & Harvest: design guide (S1–S3)

How the three screens of the canvas page **Adult · Seeds & Harvest** (approved 2026-10-23) are built,
so the UI keeps matching the canvas. Exact values live in `reference/S1-seed-drop.html`,
`S2-bed-harvest.html`, `S3-seed-packets(-goal).html`; build from those, never by eye. English
phone boards only: Vietnamese and iPad boards don't exist yet (plan Phase 3).

| Screen | Board | Route | Component |
| --- | --- | --- | --- |
| S1 Fruit drops seeds | `SeedDrop` | `/topics/[bed]/seeds?word=<fruit>&next=` | `screens/SeedDropScreen.tsx` |
| S2 Bed harvest | `BedHarvest` | `/topics/[bed]/harvest` | `screens/BedHarvestScreen.tsx` |
| S3 Pick a seed packet | `SeedPackets` | `/topics/[bed]/packets` | `screens/SeedPacketsScreen.tsx` |

## Shared frame

- 390 × 844, cream `bg` ground, padding 20 / 18 / 26, 14 px gap between blocks.
- Header: 44 px white circle (Close ✕ or Back ‹, 20 px icon, `border`), then a 12 px bold
  uppercase overline in `success` green, letter-spacing 0.1em (S3: a Fraunces 24 title instead).
- Hero: `forest` card, radius 26 (`rounded-hero`), full-width SVG at the board's viewBox
  (S1 354 × 190, S2 354 × 180).
- Main button: 56 px clay `primary`, radius 18, 16 px bold, `shadow-press-primary`. Second action
  is a 14 px semibold muted underlined link with 8 px padding.
- Motion (globals.css, all off under reduced motion): S1 `seed-sway` (3 s, ±2°), `seed-fall`
  (1.2 s ease-in, the second seed 0.35 s later), `seed-cards-rise` (0.3 s after 0.9 s); S2
  `harvest-drop` (0.5 s ease-in, 0.1 s + 0.15 s per fruit); S3 `packet-rise` (0.3 s).

## S1 Fruit drops seeds

- Overline "<bed> bed". Hero: the fruit plant (stem and leaves `stage-sprout-leaf` / `stage-sprout`,
  fruit `stage-flower` with the word's first 3 letters), "FRUIT" label top-left, dotted paths and
  `stage-dropped-seed` seeds on `forest-deep` soil; one path and seed per seed (max 2).
- Title Fraunces 28 / 1.15 "<word> dropped N seeds" (the word in `lang="en"`); 15 px muted line.
- Seed card: white, `border`, radius 20, padding 14 / 14 / 14 / 16. Kind tag 11 px extra-bold
  uppercase, radius 8: Pairing `primary-soft` / `primary-text`, Word family `water-soft` /
  `water-deep`, Synonym (no board) `forest-wash` / `forest`. Word Fraunces 21; part of speech 14 px
  DM Sans muted after a word-family member or synonym, never after a pairing. Meaning 14 px muted.
  Hear: 44 px `on-forest-muted` circle, forest speaker.
- Strip: `forest-wash`, radius 12, 10 / 12 padding, 13 px forest, sprout icon: "Your bed grows from
  **5 words to 7**".
- Plant them now → `/review?new=N&seeds=<fruit>`; Later and ✕ → `next` (Mission complete) or home.

## S2 Bed harvest

- Overline "<bed> · fully planted". Hero: basket (`primary`, `primary-text` rim and handle), five
  fruit dropping in, four `gold-light` stars.
- Title Fraunces 30 / 1.1 "Your first harvest" (a later harvest: "Your harvest", no board).
- Tiles: 3 columns, 8 px gap, white, radius 16, padding 10, centred: words grown / fruit
  (`primary-text`) / still growing (`forest`), numbers Fraunces 24.
- Basket card: white, radius 20, 14 / 16 padding. "In your basket" 12 px bold muted overline; chips
  14 px semibold, radius 12, 6 / 10 padding, an 8 px dot: fruit `primary-soft` + `primary`, ripe
  `gold-soft` + `stage-tree-fruit`, growing `forest-wash` + `success`. Note 13 px muted.
- Buttons: 1fr / 1.6fr grid, 8 px gap: Share (white, `border`, forest, share icon) and Choose next bed.

## S3 Pick a seed packet

- Title Fraunces 24 / 1.15, intro 15 px muted. With no bed to offer (no board): the intro says so
  and Browse all topics becomes the main button.
- Packet: a radio (`role="radio"`, `aria-checked`), radius 22, 2 px border, padding 12 / 14 / 12 / 12,
  14 px gap. Picked: `forest` border on `forest-wash`; else `border` on white. Packet art 56 × 70 in
  the kind's colour: Follow the bee `stage-tree-fruit` (overline `gold-soft-text`), Same goal
  `water` (`water-deep`), Something new `primary` (`primary-text`). Overline 11 px extra-bold;
  name Fraunces 20; meta 13 px muted "<collection> · <level> · N words"; why pill 12 px bold
  forest on `forest-wash`, radius 8.
- Plant <bed> → POST /beds, then the new bed's first planting. Browse all topics → `/topics`.
