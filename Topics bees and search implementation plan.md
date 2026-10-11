# Topics: pronunciation bees + two searches — implementation plan (for Claude Code)

Date: 2026-10-11 · Owner: Dylan · Design: canvas page "Adult · Topics"
Design changelog: `docs/design/garden/CHANGELOG.md`, entry "2026-10-11 — Topics: pronunciation bees, two searches, Profile tab" and rows A6b, A7, A7c.

> **Gate:** all three parts are **Approved** (Dylan, 2026-10-11). Build a part only after Dylan marks it **Approved** in the changelog. The parts are independent; build them in this order, one commit (and one UAT deploy) each.

| Part | Screen | Design files (`docs/design/garden/`) | References |
|---|---|---|---|
| 1 | A7 / iA7 Bees (replaces "Ready to harvest") | `source/AdultTopicDetail(Vi).dc.html`, `source/iPadTopicDetail(Vi).dc.html` | `reference/A7-topic-bed(-vi)`, `A7-topic-bed-filter-sprouts(-vi)` |
| 2 | A7c Search words in a topic | `source/TopicWordSearch(Vi).dc.html` | `reference/A7c-word-search(-vi)` |
| 3 | A6b Search topics | `source/AdultSearch(Vi).dc.html` | `reference/A6b-search-topics(-vi)` |

Rules for every part: copy spacing, sizes, colours and copy from the boards; all text in `messages/{en-US,vi-VN,zh-CN}.json` (write ZH to match); words being learned stay English (`lang="en"`); respect `prefers-reduced-motion`; run `vitest src/components/garden` and compare against HEAD (count only new failures); `tsc --noEmit`; `npm run garden:diff -- --only <names>` ≤ 0.5 % EN + VI; `Change Log.md` entry; set the row to **Built** with the commit in the design changelog; deploy UAT by writing `deploy/request.md`.

---

## Part 1 — "Bees are waiting" on the Topic Bed (A7, iA7)

**Today:** `TopicBedScreen.tsx` renders "Ready to harvest" (SE5) from `harvest: { count, words: HarvestWord[] }`; data from `GET /speaking/harvest?topic_id=` (`useSpeakingHarvest`, `HarvestLive` / `TopicBedLive`); each mic opens `GARDEN_ROUTES.speak({ word, harvest: true })`; a 90 %+ attempt with `harvest: true` sets `harvested_score / harvested_at` (visual only, D-3).

**Target (same data, same flow, new look and rules):**
- Card title "Bees are waiting" with a small bee; header link **"Say all"** → the speaking flow for all waiting words of this topic in a row (`GARDEN_ROUTES.speak({ topic, harvest: true })` or a list of words — add a `words` param if needed).
- Intro line: "{n} flowers want to be heard. Say each word to pollinate it." / 1 / 0 ("All flowers pollinated today. New bees come tomorrow.").
- Rows: ripe **Flower** words with a speaking item that are not harvested yet = **waiting** (flower + hovering bee, word, syllables, "Say it to pollinate", mic). Words harvested **today** stay as **pollinated** rows (pale green, gold flower centre, green tick, "Pollinated · on its way to fruit") until tomorrow, then leave the card. Older harvested words don't show.
- **Bee limit (v1, frontend only):** show at most **3 waiting** rows per topic, oldest Flower first. The garden-wide cap (3 bees across all topics, 1–2 new a day, a bee leaves after 3 days) needs backend state — **v2**, see below.
- **Syllables:** v1 shows the word's IPA (`ipa_uk`, e.g. /ˈmɪtɪɡeɪt/) in the syllable line. Syllables with the stressed one in capitals (MI · ti · gate) need a `syllables` field from word enrichment — v2.
- Hide the card when there are no waiting and no pollinated-today words.
- iPad (`ipad:`): same card under Water / Quiz / Add word, full-width rows.
- Animations: bee hover (1.6 s loop) and the pollinated "spark" (0.5 s once); both off with reduced motion.

**Messages** (`screens.bed.harvest` → rename keys or add `screens.bed.bees`):
- title "Bees are waiting" · VI "Ong đang chờ"; sayAll "Say all" · VI "Nói hết"
- intro "{count, plural, one {1 flower wants to be heard. Say it to pollinate it.} other {# flowers want to be heard. Say each word to pollinate it.}}" · VI "{count} bông hoa muốn được nghe. Đọc to từng từ để thụ phấn." (1: "1 bông hoa muốn được nghe. Đọc to để thụ phấn.")
- allDone "All flowers pollinated today. New bees come tomorrow." · VI "Hôm nay đã thụ phấn hết. Ngày mai ong sẽ quay lại."
- waiting "Say it to pollinate" · VI "Đọc to để thụ phấn"; pollinated "Pollinated · on its way to fruit" · VI "Đã thụ phấn · sắp kết trái"; say (aria) "Say {word} to pollinate" · VI "Nói {word} để thụ phấn"
- In the speaking flow's harvest result, use "Pollinated" wording instead of "Picked / harvested".

**Tests:** waiting / pollinated / hidden states, max 3 waiting, "Say all" href, reduced motion class, iPad layout snapshot. `garden:diff -- --only A7-topic-bed,A7-topic-bed-filter-sprouts`.

**v2 (separate ticket, needs Dylan's go):** backend `speaking_bees` (user_id, topic_word_id, arrived_at, left_at) + daily job (≤ 3 open bees per user, 1–2 new a day, leave after 3 days unpicked); `GET /speaking/bees`; home garden "A bee is waiting at *word*" line; `syllables` from enrichment.

---

## Part 2 — Search words in a topic (A7c)

- **Entry:** a 44 px search button in the A7 header, left of "⋯" (aria "Search words in {topic}"). iPad: same button in iA7's header.
- **Route:** `/topics/[id]/search` (or a full-screen sheet over A7 — pick what matches the app's other sheets; the board is a full screen with Cancel).
- **Field:** autofocus, placeholder "Search {topic}" · VI "Tìm trong {topic}"; Cancel → back to A7. Hint under it: "Search by English word or Vietnamese meaning" · VI "Tìm bằng từ tiếng Anh hoặc nghĩa tiếng Việt".
- **Matching (client side, no new endpoint):** the topic's words are already loaded by `TopicBedLive`; match case- and accent-insensitive (`normalize('NFD')` + strip marks) on the English word **and** the meaning in the learner's language; highlight the matched part (gold `#F2D28B` background) in whichever matched.
- **Results:** section "In {topic} · {n}" + "Tap to open the word"; the same word rows as A7 (stage icon, word, meaning, next watering). Tap → the word (same as tapping a row on A7).
- **Not found / extra:** section "Not in {topic} yet" with one row: the typed word, **Plant here** → `AddWordSheet` for this topic with the word filled in (add an optional `initialWord` prop). The board shows a dictionary line (part of speech · level · meaning); v1 may show just the typed word if no lookup is cheap — `GET /words/guest-lookup?word=` returns cached lexicon entries and can fill it when it hits.
- **Recent in this topic:** last 3 searches for this topic in `localStorage` (try/catch).
- **Messages** (`screens.bed.search`): placeholder, hint, inTopic "In {topic} · {count}", tapHint, notInTopic "Not in {topic} yet" · VI "Chưa có trong {topic}", plantHere "Plant here" · VI "Gieo vào đây", recent "Recent in this topic" · VI "Gần đây trong luống", cancel.
- **Fixture + diff:** `A7c-word-search` (query "de": deteriorate, deforestation; plant "desertification") and VI (query "giảm": mitigate, deteriorate; plant "reduce"); add to `ReferenceScreen.tsx`, `fixtures.ts`, `garden-diff.mjs` NAMES.
- **Tests:** English match, Vietnamese meaning match with and without accents, highlight, Plant here opens the sheet with the word, Cancel.

---

## Part 3 — Search topics (A6b)

**Today:** `TopicsLive` opens `SearchSheet` (finds beds by name). The design changelog's old A6b (word search) was never built.

**Target:**
- Full-screen search (or keep the sheet, full height) from the Topics search button (aria "Search topics" · VI "Tìm chủ đề").
- Match topic title, collection title and CEFR range; highlight matched letters.
- **Your topics · {n}:** the same topic cards as A6 (tree tile, due badge, stage bar) → A7.
- **More topics to plant · {n}** ("From the library"): library topics the learner hasn't planted, dashed seed tile + **Plant** (POST `/topics/:id/clone`, then open it). If `GET /topics` doesn't return unplanted library topics, hide this section and note it in the Change Log (needs a catalogue endpoint).
- **Word hint row** (last): "Looking for a word? *{word}* is in **{topic}**" → A7c for that topic with the query. Needs a cross-topic word lookup; v1 can search the words already cached by React Query for the learner's beds, and hide the row when none are loaded. A small `GET /words/search?q=` (learner's own words, max 1 result) is the clean v2.
- Empty: "No topics called '{q}'" + Browse all topics. Recent searches (localStorage).
- **Messages** (`screens.topics.search`): placeholder "Search topics" · VI "Tìm chủ đề", yours "Your topics · {count}" · VI "Chủ đề của bạn · {count}", more "More topics to plant · {count}" · VI "Chủ đề khác để gieo · {count}", fromLibrary "From the library" · VI "Từ thư viện", plant "Plant" · VI "Gieo", wordHint "Looking for a word? <b>{word}</b> is in <b>{topic}</b>" · VI "Tìm một từ? <b>{word}</b> nằm trong <b>{topic}</b>", empty, recent "Recent" · VI "Gần đây".
- **Fixture + diff:** `A6b-search-topics` (query "en") and VI (query "tr").
- **Tests:** matching on title / collection / level, sections, Plant calls clone, word hint link, empty state.

---

## Out of scope

- The canvas renamed the tab to "Profile" — the site already says "Profile"; nothing to build.
- iPad search screens (no iPad boards for A6b / A7c yet; the iPad header button can open the phone layout centred).
- iA7 has no "Speak · 5 sentences" row (pre-existing gap; ask Dylan).
