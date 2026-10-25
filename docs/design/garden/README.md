# Word Garden: design reference (source of truth)

**Rule: the adult garden UI must match the "Dygo Word Garden" design canvas 100%.** Same layout, spacing, sizes, colours, fonts, radii, shadows, icons, illustrations and copy, screen by screen. If the code and the canvas disagree, the canvas is right and the code changes.

Exported from the canvas on 2026-09-26:

- Adult page (A1–A8, English): canvas version `1790379466-5563`.
- **Adult · Groups** (GR1–GR7, English, approved by Dylan 2026-09-26), **Adult · Tiếng Việt** (A1–A8) and **Adult · Groups · Tiếng Việt** (GR1–GR7): canvas version `1790407846-001e`.
- **Adult · Sign in** (AU1–AU4, English + Vietnamese): exported 2026-09-29 (step UI-A, A-1).

## What's in this folder

| Folder | What | Use it for |
| --- | --- | --- |
| `reference/*.png` | Each adult screen at 390 × 844, in English (`<name>.png`) and Vietnamese (`<name>-vi.png`), rendered at 2× (780 × 1688 px), animations frozen | Side-by-side and pixel-diff checks (gate G1, and every screen in UI-4 to UI-7) |
| `reference/*.html` | The same screens as plain, static HTML with every inline style | **Exact values**: open in a browser and use DevTools to read any size, colour, padding or SVG path. Don't guess from the PNG. |
| `source/*.dc.html` | The canvas artboard files as exported (`…Vi.dc.html` = the Vietnamese pages) | Regenerating the references; the sample data behind each screen |
| `tools/render.js` | Renders `source/` → `reference/` | Re-export after the canvas changes: `cd tools && npm install && node render.js ../reference [filter]` (filter e.g. `GR` or `-vi`; uses Chrome; set `CHROME_PATH` to use another Chromium). It loads DM Sans with **Be Vietnam Pro as the per-glyph fallback**, the same stack as the app. |

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
| `A8-me`, `A8-me-account` | A8 · Me, and with the Account sheet open (gear → Sign out, added 2026-09-30) | `/garden/me` | UI-6 |
| `Q1-quiz-choose`, `Q2-quiz-right`, `Q3-quiz-not-quite`, `Q4-quiz-cloze-hint`, `Q5-quiz-listen` | Quiz (canvas page "Adult · Quiz", added 2026-10-01): Choose the word, Synonym (right answer), wrong pick, Fill in the blank with hint, Listen and spell | `/garden/quiz?topic=…` | UI-5 QZ |
| `Q6-quiz-result`, `Q7-quiz-result-perfect`, `Q8-quiz-drill-done` | Quiz results: some words need water, every answer right, tricky-word drill done | `/garden/quiz` (after the last question) | UI-5 QZ |
| `H1-home-phone`, `H2-home-desktop` | Public home page (canvas page "Home page", added 2026-10-02): phone 390×3800 and desktop 1280×2600, illustrations only | `/` for signed-out visitors | Home HP |
| `H3-landing-v2-phone`, `H4-landing-v2-desktop`, `H3s-plant-bloomed`, `H3s-pain-flipped`, `H3s-uses-travel`, `H3s-speaking-compared` | Landing page (H3 "Landing · Phone", H4 "Landing · Desktop"), pain-led (canvas page "Landing Page", was "Home page v2" until 2026-10-08, approved 2026-10-03, G-home): phone 390 wide, desktop 1280 wide, plus three phone state boards (hero after planting "deadline", "forget" card flipped, Travel bed selected). Each board's size is in `tools/render.js` (`$size`). 2026-10-07/08: Speaking section `#speak` + FAQ + desktop nav link "Speaking"; sizes now phone 390 × 7423 (VI 7373), desktop 1280 × 5063 (VI 4867); `H3s-speaking-compared` = the speaking demo after "Try it now". Reference names renamed `home-v2` → `landing-v2` on 2026-10-08 (the `garden:diff` fixture names must follow) | `/` for signed-out visitors | Home HP-6 … HP-11 |
| `GR1-shared-gardens` | GR1 · Shared Gardens (group list) | `/garden/groups` | UI-G |
| `GR2-group-garden` | GR2 · Group Garden | `/garden/groups/[id]` | UI-G |
| `GR3-tricky-patches` | GR3 · Tricky Patches + Rain Day | `/garden/groups/[id]/manage` | UI-G |
| `GR4-gardeners` | GR4 · Gardeners & Roles | `/garden/groups/[id]/manage` (second tab) | UI-G |
| `GR5-invite` | GR5 · Invite Sheet | sheet on GR2 / GR4 | UI-G |
| `GR6-join` | GR6 · Join a Garden | `/garden/join/[token]` | UI-G |
| `GR7-create` | GR7 · Start a Garden | sheet on GR1 | UI-G |
| `AU1-sign-in`, `AU1-sign-in-error` | AU1 · Sign in, default and error banner | `/login` (garden look behind the flag or cookie) | UI-A |
| `AU2-create-account` | AU2 · Create account | `/register` | UI-A |
| `AU3-create-account-invite` | AU3 · Create account from a group invite | `/register?next=/join/<token>` | UI-A |
| `AU4-reset-password`, `AU4-reset-password-sent` | AU4 · Reset password, email form and "Check your inbox" | `/forgot-password` (and `/reset-password` in the same style) | UI-A |
| `SP1-speak-listen` | SP1 · Listen (canvas page "Adult · Speaking", handover v2, 2026-10-04) | `/sounds` (The Pond) | Phase 13 |
| `SP2-speak-countdown`, `SP2-speak-recording` | SP2 · Speaking: the 3 · 2 · 1 countdown (`phase: 'count'`, n = 3) and recording (`phase: 'speaking'`) | `/sounds` | Phase 13 |
| `SP3-speak-checking`, `SP3-speak-done`, `SP3-speak-failed` | SP3 · Compare: checking, done and failed (`phase` override) | `/sounds` | Phase 13 |
| `SP4-speak-done` | SP4 · Done | `/sounds` (after the fifth sentence) | Phase 13 |
| `S1-seed-drop` | S1 · Fruit drops seeds (canvas page "Adult · Seeds & Harvest", approved 2026-10-23; English only) | after a review that turns a word into fruit | Seeds & Harvest Phase 2 |
| `S2-bed-harvest` | S2 · Bed harvest | `/topics/[id]/harvest` | Seeds & Harvest Phase 1 |
| `S3-seed-packets`, `S3-seed-packets-goal` | S3 · Pick a seed packet (first packet selected; Same goal selected) | `/topics/[id]/packets` | Seeds & Harvest Phase 1 |
| `P1-say-word` (+ `-loading`, `-playing`, `-slowly`, `-sound-error`), `P2-recording(-beep)`, `P2b-not-heard` (+ `-noisy`, `-other-word`), `P3-checking` | P1 Say the word, P2 Recording, P2b Couldn't hear you, P3 Checking (canvas page "Adult · Pronunciation", 2026-10-11) | `/sounds/word` | Pronunciation Part 2 |
| `P4-result-pass`, `-pass-last`, `-almost`, `-almost-last`, `-retry`, `-retry-last`, `-sunny-pass-last`, `-compensation` | P4 Result **v2** (2026-10-25): syllable chips, Native / You, one big button + link; pass, almost perfect and retry, on a middle bee and the last | `/sounds/word` | Pronunciation v2 Step A (references), Step B (screen) |
| `SP0-mic`, `SP0-mic-denied` | SP0 Microphone, first time and denied (2026-10-25 board) | before the first recording | Pronunciation v2 Step B |

Every screen above also has a **Vietnamese reference**, `<name>-vi` (for example `A1-todays-garden-vi`, `GR3-tricky-patches-vi`): 24 English and 24 Vietnamese references in all (AU added 2026-09-29). Exception: S1–S3 (Seeds & Harvest) have no Vietnamese boards yet; they come in that plan's Phase 3, and until then vi-VN uses the English layout with translated copy, checked like Chinese.

Seeds & Harvest (S1–S3): the build guide with every value per screen is `seeds-harvest.md` in this folder.
Pronunciation (P1–P4, P2b, SP0): `pronunciation.md`. The old P4 references (`P4-result-pollinated`, `-long-word`, `-one-stone`) were removed on 2026-10-25 with the v2 board.

## Languages

The app ships in **English (`en-US`), Simplified Chinese (`zh-CN`) and Vietnamese (`vi-VN`)** (full locale codes since 2026-09-26; the old `en` / `vi` still work in `?locale=` and `--locale`); see `docs/plans/phase 12 implementation plan.md`, step UI-L.

- **Vietnamese references use Be Vietnam Pro for body text** (re-exported 2026-10-04). Since Dylan's fix on 2026-10-03, Vietnamese pages draw every body letter in Be Vietnam Pro (`globals.css`, `:lang(vi)`), because the DM Sans-first stack mixed two fonts inside one word (DM Sans drew ế, ỗ, ố; Be Vietnam Pro drew ệ, ộ, ư, đ). The canvas still draws them DM Sans first, so `tools/render.js` swaps the body stack for every `vi` job (`withVietnameseBody`); headings (Fraunces, Baloo 2) and the canvas sources are unchanged. This is a deliberate difference from the canvas files: line breaks can move (e.g. the SP2 countdown hint wraps to two lines).
- **English and Vietnamese are the two reference languages.** Both must match their references (same pixel-diff rule). The Vietnamese references fix the translations, the shortened labels and the two layout tweaks the canvas made for Vietnamese (topic chips and the Weekly Harvest "Hôm nay" label don't wrap).
- **The canvas copy is the message source.** `messages/en-US.json` must say exactly what the English references say, and `messages/vi-VN.json` exactly what the `-vi` references say. The glossary is in the plan (UI-L).
- **Chinese has no canvas page.** It uses the English layout; check it with the screenshot tests at every viewport (no text cut off, nothing wraps that doesn't wrap in English) instead of a pixel diff. A native speaker reviews `zh-CN.json` before release.
- On the Vietnamese review card the **Vietnamese meaning comes first** and the English definition second (A2-review-answer-vi). That order follows the *meaning language*, not the app language.

## How a screen is checked against the canvas

The fixture pages (`/garden/_reference/<screen>`) and `npm run garden:diff` were removed on 2026-10-18 (Dylan). A screen is checked like this:

1. **Values, not eyeballing.** Build from the exact values in `reference/<screen>.html` (read them in DevTools) and use that token (or add the token if it's missing from `globals.css`).
2. **Screenshot against the reference.** Screenshot the real screen at the board's size (phone boards 390 × 844 @2x, animations off) in `en-US` and `vi-VN` and compare it with `reference/<screen>.png` and `<screen>-vi.png`. Font anti-aliasing may differ; anything else (a shifted element, a different size, colour, radius or icon) is a bug: fix it, don't accept it.

The diff results below are the record from when `garden:diff` existed.

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

## Diff results, English and Vietnamese (2026-09-26, UI-L pass)

Committed `garden-diff.mjs --locale en,vi`, run against a static snapshot of `next dev` in Playwright's Chromium 1194 (x86-64), the browser that renders the reference HTML pixel-identically (noise floor 0). The UI-L pass changed the font chain to the canvas renderer's order (`--font-body` / `--font-display` in globals.css; the latin files have no `unicode-range`), which is what the `-vi` references were drawn with.

| Screen | English | Vietnamese |
| --- | ---: | ---: |
| A1-todays-garden | 0.000% | 0.000% |
| A2-review-question | 0.001% | 0.001% |
| A2-review-answer | 0.180% | 0.001% |
| A2-review-finished | 0.001% | 0.001% |
| A3-mission-complete | 0.001% | 0.001% |
| A4-weekly-harvest | 0.000% | 0.000% |
| A5-welcome-back | 0.000% | 0.088% |
| A6-topics | 0.000% | 0.000% |
| A7-topic-bed | **0.738%** | 0.001% |
| A7-topic-bed-filter-sprouts | 0.262% | 0.001% |
| A8-me | 0.050% | 0.000% |

- English A7 (and the smaller A2-answer / A7-sprouts / A8 numbers) is the known font decision: the English references were drawn with DM Sans only, so their Vietnamese meaning lines use the system fallback; the app uses Be Vietnam Pro. The `-vi` references were drawn with the app's stack and match.
- **2026-09-27: English `A7-topic-bed` redrawn with the app's font stack** (Dylan's request): `tools/render.js` now renders the screens in `APP_FONT_STACK` with `'DM Sans', 'Be Vietnam Pro', sans-serif`, like the `-vi` sources, instead of the English canvas's `'DM Sans', sans-serif`. The exported canvas source is unchanged. Rendered in Playwright's Chromium 1194 (x86-64); against the UAT screenshot it scores 0.327% (was 0.787%), level with `A7-topic-bed-vi` (0.316%). A2-answer, A7-sprouts and A8 English still use the canvas stack (under 0.5%).
- Vietnamese A5: the only difference is one letter, "Chủ Nhật" (the ICU weekday name) where the canvas wrote "Chủ nhật" in the rain-barrel sentence.

## Diff results, Groups (2026-09-26, UI-G pass)

Same method as the UI-L table. The GR screens with a tab bar use the canvas's five-tab padding (4px at the sides).

| Screen | English | Vietnamese |
| --- | ---: | ---: |
| GR1-shared-gardens | 0.000% | 0.000% |
| GR2-group-garden | 0.001% | 0.001% |
| GR3-tricky-patches | 0.001% | 0.001% |
| GR4-gardeners | 0.013% | 0.001% |
| GR5-invite | 0.001% | 0.001% |
| GR6-join | 0.001% | 0.001% |
| GR7-create | 0.001% | 0.001% |

## Diff results, Quiz (2026-10-01, UI-5 QZ-3)

Run by Dylan on the Mac against UAT (`--base https://www.dygoacademy.com`), build with `05616dd`. All 16 pass (≤ 0.5%).

| Reference | English | Vietnamese (`-vi`) |
| --- | ---: | ---: |
| Q1-quiz-choose | 0.055% | 0.056% |
| Q2-quiz-right | 0.212% | 0.194% |
| Q3-quiz-not-quite | 0.188% | 0.170% |
| Q4-quiz-cloze-hint | 0.258% | 0.260% |
| Q5-quiz-listen | 0.203% | 0.198% |
| Q6-quiz-result | 0.322% | 0.304% |
| Q7-quiz-result-perfect | 0.072% | 0.075% |
| Q8-quiz-drill-done | 0.163% | 0.139% |

First run failed Q2/Q3 (0.65% / 1.12%): the empty gap pill was 88px border-box instead of the canvas's 104px content-box, and the autofocused Next button showed a focus ring (the diff now blurs an autofocused button before shooting). Both fixed in `05616dd`.

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
