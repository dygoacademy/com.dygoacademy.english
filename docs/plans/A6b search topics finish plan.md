# A6b Search topics: finish it — implementation plan (for Claude Code)

Date: 2026-10-17 · Owner: Dylan · Design: canvas page "Adult · Topics", boards `AdultSearch(Vi)` (**A6b**)
Design changelog: `docs/design/garden/CHANGELOG.md`, entry "2026-10-17 — A6b Search topics: finish" (*Approved*).

## Where it stands

Built in `259e19b` (route `/topics/search`, `TopicSearchScreen`, `TopicSearchLive`) and on UAT since then. Three things are still missing against the board:

1. **"Looking for a word?" almost never shows.** `findWordInBeds()` only searches the beds whose details are already in the React Query cache (beds opened this visit). Open the app, tap search, type "envi" → no word row, though "environmental" is in Environment. The board shows it for any of the learner's beds.
2. **The topic card is the old one.** Since `d1c8402` A6 cards grow and wrap long names to 2 lines; A6b's "Your topics" card must be the same (the A6b board is now redrawn with it; `garden:diff` A6b was 1.8 % because of this).
3. **"More topics to plant" rows** don't handle long names (one line, pushes the Plant button).

Out of scope: changing what Plant does (it sows the first 5 words, `259e19b`), the A7c screen itself, iPad search.

## 1 · Backend: word search across the learner's beds

- `GET /topics/word-search?q=…` (topics controller, auth as the other routes).
  - `q` trimmed, 2–40 characters, else `400` (frontend never sends < 2).
  - Searches the words of every bed the learner sees in `GET /topics` with `kind` `mine` or `group`, plus library topics they have started (any `user_word_srs` row). Not the whole library.
  - Match on the English word (`topic_words.source_word` / `master_lexicon` headword) and on the meaning in the learner's meaning language (the same fields A7c searches), case-insensitive; Vietnamese without accents too if `unaccent` is available (check the DB; if not, plain `ilike` and note it in `QUESTIONS.md`).
  - Order: word starts with `q` → word contains `q` → meaning contains `q`; then shorter word first. Return the **first 3**: `[{ word, topic_id, topic_title, matched: 'word' | 'meaning' }]`.
  - Index check: if the query plan shows a seq scan on `topic_words` that matters, add a `lower(source_word) text_pattern_ops` index (migration). Keep it simple otherwise.
  - jest: prefix beats contains; meaning match; another learner's private bed never appears; library topic not started never appears; `q` too short → 400.

## 2 · Frontend

- `hooks/useWordSearch(q)`: React Query, key `['topics','word-search', q]`, enabled when `q.trim().length >= 2`, **debounced 250 ms**, `staleTime` 60 s, keeps the previous data while typing (`placeholderData: keepPreviousData`).
- `TopicSearchLive`: `wordHint` = first result of `useWordSearch`; while the request is in flight, fall back to today's `findWordInBeds()` on the cache (instant), so the row doesn't flicker. Hidden when there's nothing. Tap → `GARDEN_ROUTES.topicSearch(topic_id, q)` (A7c with the query filled in), as today.
- If the match is on the meaning (`matched: 'meaning'`), the row still names the English word: "Looking for a word? *environmental* is in Environment" (highlight only when the word itself matched).
- **"Your topics" card:** use the same card as A6 (`TopicRow` after `d1c8402`): `min-h` 76, name up to 2 lines with the highlight kept inside the clamp, due pill top-right on one line, meta one line.
- **"More topics to plant" rows:** title 15 px / 700, up to 2 lines then "…" (`line-clamp-2`, `min-w-0`), meta one line `truncate`, Plant button `shrink-0` and vertically centred.
- Nothing else changes (Cancel, Recent (3), empty text, Plant).

## 3 · References and tests

- References are redrawn in `docs/design/garden/reference/`: `A6b-search-topics(-vi)` (new card). `npm run garden:diff -- --only A6b-search-topics` ≤ 0.5 % EN + VI.
- vitest: the word row appears from the API result with an empty cache; shows the cache match while loading; debounce (one request for "envir" typed fast); meaning match shows the English word without highlight; long titles get the clamp on both lists.
- Backend jest as above. `tsc --noEmit`, lint.

## 4 · Done when

- On UAT, fresh page load → Topics → search → type "envi": Environment under Your topics **and** "Looking for a word? environmental is in Environment" without opening any bed first; tap → A7c with "envi" in the field. Same in VI with a Vietnamese meaning (e.g. "môi").
- `Change Log.md`; A6b row and the 2026-10-17 entry set to **Built** with the commit. Deploy UAT via `deploy/request.md`.
- One commit, after a "Design" commit for the files already in the working tree (`source/AdultSearch(Vi).dc.html`, the A6b references, the CHANGELOG entry and this plan).
