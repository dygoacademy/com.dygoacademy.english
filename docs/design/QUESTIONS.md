# Design questions for Dylan

Things in `docs/design/garden/CHANGELOG.md` that are unclear, or that differ from what is built, written down instead of guessed (CHANGELOG "How to use this file", rule 5). Newest first. When one is answered, note the answer and date here and update the changelog.

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
