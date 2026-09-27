# Dygo Academy — UI/UX Design System (iPhone & iPad)

**Version**: 0.2 (draft)
**Date**: 2026-09-25
**Status**: Draft for review. Nothing here is built yet.
**Source of truth for visuals**: the "Dygo Word Garden" design canvas (Adult page: A1–A8, Kids page: 1–4)
**Companion documents**: `dygo_academy_frontend_architecture.md` (§16 breakpoints, §17 `CONTENT_WIDTH`), `dygo_academy_tech_spec_and_conventions.md`

**Changelog**
* **0.2** (2026-09-25): learners come from four markets: US, Singapore, China and Vietnam. Added §14 Localization (UI language vs meaning language, English variety, per-locale formats, China delivery). Principle 6, §4.1, §4.3 and §13 now cover all four languages instead of Vietnamese only. Sections after §13 renumbered.
* **0.1** (2026-09-25): first draft. Tokens and components are taken from the Word Garden mockups. iPad layouts are new here; there are no iPad mockups yet.

---

## 0. How to use this document

1. **Tokens first.** Components use the token names (`--color-surface`, `rounded-card`), never raw hex or px. A value that isn't in this document is a question to ask, not something to invent in a component.
2. **Design for width, not device.** An iPad in Split View can be 320px wide. Layout depends on the size class (§2), not on "is this an iPad".
3. **One structure, two themes.** Adult (IELTS) and Kids use the same components and token names. Only token *values* change (§13).
4. **Small changes need a changelog line.** Add a line when a token changes, the same way the architecture doc does.

---

## 1. Design principles

| # | Principle | What it means in practice |
|---|---|---|
| 1 | **One decision on open** | Every home screen has exactly one primary button (the terracotta one). Everything else is secondary. |
| 2 | **The garden tells the SRS story** | Word state is shown as a plant stage, never as a bare status label. Numbers support the picture, they don't replace it. |
| 3 | **Always leave a reason to come back** | Every "done" screen ends with a next step: a mission left, a ripening time, a reminder. |
| 4 | **No guilt** | Missed days show as "thirsty" or "wilting", never "failed" or "missed". Streak freezes protect streaks by default. |
| 5 | **Thumb first on iPhone, two hands on iPad** | Primary actions sit in the bottom 40% of an iPhone screen. On iPad they sit next to the content they act on. |
| 6 | **Four markets, no hard-coded language** | Learners are in the US, Singapore, China and Vietnam. No component assumes one UI language, one meaning language, one date format or one English accent (§14). Every text style renders Vietnamese diacritics and Simplified Chinese without clipping (§4.3). |

---

## 2. Devices, size classes and breakpoints

### 2.1 Target devices (logical points = CSS px in Safari)

| Device | Portrait (w × h) | Size class, portrait | Size class, landscape |
|---|---|---|---|
| iPhone SE (2nd/3rd gen) | 375 × 667 | compact | compact (short) |
| iPhone 13 mini | 375 × 812 | compact | compact (short) |
| iPhone 15 / 16 | 393 × 852 | compact | compact (short) |
| iPhone 16 Pro | 402 × 874 | compact | compact (short) |
| iPhone 16 Plus / 15 Pro Max | 430 × 932 | compact | compact (short) |
| iPhone 16 Pro Max | 440 × 956 | compact | compact (short) |
| iPad mini (6th/7th gen) | 744 × 1133 | medium | expanded |
| iPad (10th gen+) / iPad Air 11" | 820 × 1180 | medium | expanded |
| iPad Pro 11" (M4) | 834 × 1210 | medium | expanded |
| iPad Air 13" | 1024 × 1366 | expanded | expanded |
| iPad Pro 13" (M4) | 1032 × 1376 | expanded | expanded |

> Check these against Apple's current device specs before QA. New iPhone sizes appear every year, so the size classes below matter more than this list.

**Design reference frame:** 390 × 844 for iPhone (the mockups), 820 × 1180 for iPad portrait, 1180 × 820 for iPad landscape.

### 2.2 Size classes (what layouts respond to)

| Size class | Width | Typical case | Layout |
|---|---|---|---|
| `compact` | < 600px | Any iPhone, iPad Slide Over, iPad Split View ⅓ | 1 column, bottom tab bar |
| `medium` | 600–1023px | iPad portrait, iPad Split View ½ or ⅔ | 1–2 columns, side rail (80px) |
| `expanded` | ≥ 1024px | iPad landscape, iPad 13" portrait | 2–3 columns, sidebar (240px) |
| `short` (modifier) | height < 500px | iPhone landscape | Hide decorative illustrations, keep only the card and actions |

### 2.3 Tailwind mapping

Proposed `theme.screens`. It has to be reconciled with §16 of the frontend architecture doc before use.

```ts
screens: {
  md: '600px',   // medium: iPad portrait, Split View ½
  lg: '1024px',  // expanded: iPad landscape, 13" iPad
  short: { raw: '(max-height: 499px)' }, // iPhone landscape
}
```

Mobile first: unprefixed classes are `compact`, then `md:` and `lg:` add to them.

---

## 3. Viewport, safe areas and Safari behaviour

| Rule | Implementation |
|---|---|
| Draw under the notch / Dynamic Island, then pad back | `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` |
| Respect safe areas | Page padding uses `max(16px, env(safe-area-inset-left))` etc. The bottom tab bar's bottom padding is `calc(8px + env(safe-area-inset-bottom))` (about 42px on Face ID iPhones, 8px on iPhone SE). |
| Full-height screens | Use `100dvh` (not `100vh`, which ignores Safari's collapsing toolbars). |
| No zoom on input focus | Every `<input>` / `<textarea>` has font-size ≥ 16px. |
| No double-tap zoom delay | `touch-action: manipulation` on buttons and cards. |
| No hover-only features | Hover is a bonus for iPad trackpad users. Everything must work by tap. |
| No haptics | The Vibration API isn't supported in iOS Safari. Feedback is visual (motion) and optional sound. |
| Home Screen app (PWA) | Add a `manifest.json` with `display: standalone`, `theme-color: #24463A` (adult) / `#FFF8EC` (kids), and an `apple-touch-icon` 180×180. |
| Status bar in standalone mode | `apple-mobile-web-app-status-bar-style: default` (dark text on light background). |

---

## 4. Typography

### 4.1 Font families

| Role | Adult theme | Kids theme | Fallback stack |
|---|---|---|---|
| Display (headings, big numbers, the word on a card) | **Fraunces** 500/600 | **Baloo 2** 700/800 | `Georgia, serif` / `system-ui` |
| Body (everything else) | **DM Sans** 400–700 | **Nunito** 500–800 | `-apple-system, system-ui, sans-serif` |

| Chinese (zh-CN UI text and meanings) | System CJK font | System CJK font | `"PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif` |

Load Latin fonts with `next/font/google` and `display: swap`. That downloads the files at build time and serves them from our own domain, which matters because Google Fonts is blocked in mainland China (§14.6). Load only the weights listed.

**Chinese fonts are not downloaded.** A full Simplified Chinese web font is several MB. iPhones and iPads already ship PingFang SC, so the stack above relies on it. Put the CJK fonts *after* the Latin font in each stack, so English words keep their Latin font and only Chinese characters fall through.

### 4.2 Type scale

Sizes are in px. They're written as `rem` in code, so text zoom works.

| Token | Font | iPhone (compact) | iPad (medium / expanded) | Weight | Line height | Use |
|---|---|---|---|---|---|---|
| `display-xl` | Display | 40 | 48 | 600 | 1.05 | The word on a review card |
| `display-l` | Display | 28 | 34 | 600 | 1.1 | Screen titles ("Good evening, Minh") |
| `display-m` | Display | 22 | 26 | 500–600 | 1.15 | Hero numbers ("412 words growing") |
| `display-s` | Display | 19 | 21 | 600 | 1.2 | Card titles ("Today's missions") |
| `body-l` | Body | 17 | 18 | 600–700 | 1.35 | Primary button labels, meanings |
| `body-m` | Body | 15 | 16 | 400–700 | 1.4 | Default text, list titles |
| `body-s` | Body | 13 | 14 | 400–600 | 1.4 | Secondary text, captions |
| `label` | Body | 12 | 13 | 600–700 | 1.3 | Chips, nav labels, overline (uppercase, `letter-spacing: .08em`) |

**Rules**
* Nothing smaller than 12px.
* Kids theme: all sizes × 1.15 (rounded to the nearest whole number). The word on a card is 56px.
* Numbers in stats use `font-variant-numeric: tabular-nums` so counters don't jump.

### 4.3 Rendering Vietnamese and Chinese (must check before build)

**Vietnamese**
* Confirm each font has a **Vietnamese subset** on Google Fonts. Baloo 2 and Nunito do. **DM Sans may not.** If it doesn't, use **Be Vietnam Pro** as the adult body font (similar geometric feel, designed for Vietnamese).
* Minimum line height 1.3 for any text that can contain Vietnamese. Stacked diacritics ("ễ", "ặ") clip at 1.0–1.1.

**Simplified Chinese**
* Line height 1.5 for Chinese body text (characters are taller and denser than Latin).
* No `text-transform: uppercase` and no `letter-spacing` on Chinese text. The overline style (`label`, uppercase, .08em) switches to normal case and 0 spacing when `lang="zh"`.
* Minimum 13px for Chinese (12px strokes become hard to read).
* Chinese has no spaces, so allow line breaks anywhere (`word-break: normal`, default for `lang="zh"`). Never `white-space: nowrap` on translatable text except single-line list items with ellipsis.
* Mixed text ("mitigate 减轻") keeps English in the Latin font; only the Chinese falls through to PingFang SC (§4.1).

**Set `lang` correctly.** `<html lang>` is the UI language. Any element showing a meaning in another language gets its own `lang` (`<span lang="vi">`, `<span lang="zh-Hans">`). This picks the right font, line breaking, and VoiceOver voice.

**Test strings for every text style**
* `Tiếng Việt — giảm nhẹ, bền vững, hạn hán, nghiên cứu`
* `简体中文 — 减轻，可持续的，干旱，生态系统`
* `Colour / color · Friday, 25 September · 9月25日 星期五`

---

## 5. Colour

### 5.1 Adult theme: semantic tokens

| Token | Hex | Use | Contrast (checked) |
|---|---|---|---|
| `--color-bg` | `#F4F1EA` | Page background (warm paper) | — |
| `--color-surface` | `#FFFFFF` | Cards, nav bar | — |
| `--color-surface-sunken` | `#F7F4EC` | Example sentence box, inset areas | — |
| `--color-border` | `#E3DDD0` | Card borders, dividers | — |
| `--color-text` | `#1C2B24` | Main text | 13.1:1 on bg |
| `--color-text-muted` | `#5E6A62` | Secondary text | 5.0:1 on bg, 5.7:1 on surface |
| `--color-forest` | `#24463A` | Hero cards, selected chips, secondary button | white text 10.4:1 |
| `--color-forest-deep` | `#1B372D` | Ground strip, inset in forest cards | — |
| `--color-primary` | `#B4552E` | **Only** the primary action (terracotta) | white text 4.9:1 |
| `--color-primary-shadow` | `#7E3719` | Pressable shadow under primary | — |
| `--color-primary-text` | `#8A3E20` | Terracotta used *as text* (links) | Use this, not `#B4552E`: that is 4.35:1 on bg, below AA for small text |
| `--color-water` | `#4A8FBF` | Due / thirsty / review progress | — |
| `--color-water-soft` | `#E3F0F8` | Due badges, info banners (text `#1D4A68`, 8.1:1) | — |
| `--color-gold` | `#C8962B` / text `#9A6E14` | Golden Bloom, rewards | `#9A6E14` on white 4.6:1 |
| `--color-gold-soft` | `#FBF4E4` | Reward banners (text `#6B5215`, 6.7:1) | — |
| `--color-success` | `#3E7F5A` | Done, mastered, switch "on" | 4.8:1 on white |

### 5.2 Plant stage colours (shared meaning in both themes)

Each SRS state has exactly one colour. Charts, bars, badges and illustrations all use these.

| Stage | SRS state | Token | Adult | Kids |
|---|---|---|---|---|
| Seed | NEW | `--stage-seed` | `#6B5040` | `#6B4226` |
| Sprout | LEARNING | `--stage-sprout` | `#B7D6AE` (leaf `#9CC39A`) | `#6DB85F` |
| Flower | REVIEW | `--stage-flower` | `#E8A87C` | `#F28AA0` |
| Fruiting tree | MASTERED | `--stage-tree` | `#3E7F5A` (canopy `#7FA487`, fruit `#E0B04A`) | `#4E9A4A` (fruit `#E0533D`) |
| Wilting | Leech | `--stage-wilt` | `#A89F6B` | `#C2B75E` |
| Thirsty | Due now | `--stage-due` | `#8EC5E8` | `#4A9FD8` |

**Rules**
* Colour is never the only signal. Stage always also has a plant shape or a text label (colour-blind safe).
* The four rating buttons use: Again `#F6E3DC`/`#8A3E20`, Hard `#F3EBD6`/`#6B4E0E`, Good `#DDE7DA`/`#24463A`, Easy `#24463A`/`#FFFFFF`. All pass 4.5:1.
* Dark mode is **out of scope for v1**. The tokens are set up so a dark set can be added later without touching components.

---

## 6. Spacing, layout grid and content width

### 6.1 Spacing scale (4px base)

| Token | px | Typical use |
|---|---|---|
| `space-1` | 4 | Icon-to-label inside chips |
| `space-2` | 8 | Gap between buttons, list rows |
| `space-3` | 12 | Gap inside cards |
| `space-4` | 16 | Card padding, iPhone page margin |
| `space-5` | 20 | Header padding |
| `space-6` | 24 | iPad page margin (medium) |
| `space-8` | 32 | iPad page margin (expanded), section gaps on iPad |
| `space-10` | 40 | Large section breaks on iPad |

### 6.2 Grid per size class

| | compact (iPhone) | medium (iPad portrait) | expanded (iPad landscape) |
|---|---|---|---|
| Page margin | 16 (+ safe area) | 24 | 32 |
| Columns | 1 | 8, gutter 16 | 12, gutter 24 |
| Navigation | Bottom tab bar | Side rail, 80px | Sidebar, 240px |
| Max content width | full width | 720 | 1080 (content area, excluding sidebar) |
| Review card max width | full width | 560 | 640 |
| Modal / sheet | Bottom sheet, full width | Centred, 540 wide | Centred, 540 wide |

This replaces the single `max-w-2xl` in `CONTENT_WIDTH` (architecture doc §17) with widths per size class. Keep the same tier names (`default`, `narrow`, `wide`) so call sites don't change.

---

## 7. Shape and elevation

### 7.1 Corner radius

| Token | px | Use |
|---|---|---|
| `radius-sm` | 12 | Small tiles, word-row icon wells, inline banners |
| `radius-md` | 16 | Buttons, stat tiles, list rows |
| `radius-lg` | 20–22 | Standard cards |
| `radius-xl` | 26 | Hero cards (garden), review card |
| `radius-full` | 9999 | Chips, pills, avatars, icon buttons |

Kids theme: +6px on every radius except `full`.

### 7.2 Elevation

The system uses **borders, not blurry shadows**. There is one exception: the "pressable" look.

| Token | Value | Use |
|---|---|---|
| `border-default` | `1px solid var(--color-border)` | All cards and rows |
| `shadow-press-primary` | `0 4px 0 var(--color-primary-shadow)` | Primary button |
| `shadow-press-forest` | `0 4px 0 #142A21` | Forest button ("Show answer") |
| `shadow-card-lift` | `0 6px 0 #E8E1D2` | Review card only |

On press, a pressable button moves down 2px and the shadow shrinks to 2px (`transform: translateY(2px)`), 80ms.

---

## 8. Touch, input and interaction

| Rule | Adult | Kids |
|---|---|---|
| Minimum touch target | 44 × 44 | 64 × 64 |
| Primary button height | 56–58 | 72–80 |
| Gap between adjacent targets | ≥ 8 | ≥ 12 |
| Rating input | 4 buttons (tap) | 2 face buttons (tap). No hold gesture. |
| Swipe gestures | Optional shortcut only (swipe card left = Again, right = Good). Buttons are always visible. | None |
| Long-press | Not used for core actions | Never |

### 8.1 iPad extras

* **Trackpad / mouse**: hover states on cards and buttons (surface → `#FBFAF6`, border darkens one step). Cursor `pointer` on anything tappable.
* **Hardware keyboard** on the review screen: `Space` = show answer, `1` `2` `3` `4` = Again / Hard / Good / Easy, `P` = play audio, `Esc` = close. Show key hints on the rating buttons only when a keyboard was used (`:focus-visible` or a `keydown` flag).
* **Apple Pencil**: no special handling in v1. It acts as a tap.
* **Split View / Slide Over**: the app must work at 320px wide. Test at 320, 507, 678 and 981 wide.

---

## 9. Navigation structure

### 9.1 Information architecture (adult)

```
Garden (home)            Missions               Topics                    Me
├─ Review session        └─ Weekly harvest      ├─ Topic bed (detail)     ├─ Garden calendar
│  └─ Mission complete                          │  ├─ Review (this bed)   ├─ Keepsakes
└─ Welcome back (state)                         │  ├─ Quiz                ├─ Settings
                                                │  └─ Add word            └─ Family → Kids garden
                                                └─ Plant a new bed

Groups (UI-G, to be designed): Shared gardens → Group garden → Tricky patches · Gardeners & roles · Invite · Join
```

Groups sit in a 5th tab shown only to people in at least one group (proposed; decision 9 in the Phase 12 plan).

### 9.2 Navigation per size class

| | compact (iPhone) | medium (iPad portrait) | expanded (iPad landscape) |
|---|---|---|---|
| Top-level | Bottom tab bar: Garden · Missions · Topics · Me | Left rail (80px): icon + label, same 4 items | Left sidebar (240px): the 4 items plus the list of topic beds under Topics |
| Sub-screen | Pushed screen with a back button (44px, top left). Tab bar hidden. | Same as iPhone | Master–detail: Topics list stays on the left, Topic bed opens on the right |
| Review session | Full screen, no tab bar, close button top left | Full screen, card centred | Full screen, card + answer side by side (§10) |
| Modal | Bottom sheet with grabber, swipe down to close | Centred sheet 540 wide | Centred sheet 540 wide |

Active tab: `--color-forest` icon + label weight 700. Inactive: `--color-text-muted`, weight 500. Tab bar height: 56 + bottom safe area.

---

## 10. Screen layouts: iPhone vs iPad

| Screen | iPhone (compact) | iPad portrait (medium) | iPad landscape (expanded) |
|---|---|---|---|
| **A1 Today's Garden** | Header → garden hero → missions card → primary button → "ripens tomorrow" line | Header full width. Row: garden hero (5/8) + missions card (3/8). Primary button under missions. | Garden hero full width (taller, 260px, more plants). Below: missions (6/12) + week strip and ripening (6/12). |
| **A2 Review** | Card fills the screen. Actions are fixed to the bottom. | Card centred (max 560). Rating bar under the card, same width. | Two panes: word + audio on the left (5/12), answer (meaning, example, collocations) on the right (7/12). Rating bar spans both. |
| **A3 Mission complete** | Single column, bloom on top | Centred column, max 560 | Bloom + stats on the left, next mission + reminder on the right |
| **A4 Weekly harvest** | Stacked cards | 2 columns: harvest (full width) then goal + rain barrel / group side by side | 3 columns under a full-width harvest row |
| **A5 Welcome back** | Stacked | Centred, max 640 | Same as medium (the whole point is one simple action) |
| **A6 Topics** | List of bed rows | Grid of bed cards, 2 columns | Topics list in the sidebar + selected bed on the right (master–detail) |
| **A7 Topic bed** | Stage tiles → actions → word list | Stage tiles (4 across) + word list in 2 columns | Detail pane of the master–detail view; word list as a table (word, meaning, stage, next due) |
| **A8 Me** | Stacked | 2 columns: profile + stats + calendar on the left, keepsakes + settings on the right | Same as medium with a wider calendar (26 weeks instead of 16) |
| **iPhone landscape (short)** | Review: card and rating bar side by side, garden illustration hidden. Other screens scroll normally. | — | — |

---

## 11. Components

Every component uses tokens only and works in both themes.

| Component | Sizes / anatomy | States | iPad difference |
|---|---|---|---|
| **Button: primary** | h 56–58, radius-md, `body-l` 700, terracotta, press shadow; optional 2nd line `body-s` | default, pressed, disabled (bg `#CFC8B8`, no shadow), loading (spinner, label kept) | Max width 400, not full width |
| **Button: secondary** | h 52, surface + border, forest text | default, pressed, disabled | Hover state |
| **Button: forest** | h 60, forest bg, white text, forest press shadow | same as primary | — |
| **Icon button** | 44 × 44, radius-full, surface + border, 20px icon, `aria-label` required | default, pressed, focus | Hover |
| **Chip / filter** | h 38, radius-full, `label` 600 | off (surface), on (forest, white text) | — |
| **Card** | surface, border-default, radius-lg, padding 16 | static, tappable (whole card is one `<a>`) | Hover on tappable |
| **Hero garden card** | forest bg, radius-xl, legend row + illustration | normal, comeback (muted colours `#34453D`, rain cloud) | Taller, more plants (the illustration scales by width) |
| **Mission row** | 40px icon circle + title + progress bar (h 6) + right value | todo, in progress, done (strike-through + check) | — |
| **Plant glyph** | SVG, stages: seed / sprout / flower / tree / wilt / thirsty drop; sizes 24, 32, 40, 56, 72 | static, animated (drip, bloom) | — |
| **Stage tile** | h 92, glyph + count (`display-s`) + label | off, on (forest, `aria-pressed`) | — |
| **Word row** | min-h 60, glyph well 40 + word + meaning (1 line, ellipsis) + due text | normal, due now (blue due text), wilting (gold-soft bg) | Table row on expanded |
| **Review card** | radius-xl, padding 22/20, chips → word (`display-xl`) + IPA → answer | hidden answer, shown answer | Two-pane in landscape |
| **Rating bar** | 4 equal buttons h 68, label + interval | default, pressed, disabled while saving | Key hints 1–4 |
| **Progress vine** | track h 10, leaf marker 22px riding the fill | — | — |
| **Stat tile** | radius-md, number `display-m` + label `label` | — | — |
| **Switch** | 52 × 32, knob 26, `role="switch"` + `aria-checked` | on (success), off (`#CFC8B8`) | — |
| **Bottom tab bar** | 4 items, icon 24 + `label`, h 56 + safe area | active, inactive | Becomes rail / sidebar |
| **Bottom sheet** | radius-xl top corners, grabber 36×5, max 90% height | open, dragging, closed | Centred sheet |
| **Toast** | forest bg, white `body-m`, radius-md, 3s | info, success | Top-centre instead of bottom |

---

## 12. Motion

| Token | Duration | Easing | Use |
|---|---|---|---|
| `motion-press` | 80ms | ease-out | Button press |
| `motion-quick` | 200–250ms | ease-out | Answer reveal (`rise`: 8px up + fade), chip toggle |
| `motion-bloom` | 700ms | ease-out with overshoot (scale .6 → 1.06 → 1) | Mission complete flower |
| `motion-ambient` | 1.6–2.4s loop | ease-in-out | Drip on thirsty plants, mascot bob (kids), bee (kids) |

**Rules**
* Respect `prefers-reduced-motion: reduce`: turn off ambient loops and bloom scale; keep only opacity fades ≤ 150ms.
* Ambient animation only on plants that need attention (thirsty / wilting), never on the whole garden.
* Kids: wrong answer = 450ms wiggle (±5°). Never shake the whole screen.

---

## 13. Kids theme: what changes

Same components, same token names, different values. It's applied with `data-theme="kids"` on the `(kids)` route group layout.

| Token group | Adult | Kids |
|---|---|---|
| Fonts | Fraunces + DM Sans | Baloo 2 + Nunito |
| Type scale | §4.2 | × 1.15, card word 56px |
| Background | `#F4F1EA` | `#FFF8EC` |
| Primary | `#B4552E` | `#B4552E` (same brand) |
| Stage colours | Muted (§5.2) | Bright (§5.2) |
| Radius | §7.1 | +6px |
| Touch target | 44 | 64 |
| Rating | 4 buttons | 2 faces (GOOD / AGAIN) |
| Copy | English, with meanings in the learner's meaning language (§14.1) | Home language first (large), English second (small). Vietnamese in the mockups is only one example; Chinese and English-only are the same layout. |
| Audio | On tap | Auto-play on card show, plus a big listen button |
| Parent area | — | Behind a hold-3-seconds or simple sum gate |

---

## 14. Localization: US, Singapore, China, Vietnam

### 14.1 Two separate language settings

Learners set these separately. Neither is inferred from the other.

| Setting | What it controls | Options (v1) | Default |
|---|---|---|---|
| **App language** | Buttons, menus, mission names, messages | English, 简体中文, Tiếng Việt | From the device language; English if unsupported |
| **Meaning language** | The translation shown under an English word's meaning | 简体中文, Tiếng Việt, **None (English only)** | Same as the app language; **None** if the app language is English |

Why they're separate: a Chinese student in Singapore may want an English UI but Chinese meanings. A US learner usually wants English-only definitions.

In the mockups, "Meanings in: Tiếng Việt + English" (A8 · Me) becomes **"Meaning language"** with these options, and the `vi` line on the review card (A2) becomes the meaning-language line (hidden when set to None).

### 14.2 Market profiles

| | US | Singapore | China | Vietnam |
|---|---|---|---|---|
| Typical learner | Kids learning to read English; adult newcomers | Kids (school English); adults preparing for IELTS | IELTS / exam-focused adults; kids | Kids (the original market); IELTS adults |
| Default app language | English | English | 简体中文 | Tiếng Việt |
| Default meaning language | None | None (Chinese optional) | 简体中文 | Tiếng Việt |
| Default English variety (§14.3) | US | UK | UK (IELTS) | UK (IELTS); US for kids optional |
| Date example | Friday, September 25 | Friday, 25 September | 9月25日 星期五 | Thứ Sáu, 25 tháng 9 |
| Clock | 12-hour (7:30 AM) | 12-hour (7:30 am) | 24-hour (07:30) | 24-hour (07:30) |
| Week starts | Sunday | Monday | Monday | Monday |
| Number | 1,200 | 1,200 | 1,200 | 1.200 |

Future locales to keep in mind for Singapore: Malay and Tamil (the layout must not assume three languages only).

### 14.3 English variety (spelling and accent)

IELTS accepts both British and American English, but a learner should see one consistently.

* **Setting**: "English accent & spelling: UK / US". It's set per market default (§14.2) and changeable in Me.
* **Audio**: store a UK and a US pronunciation where they differ; the play button uses the chosen one. The IPA shown follows the same choice.
* **Spelling**: show the chosen spelling as the headword. If the other spelling differs, show it once as a small note ("US: color").
* **Content data**: each word needs `spelling_uk`, `spelling_us` (usually identical), `ipa_uk`, `ipa_us`, `audio_uk`, `audio_us`. This is a backend change.

### 14.4 Formatting rules (never hand-format)

* Dates, times, numbers and plurals always go through `Intl` (`Intl.DateTimeFormat`, `Intl.NumberFormat`, `Intl.PluralRules`) with the app language's locale **and** region (`en-US`, `en-SG`, `zh-CN`, `vi-VN`).
* "Ripens tomorrow at 7:30 AM" is built from a message template plus a formatted time, never string-concatenated in English order. Chinese and Vietnamese put time and date words in a different order.
* **Week start matters for the design**: the Weekly Harvest (A4), the Mission Complete week strip (A3) and the Garden calendar (A8) start on Sunday in `en-US` and Monday everywhere else.
* Time zones are already handled per user (`lib/timezone.ts`); keep using the learner's resolved time zone for "today" and reminders.

### 14.5 Layout rules for translated text

* **Design for +40% text length.** Vietnamese labels run about 30–40% longer than English; Chinese is usually shorter but taller. Buttons grow in height before truncating; primary buttons may wrap to two lines.
* No text inside images or SVG illustrations. The garden, plants and mascot are text-free, and labels sit next to them in HTML.
* Tab bar labels: max ~10 characters in English. Check each translation fits at 375px; if not, use the shorter approved translation, never a smaller font.
* Avatars use initials in Latin names ("M") and the family-name character for Chinese names ("王"), one character only.
* Keep sample content culturally neutral in the mockups and seed data (names, foods, places from all four markets).

### 14.6 Delivery in mainland China

This affects design decisions, not just infrastructure.

* **Fonts**: Google Fonts is blocked, so self-host every font (`next/font` does this) and rely on system CJK fonts (§4.1).
* **Third-party services**: Google sign-in, Google Fonts, reCAPTCHA and some CDNs are blocked or unreliable. The login screen must not depend on them. Offer email + password or phone sign-in as the main path.
* **Audio and images**: serve from a CDN with mainland China coverage, or the review card will show a broken play button. The design includes a visible "audio unavailable, tap to retry" state for the audio button.
* **Backend reach**: check that Supabase and the Cloudflare tunnel are reachable from mainland China before launch there. This is an open risk, not solved by this document.

### 14.7 Privacy and children (flag for legal review)

Kids' profiles are covered by different rules in each market: COPPA (US), PDPA (Singapore), PIPL (China) and Decree 13/2023 (Vietnam). These can affect the parent sign-up, consent screens, what data a child profile stores, and where it's stored. This needs a proper legal review before kids launch in each market. The UI should reserve a parent-consent step in the Family flow now.

### 14.8 Implementation

* Library: `next-intl` (works with the App Router and Server Components). Messages live in `messages/en-SG.json` (source), `messages/en-US.json`, `messages/vi-VN.json`, `messages/zh-CN.json`: one file per full locale code (2026-09-26).
* Every user-facing string goes through `t('key')`. No raw strings in components; the mockups' English copy becomes the `en` source.
* Locale is stored on the profile (`ui_locale`, `meaning_locale`, `english_variety`), not only in a cookie, so it follows the learner between devices.
* Word translations are content, not UI messages. They live in the database per word and per meaning language (`word_translations`: `word_id`, `locale`, `meaning`, `example_translation`).

---

## 15. Accessibility checklist

* [ ] Text contrast ≥ 4.5:1 (≥ 3:1 for text ≥ 24px). Pairs in §5.1 are already checked.
* [ ] Every icon-only button has an `aria-label`. Every decorative SVG has `aria-hidden="true"`. Every meaningful plant glyph has an `aria-label` ("fruit tree", "wilting").
* [ ] Real `<button>` and `<a href>` elements only; no `onClick` on `div`s.
* [ ] Visible focus ring: 2px `--color-forest` outline, 2px offset, on `:focus-visible`.
* [ ] Works at 200% text zoom (Safari → Aa → larger text) without clipped or overlapping text.
* [ ] VoiceOver reads the review card in order: word → IPA → (after reveal) meaning → example → collocations → ratings with intervals.
* [ ] Progress (vine, bars, rings) has a text equivalent ("15 of 18 words watered").
* [ ] Reduced motion respected (§12).
* [ ] `lang` set on `<html>` and on every meaning shown in another language, so VoiceOver switches voice (§4.3).

---

## 16. Implementation mapping

| Concern | Where |
|---|---|
| Token values (CSS variables) | `src/app/globals.css`: `:root` (adult) and `[data-theme="kids"]` |
| Tailwind names for tokens | `tailwind.config.ts` → `theme.extend.colors / borderRadius / spacing / fontSize`, pointing at the CSS variables |
| Breakpoints | `tailwind.config.ts` → `theme.screens` (§2.3), reconciled with architecture doc §16 |
| Content widths | `src/constants/layout.ts` → `CONTENT_WIDTH`, per size class (§6.2) |
| Fonts | `src/app/layout.tsx` via `next/font/google`, exposed as `--font-display` and `--font-body` |
| Plant glyphs | `src/components/garden/PlantGlyph.tsx` (one component, `stage` + `size` props) |
| Theme switch | `(kids)/layout.tsx` sets `data-theme="kids"`; adult is the default |
| UI messages | `messages/{en,zh-CN,vi}.json` via `next-intl` (§14.8) |
| Locale settings | Profile fields `ui_locale`, `meaning_locale`, `english_variety` |

### 16.1 QA viewports (Playwright)

| Name | Size | Why |
|---|---|---|
| `iphone-se` | 375 × 667 | Smallest supported, no home indicator |
| `iphone-16` | 393 × 852 | Most common size |
| `iphone-16-pro-max` | 440 × 956 | Largest iPhone |
| `iphone-landscape` | 852 × 393 | `short` modifier |
| `ipad-slide-over` | 320 × 1000 | Narrowest real layout |
| `ipad-portrait` | 820 × 1180 | `medium` |
| `ipad-landscape` | 1180 × 820 | `expanded` |
| `ipad-13-landscape` | 1376 × 1032 | Largest |

Each screen gets a screenshot at every viewport. Compare it to the mockup at `iphone-16`; at other sizes, check it against §10.

### 16.2 QA locales

Run the viewport set above in each locale: `en-US`, `en-SG`, `zh-CN`, `vi-VN`. The minimum per release is `iphone-se` and `ipad-portrait` in all four. `vi-VN` on `iphone-se` catches the longest text on the smallest screen; `en-US` catches the Sunday week start.

---

## 17. Open questions

1. **Body font for Vietnamese**: keep DM Sans (if its Vietnamese support is confirmed) or switch to Be Vietnam Pro? (§4.3)
2. **iPad mockups**: the canvas only has iPhone frames. Should A1, A2 and A6/A7 get iPad portrait and landscape frames before build?
3. **Native app later?** If the kids' app moves to Flutter (the original plan), these tokens should be exported as JSON (`tokens.json`) so both codebases share them.
4. **Dark mode**: confirm it stays out of v1.
5. **Swipe to rate** on iPhone: keep it as an optional shortcut, or leave it out to avoid accidental ratings?
6. **Launch order of markets**: which market first? It decides which translations, audio accent and legal review come first (§14).
7. **Traditional Chinese** (Taiwan, Hong Kong): out of scope for v1, or add `zh-TW` now since the layout rules are the same?
8. **Content per market**: shared IELTS topics everywhere, or also market-specific packs (for example Singapore school English, US early reading)?
9. **China hosting**: is serving mainland China in scope for v1, given the infrastructure risks in §14.6?
