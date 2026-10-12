# Pronunciation: say one word ("Stepping stones"), implementation plan (for Claude Code)

Date: 2026-10-11 · Owner: Dylan · Design: canvas page "Adult · Pronunciation"
Design changelog: `docs/design/garden/CHANGELOG.md`, entry "2026-10-11 — Pronunciation: say one word (Stepping stones)", rows P1, P2, P2b, P3, P4, and decision D-3.

> **Gate:** P1–P4 and P2b are **Approved** (Dylan, 2026-10-11). Build in the order below, one commit and one UAT deploy per part. Dylan's rule for this feature: **keep Dygo simple and clear.** When in doubt, do less and ask.

## What this is (and isn't)

- A **new, separate** feature: the learner says **one word** and sees which syllable was off. It is **not** The Pond (SP1–SP4, whole sentences), which stays as it is.
- It starts from **"Bees are waiting"** on the Topic Bed (A7, built `b40ac02`). Today a bee's mic and "Say all" open the **sentence** flow (`/sounds?word=…&harvest=1`). After this plan they open the **word** screens.
- Garden rule (D-3, changed 2026-10-11): saying the word at **80 %+** = **Pollinated**. **Visual only:** gold flower centre and tick for today. It never changes the word's stage or its next review. **Fruit (mastered) comes only from reviews.** There is no 90 % harvest any more: one rule, 80 %.

| Part | What | Design files (`docs/design/garden/`) | References |
|---|---|---|---|
| 1 | Word check on the speech server + backend endpoint + syllables | — | — |
| 2 | Screens P1, P2, P2b, P3, P4 (phone) and iP1–iP4, iP2b (iPad) | `source/PronStones(Vi).dc.html`, `PronStonesRecord(Vi)`, `PronStonesChecking(Vi)`, `PronStonesResult(Vi)`, `PronStonesNotHeard(Vi)`; iPad `iPadPron(Vi)`, `iPadPronResult(Vi)`, `iPadPronNotHeard(Vi)` | `reference/P1-say-word`, `P2-recording(-beep)`, `P3-checking`, `P4-result-retry`, `P4-result-pollinated`, `P2b-not-heard(-noisy, -other-word)`, each with `-vi`; iPad `iP1-say-word`, `iP2-recording`, `iP3-checking`, `iP4-result-retry`, `iP4-result-pollinated`, `iP2b-not-heard`, each with `-vi` |
| 3 | Wire the Bees to the word screens; 80 % rule everywhere | A7 (unchanged look) | `A7-topic-bed(-vi)` |

Rules for every part: copy spacing, sizes, colours and copy from the boards; all text in `messages/{en-US,vi-VN,zh-CN}.json` (write ZH to match); the word being learned stays English (`lang="en"`); respect `prefers-reduced-motion`; `vitest` (compare failures against HEAD, count only new ones); `tsc --noEmit`; backend `jest` for the speaking module; speech service `pytest`; `npm run garden:diff -- --only P1-say-word,P2-recording,P3-checking,P4-result-retry,P4-result-pollinated,P2b-not-heard,iP1-say-word,iP2-recording,iP3-checking,iP4-result-retry,iP4-result-pollinated,iP2b-not-heard` ≤ 0.5 % (EN + VI); `Change Log.md` entry; set each row to **Built** with the commit in the design changelog; deploy UAT by writing `deploy/request.md`.

**Vietnamese:** boards `…Vi.dc.html` and `-vi` references for every screen; the copy is also in the table below. Run `garden:diff` for EN and VI.

**iPad** (`ipad:`, 1194 × 834): two columns in a `max-width: 1060px` grid (0.9fr / 1.1fr, gap 24), like iSP1. Left: the white word card (word 64 px, IPA with the stressed part amber `#9A6E14`, meaning 17 px, Hear it / Slowly, the tip at the bottom). Right: the pond card (same stones, bigger) and under it the mic (96 px), the recording (voice bars, mic with the 4 s ring, Cancel in the header), checking, or the result / P2b buttons. Result and P2b text sit in the left card. Same logic as the phone; only the layout changes. The mic hint says "your iPad" ("Lần đầu: iPad sẽ hỏi quyền dùng micro").

---

## Part 1: word check (speech server + backend)

### Speech server (`docker/speech/app`)
New endpoint **`POST /check-word`** (form: `audio`, `word`, `ipa`), same limits, lock and logging rules as `/check` (audio in memory only, never logged).

1. **Sounds:** phoneme ids from the given IPA (`Scorer.ipa_ids`; fall back to `word_ids(word)` if `ipa` is empty). Align with `gop` as `sound_scores` does, but keep the **per-phoneme** scores.
2. **Syllables:** split the IPA into syllables with the same rule as the backend's `speaking-timings.ts` (split on `.` and before `ˈ` / `ˌ`). Map each syllable to its run of phoneme ids and average its phoneme scores, giving one 0–100 score per syllable. A syllable under **60** = `wobbly`.
3. **What it sounded like (only when cheap and clear):** on a wobbly syllable's frames, take the phoneme model's best path (argmax per frame, collapse repeats, drop blanks). If that gives a different IPA string, return it as `heard_ipa`; otherwise `null`. Don't guess.
4. **Heard word:** Whisper as in `heard_words`. If it heard exactly one word, and that word differs from `word` (UK/US spelling via `canon`), and the total is under 50, the status is `other_word`.
5. **Nothing heard:** voiced audio under 0.3 s (or Whisper hears nothing and every syllable is under 20) → `not_heard`.
6. **Total:** the mean of the phoneme scores, rounded.

Response:
```json
{ "status": "ok" | "not_heard" | "other_word",
  "total": 76, "heard_text": "mitigate",
  "syllables": [ { "ipa": "ˈmɪ", "score": 91, "wobbly": false, "heard_ipa": null },
                 { "ipa": "tɪ",  "score": 48, "wobbly": true,  "heard_ipa": "taɪ" },
                 { "ipa": "ɡeɪt","score": 88, "wobbly": false, "heard_ipa": null } ] }
```
Tests: the syllable split, the phoneme-to-syllable mapping, the three statuses (use short WAV fixtures if the repo has them, else unit-test the pure functions).

### Backend (`speaking` module)
- **`POST /speaking/word-check`** (multipart: `audio`, `topic_word_id`, `accent` UK/US). Use the **same queue, rate limit and polling** as `POST /speaking/check` (`SpeechCheckService`, `GET /speaking/check/:id`); add a `kind: 'word'` to the job. The backend sends the word and its IPA for the accent (`ipa_uk` / `ipa_us`) to `/check-word`.
- The result adds **spelling syllables** (see below) next to the server's IPA syllables, and `passed = status === 'ok' && total >= 80`.
- **When passed:** insert into `speaking_harvests` (existing table, once a day per word) so the Bees card shows it as pollinated today. Never touch SRS. Nothing else is stored, and the audio is never kept.
- **Spelling syllables** (`syllables: [{ text: 'mi', stressed: true }, { text: 'ti' }, { text: 'gate' }]`): split the spelling with English hyphenation patterns (e.g. the `hyphen` package, en-us). If the count equals the IPA syllable count, use it; otherwise show the IPA syllables instead. The stressed one comes from the IPA's `ˈ`. Shown in capitals on screen (MI · ti · gate). Add `syllables` to `GET /speaking/harvest` rows and `GET /speaking/words/:topicWordId` too.
- Rename `HARVEST_MIN_SCORE` (90) to `POLLINATE_MIN_SCORE = 80`.
- Tests: passed / not passed / not heard; pollinated row written once a day; the syllable split (`mitigate` → mi·ti·gate, stress 1; `deforestation`, `ecosystem`; a mismatch falls back to IPA).

---

## Part 2: the screens (P1–P4, P2b)

**Route:** `/sounds/word?words=<topicWordId>[,<id>…]&back=<bed href>` (new `GARDEN_ROUTES.pronounce({ words, back })`). At most 3 words, in order: "Bee 1 of 3". The data for each word comes from `GET /speaking/words/:topicWordId` (word, IPA, meaning, audio, timings, syllables).

### P1 · Say the word (`PronStones`)
- Word (Fraunces 44), IPA · meaning in the learner's language; pond card: one stone per syllable, the **stressed one big and gold**, the others smaller; the bee above the first stone; the dashed hop path; "Big stone = loud part".
- **Hear it**: the native word. Use the word's `audio_url` if there is one, else play the target word's span of the sentence clip (`timings_{uk,us}.words[target_index]` start/end). **Slowly**: the same clip at `playbackRate = 0.7` (`preservesPitch = true`).
- Tip line: "Hop across the stones: land hard on {stressed}." Mic button (84 px clay), "Tap, then say just the word", "First time: your phone asks for the microphone".
- Mic denied: reuse what The Pond does today.

### P2 · Recording (`PronStonesRecord`)
- Tap the mic → **short beep + vibration** (`lib/speaking/beep.ts`), then record. **No 3·2·1 countdown.** Use `lib/speaking/audio.ts` (`requestMic`, the recorder, `encodeWav`).
- Header: Cancel (back to P1, nothing sent) · "● Recording" · Bee n of 3.
- **Stones light up left to right while the learner speaks.** This is a live hint, not the score: once voice is detected, light stone *k* when the voiced time passes *k/n* of the native word's duration (from the timings; default 0.25 s per syllable). Small splash ring under the lit stone; the bee hops to it.
- "Your voice" level bars (live RMS).
- **Stop:** about **1 s of silence after voice**, or **4 s max** (the ring around the mic counts down 4 s), or tap Stop. Then → P3.
- **Too quiet:** less than 0.3 s of voice → P2b "quiet" without calling the server. **Too noisy:** if the level before the beep is already high (pick a threshold from the existing envelope code) and no clear voice onset → P2b "noisy".

### P3 · Checking (`PronStonesChecking`)
- Send the WAV to `POST /speaking/word-check`, then poll as SP3 does. Stones shimmer; "Got it. Checking each stone…"; three dots + "Usually 1–2 seconds".
- **Hear mine** (the local recording, in memory only) and **Hear native** work during the wait.
- Server failed or busy: the same inline card as SP3 ("Check again" / "Record again").

### P4 · Result (`PronStonesResult`)
- **Not passed (retry):** badge "Almost · {ok} of {n} stones"; title "One wobbly stone" / "{n} wobbly stones". In the pond, the wobbly stone(s) turn orange and tilt; the others turn green. One card for the **first** wobbly syllable: big syllable text + "sounded like /{heard_ipa}/" (or "wasn't clear" when `heard_ipa` is null) + "Try it like the native: **/{ipa}/**"; buttons **Hear "{syllable}"** (native syllable span from the timings' syllables; else the whole word) and **Hear mine**. **Try again** → P2 directly. Link **Next bee** (or **Back to the bed** on the last word).
- **Passed (80 %+):** badge "Pollinated · {n} of {n} stones"; "Clean crossing!"; all stones green, the bee flies off (one 2.4 s animation, off with reduced motion); card "{word} is pollinated. It's on its way to fruit."; **Next bee: {next word}** or, on the last word, **Back to the bed**.
- No score number on screen (keep it simple). The stones tell the story.

### P2b · Couldn't hear you (`PronStonesNotHeard`)
Three reasons, one layout: the dark stones, the bee with a "?", title + body, two numbered tips, "This try doesn't count. Nothing is lost.", **Try again** (→ P2), link "Hear the word first" (→ P1).
- `quiet`: client side (P2). `noisy`: client side (P2). `other_word`: server status, with `heard_text`.

### Shared
- The bee is the **same drawing** as the Bees card on A7 (`components/garden/Bee.tsx`); reuse it, don't redraw.
- Pond water runs edge to edge inside the rounded card (water `#1F3E33` + a `#3A5E4F` wave line), as on the boards.
- Animations: stone light-up, splash, bee hop, shimmer, the pass fly-off. All off with `prefers-reduced-motion`.
- **Fixtures + diff:** add P* and iP* (EN + VI) to `ReferenceScreen.tsx`, `fixtures.ts` and `garden-diff.mjs` NAMES (`mitigate`, syllables MI · ti · gate, `ti` wobbly with heard /taɪ/; other_word heard "medicate"; next word "deforestation").
- **Tests:** stones from syllables (stressed one big); P2 auto-stop (silence, 4 s max, tap); quiet → P2b without a server call; P3 → P4 retry / pass from a mocked check; other_word → P2b; Try again → P2; Next bee / Back to the bed on the last word; reduced motion.

### Messages (`screens.pronounce`), EN · VI
| key | EN | VI |
|---|---|---|
| eyebrow | Pronunciation | Phát âm |
| beeCount | Bee {n} of {total} | Ong {n}/{total} |
| bigStone | Big stone = loud part | Đá to = phần đọc mạnh |
| hearIt / slowly | Hear it / Slowly | Nghe / Nghe chậm |
| hopTip | Hop across the stones: land hard on {stressed}. | Nhảy qua các hòn đá: nhấn mạnh ở {stressed}. |
| tapToSay | Tap, then say just the word | Chạm, rồi chỉ đọc từ này |
| micFirstTime | First time: your phone asks for the microphone (iPad: your iPad asks…) | Lần đầu: điện thoại sẽ hỏi quyền dùng micro (iPad: Lần đầu: iPad sẽ hỏi quyền dùng micro) |
| recording / cancel | Recording / Cancel | Đang ghi âm / Hủy |
| beep | Beep! Say it now | Bíp! Đọc ngay |
| sayNow | Say "{word}" now | Đọc "{word}" ngay |
| keepGoing / listening | Keep going… / Listening… | Tiếp tục… / Đang nghe… |
| yourVoice | Your voice | Giọng của bạn |
| autoStop | Stops by itself when you finish · or tap to stop | Tự dừng khi bạn đọc xong · hoặc chạm để dừng |
| checking | Got it. Checking each stone… | Đã nghe. Đang kiểm tra từng hòn đá… |
| usually | Usually 1–2 seconds | Thường mất 1–2 giây |
| hearMine / hearNative | Hear mine / Hear native | Giọng của tôi / Giọng bản xứ |
| almost | Almost · {ok} of {n} stones | Gần được · {ok}/{n} hòn đá |
| wobbly | {count, plural, one {One wobbly stone} other {# wobbly stones}} | {count, plural, one {Một hòn đá còn chênh vênh} other {# hòn đá còn chênh vênh}} |
| soundedLike / notClear | sounded like /{ipa}/ / wasn't clear | nghe giống /{ipa}/ / chưa rõ |
| tryLike | Try it like the native: /{ipa}/ | Đọc theo giọng bản xứ: /{ipa}/ |
| hearSyllable | Hear "{syllable}" | Nghe "{syllable}" |
| tryAgain / nextBee | Try again / Next bee | Thử lại / Ong tiếp theo |
| pollinatedBadge | Pollinated · {n} of {n} stones | Đã thụ phấn · {n}/{n} hòn đá |
| cleanCrossing | Clean crossing! | Qua suối gọn gàng! |
| pollinatedBody | {word} is pollinated. It's on its way to fruit. | {word} đã được thụ phấn, đang trên đường kết trái. |
| nextBeeWord / backToBed | Next bee: {word} / Back to the bed | Ong tiếp theo: {word} / Về luống |
| quietTitle / quietBody | We couldn't hear you / The bee heard almost nothing. | Chưa nghe rõ bạn / Ong gần như không nghe thấy gì. |
| quietTip1 / quietTip2 | Hold the phone about a hand away from your mouth (iPad: Hold the iPad about an arm's length away, facing you) / Speak a little louder than normal | Cầm điện thoại cách miệng khoảng một bàn tay (iPad: Đặt iPad cách bạn khoảng một cánh tay, quay về phía bạn) / Nói to hơn bình thường một chút |
| noisyTitle / noisyBody | Too noisy to hear / There was a lot of sound around you. | Ồn quá, khó nghe / Xung quanh bạn có nhiều tiếng ồn. |
| noisyTip1 / noisyTip2 | Move somewhere a bit quieter / Speak close to the phone, then wait for the beep (iPad: Speak toward the iPad, then wait for the beep) | Chuyển sang chỗ yên tĩnh hơn / Nói gần điện thoại và chờ tiếng bíp (iPad: Nói hướng về iPad và chờ tiếng bíp) |
| otherTitle / otherBody | That sounded like another word / We heard "{heard}". Say just "{word}". | Nghe giống một từ khác / Ong nghe thành "{heard}". Chỉ đọc "{word}" thôi. |
| otherTip1 / otherTip2 | Tap Hear it and copy the native speaker / Start with the big stone: {stressed} | Chạm Nghe và đọc theo người bản xứ / Bắt đầu từ hòn đá to: {stressed} |
| doesntCount | This try doesn't count. Nothing is lost. | Lần này không tính. Bạn không mất gì. |
| hearFirst | Hear the word first | Nghe từ trước đã |

("Hear native" follows open decision D-2 on "native" wording; use whatever The Pond uses today.)

---

## Part 3: wire the Bees; one 80 % rule

- `TopicBedLive.tsx`: a bee row's mic → `GARDEN_ROUTES.pronounce({ words: [id], back: bedHref })`; **Say all** → `pronounce({ words: waitingIds (max 3), back })`.
- Bee rows: show the **spelling syllables** with the stressed one in capitals (MI · ti · gate) instead of the IPA line (this was "v2" in the Bees plan; Part 1 now provides it).
- The sentence flow no longer pollinates: drop `harvest` from `GARDEN_ROUTES.speak` callers and the `harvest: true` path in `POST /speaking/attempts` (keep the column/table; only the word check writes `speaking_harvests` now). The Pond stays exactly as it is otherwise.
- Copy on A7 is unchanged ("Say it to pollinate", "Pollinated · on its way to fruit").
- Tests: mic and Say all hrefs; pollinated row after a passed word check; the sentence flow never writes `speaking_harvests`.

## Out of scope (ask Dylan first)
Garden-wide bee schedule (3 bees across all beds, 1–2 new a day, leave after 3 days); a session "done" screen; score numbers; mouth pictures; any change to SRS or to The Pond.
