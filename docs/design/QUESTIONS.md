# Design questions for Dylan

Things in `docs/design/garden/CHANGELOG.md` that are unclear, or that differ from what is built, written down instead of guessed (CHANGELOG "How to use this file", rule 5). Newest first. When one is answered, note the answer and date here and update the changelog.

## 2026-10-17 · A6 Topics filter groups (Claude Code)

| # | The plan says | What the build does | Question / suggestion |
|---|---|---|---|
| Q-17 | Give each public library collection a shelf (Academic, General, Work, Travel); leave unclear ones (e.g. Everyday life) empty and ask | `20261017_library_shelf.sql` sets a shelf only for collections named exactly IELTS Academic, IELTS General, Work & careers or Travel. Every other public collection stays empty, so its beds show under All only. The list of collections couldn't be read from here; check it on UAT with `select name, library_shelf from groups where is_public` after the migration. | Which shelf, if any, for Everyday life and any other collection still empty? |

## 2026-10-08 · Onboarding OB1–OB5, built ahead of the boards (Claude Code)

Dylan asked (2026-10-07) for OB1–OB5 to be built while they are still *For approval*. They are on branch `feature/onboarding-ob1-ob5`, not merged; see `docs/reports/ONBOARDING-REPORT.md` there. The OB rows of the design changelog are not committed yet (only in the main working tree), so their Build status column is not filled in on the branch. Once that section is committed, set it to "built on branch feature/onboarding-ob1-ob5, not yet verified against boards".

| # | The changelog says | What the branch does | Question / suggestion |
|---|---|---|---|
| Q-12 | OB1–OB5 boards `Onboard*.dc.html` (EN + VI) | The boards are not in `docs/design/garden/source/`, so the screens follow AU2 and the garden tokens; no reference pages, no `garden:diff`. | Add the boards (and approve them), then the screens are rebuilt from `reference/OB*.html`. |
| Q-13 | **D-7** OB1 "Not sure? 2-min level check" | No check is built: "Not sure? Start at B1" and Skip both save B1. | Decide D-7. |
| Q-14 | OB3 "the one you pick becomes the first bed in A6" | The pick is saved as `profiles.first_topic_id`; A6 is unchanged (a new learner already sees the library topics there). It is not copied into a group of their own. | Should A6 put the first bed at the top, or should picking it copy the topic into the learner's own bed? |
| Q-15 | OB2 target "decides which words ripen first" | The goal and band are saved (`study_goal`, `target_band`); review order is unchanged for now. | What should the target change: new-word order by CEFR, A4's "Road to Band N", or both? |
| Q-16 | AU3 invite sign-up → GR2 | An invite sign-up still goes straight to its group; they meet OB1 the first time they open the Garden tab. | Fine, or should invited learners skip onboarding entirely? |

## 2026-10-06 · From the first read of the changelog (Claude Code)

| # | The changelog says | What the app / repo does | Question / suggestion |
|---|---|---|---|
| Q-1 | **D-1** speech-recognition service is still open (§2.3) | Decided 2026-10-04 (**G6**): a self-hosted speech scorer on the UAT Mac (`docker/speech`: Whisper + phoneme scores, free), live since 2026-10-05, calibrated (M4), checked with a Vietnamese speaker. Reachable wherever the app is (same Cloudflare tunnel). See `phase/phase 13/PHASE-13-RECORD.md` §20. | Mark D-1 decided? |
| Q-2 | Vietnamese font: `'DM Sans', 'Be Vietnam Pro', sans-serif` (§1) | Since Dylan's 2026-10-03 fix, Vietnamese pages use **Be Vietnam Pro for all body text** (DM Sans-first mixed two fonts inside one word); the `-vi` reference PNGs were re-exported with it (2026-10-04, `d503b1d`). | Update the §1 row to Be Vietnam Pro, or keep DM Sans first? |
| Q-3 | SP2: "elapsed time only (**no time limit**)" | No limit is shown, but recording stops at a **30 s safety cap** (handover v2: "safety cap only: stop at 30 s"). | Keep the 30 s cap as an invisible safety limit? |
| Q-4 ✅ | **D-3**: does Harvest by voice (SE5) change review dates? **Answered 2026-10-06: no, Fruit at 90%+, review dates unchanged (D5 stands).** | Phase 13 decision **D5**: speaking never changes SRS (visual only, attempts saved). | If SE5 should move a word to Fruit / change its next review, D5 changes too: confirm when answering D-3. |
| Q-5 | Strings go through `en.json` / `vi.json` (rule 3) | Message files are `messages/en-US.json`, `vi-VN.json` **and `zh-CN.json`** (master rule 5: every UI text change updates all three; zh is drafted, then reviewed by a native speaker). | Update rule 3 to the three locale files? |
| Q-6 | "Location in the repo: `docs/design/CHANGELOG.md`" | The file is at `docs/design/garden/CHANGELOG.md`. | Fix the path line, or move the file? |
| Q-7 | H3 / H4 / H3s (Home v2) are *For approval* | Built and live since 2026-10-03 (HP-11); `garden:diff` boards exist. | Mark them *Approved* (they're live), or are changes still coming? |
| Q-8 | iPad boards are *For approval* | Partly built behind `NEXT_PUBLIC_GARDEN_IPAD_NAV` (off on UAT), UI-7 U7-2. | Fine to leave behind the flag until approved? |
| Q-9 | Kids K1–K4 are *Approved* | Not part of this web app (no kids routes). | Built somewhere else, or still to do? |
| Q-10 | SE1 / SE2 / SE5 / SE6 (*Approved* 2026-10-06) | Dylan asked Claude Code to draw the boards (2026-10-06): `Entry{Home,Bed,Harvest,Echo}(Vi).dc.html` drawn on top of A1 / A7 / GR3 with design-system values only; references `SE*-entry-*` exported. Choices made: SE1 row is a link with a light-clay fill (`#FBEFE9` / `#EBC7B6`) and a clay mic circle; SE5 shows one picked word ("Picked · 94%", Fruit icon) and two with a 44 pt mic; SE6 shows the IPA, "3 of 5 gardeners done" with a clay bar and "Totals only, never names." (D-4), and drops tricky rows 3–5. SE6's changelog text still says "each gardener's best stage" (before D-4). | Confirm the drafts (or send changes) before building. Fix SE6's description to totals only? |
| Q-11 | SP header "Speaking · {topic}" on the boards | The Pond shows "Speaking · The Pond" (its 5 sentences mix topics); fixture pages differ from the boards by this text (S18b closed as is). | With SE2 (bed-level Speak), show the bed's topic there and "The Pond" elsewhere? |
