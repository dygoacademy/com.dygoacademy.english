# Dygo Word Garden — Design changelog & screen inventory

Location in the repo: `docs/design/CHANGELOG.md`
Design source of truth: the **Dygo Word Garden** design canvas (owner: Dylan).
Last updated: **2026-10-11**

---

## How to use this file

**Dylan (design owner)**
- Add a dated entry under [Changelog](#3-changelog) every time a screen is added, changed or removed on the canvas.
- Give every change a status: `For approval` → `Approved` → (Claude Code sets) `Built`.
- Never reuse or renumber a screen ID. Retired screens move to [Removed screens](#24-removed-screens).

**Claude Code (builder)**
1. Read this file before any UI task. Build only entries marked **Approved**; never build `For approval` or `Draft`.
2. Match screens by **ID** (A1, GR3, SP2…), not by title — titles may change.
3. Every screen exists in English and Vietnamese (`…Vi.dc.html`). Build both; all strings go through `en.json` / `vi.json`.
4. When an entry is built, set its status to `Built`, and fill in the **Build status** column in [§2](#2-screen-inventory) with the PR/commit.
5. If the code and this file disagree, this file wins for UI/UX. If something here is unclear or impossible, don't guess: add it to `docs/design/QUESTIONS.md` and continue with other work.
6. Design files (`*.dc.html`) are HTML templates for reference: copy spacing, sizes, colors and copy from them. Demo data and fake waveforms inside them are not real data.

---

## 1. Design system (quick reference)

| Item | Value |
|---|---|
| Fonts | **Fraunces** (words being learned, headings, sentences) · **DM Sans** (UI). Vietnamese: `'DM Sans', 'Be Vietnam Pro', sans-serif` (DM Sans has no Vietnamese letters) |
| Page background | `#F4F1EA` (cream) |
| Card | `#FFFFFF`, border `1px #E3DDD0`, radius 20–26 px |
| Primary dark | `#24463A` (forest) |
| Primary action | `#B4552E` (clay) with bottom shadow `0 4px 0 #7E3719` |
| Text | `#1C2B24`, secondary `#5E6A62` |
| Greens | `#3E7F5A`, `#7FA487`, `#9CC39A`, `#B7D6AE`, `#DDE7DA` |
| Gold / warning (never red for mistakes) | `#E0B04A`, `#F2D28B`, bg `#FBF4E4`, border `#EFD9A6`, text `#6B5215` |
| Water / info | `#4A8FBF`, `#8EC5E8`, bg `#E3F0F8`, text `#1D4A68` |
| Touch targets | ≥ 44 pt |
| Phone frame | 390 × 844 (iPhone), 5-tab bottom nav: Garden · Missions · Topics · Groups · Me |
| iPad frame | 1194 × 834 (11-inch, landscape). Sidebar (264 pt) instead of tab bar; split views; sheets centred; popovers for small menus |
| Word stages | Seed (new) · Sprout (learning) · Flower (review) · Fruit (mastered); Wilting = overdue/leech |
| Vietnamese glossary | water = tưới · due = cần ôn · ripe = đã chín · wilting = đang héo · Golden Bloom = Hoa Vàng · rain day = ngày mưa · garden = vườn · bed = luống. Ratings: Học lại / Khó / Tốt / Dễ |
| Words being learned | Always stay in English (`lang="en"`), in every language |

---

## 2. Screen inventory

Status values: **Approved** (ready to build) · **For approval** (design still under review) · **Built** (set by Claude Code).
Every row has an English file and a Vietnamese twin (`…Vi.dc.html`) unless noted.

### 2.1 Phone (iPhone)

#### Authentication — page "Adult · Authentication"
| ID | Screen | File | Status | What's on it | Goes to | Build status |
|---|---|---|---|---|---|---|
| AU1 | Sign in | `AdultLogin` | Built | Email + password (Supabase `signInWithPassword`), no Google sign-in (blocked in China). Language chip top-right sets `dygo_locale` before sign-in. Show/Hide password, error state. | AU2, AU4, A1 | UI-A A-2 `a1b8332` (pixel fix `7068a9e`) |
| AU2 | Create account | `AdultRegister` | Built | Name, email, password (`signUp`); name is saved to the profile so the garden greets people by name. Terms / Privacy line. | A1, AU1 | UI-A A-3 `38665d9` |
| AU3 | Create account from an invite | `AdultRegisterInvite` | Built | Invite banner (from `?next=/join/…`), then straight into the group garden. | GR2, AU1 | UI-A A-3 `38665d9` |
| AU4 | Reset password | `AdultForgot` | Built | `resetPasswordForEmail` + set-new-password page. Sent state. | AU1 | UI-A A-4 `7a5e342` |
| AU5 | Set a new password | `AuthNewPassword` | For approval | Page the reset email opens (`updateUser({password})`). Password + confirm; strength shown as a plant (seed → sprout → flower → fruit tree) as rules are met (8+ chars, a number, not your email). States: form, **expired link** (send a fresh link), done ("Password changed" → Sign in). Design tweak `state` = form / expired. | AU1 | Not built |

#### Onboarding — page "Adult · Onboarding" (after AU2 Create account)
| ID | Screen | File | Status | What's on it | Goes to | Build status |
|---|---|---|---|---|---|---|
| OB1 | Your level | `OnboardLevel` | For approval | 4-step plant progress header (seed → fruit tree, one stage per step). CEFR picked by "I can…" sentences (A2–C1), not letters. "Not sure? 2-min level check" link (check itself not designed, D-7). Skip → B1. | OB2 | Not built |
| OB2 | Target band | `OnboardGoal` | For approval | IELTS / PTE / just for life; target band; decides which words ripen first. | OB3 | Not built |
| OB3 | First topic | `OnboardBed` | For approval | Topics as seed packets; the one you pick becomes the first bed in A6. | OB4 | Not built |
| OB4 | Reminder time | `OnboardReminder` | For approval | Drag the sun along a morning → night arc; presets. Asks the OS for notifications only after a time is chosen. Skip allowed. | OB5 | Not built |
| OB5 | Garden ready | `OnboardReady` | For approval | First seeds planted (animation), summary of the 4 choices (all editable in Me A8b–A8d), "Water your first words". | A1 | Not built |

#### Adult core — pages "Adult · Garden" (A1, A5), "Adult · Review" (A2, A3), "Adult · Missions" (A4), "Adult · Topics" (A6, A7), "Adult · Me" (A8)
| ID | Screen | File | Status | What's on it | Goes to | Build status |
|---|---|---|---|---|---|---|
| A1 | Today's Garden (Home) | `AdultHome` | Built | Greeting + streak. Garden card (every word as a plant, counts: thirsty / ripe / wilting). **3 daily missions** (review due, learn new, 1 quiz) → finishing all 3 grows the **Golden Bloom**. **2026-10-10 (Option D, Approved):** no big button under the card; the missions card opens with **Next up** (first open mission, its own button, e.g. "Water 3 thirsty words · Start watering →") and a **Then** list (other missions, each opens its activity; done rows plain, struck through). "Tomorrow 7:30 · N words ripen". **Speaking mission (2026-10-07, merged from SE1):** 3rd mission can be "Say 3 ripe words · 2 min" (clay mic row) → SP1; still counts to Golden Bloom. | A2, tabs | UI-4 `4b701fd`, `6e7eb53`; iPad home `48912ed`; Next up + Then (Option D) `b6725e6` |
| A1b | All watered (nothing due) | `AdultAllWatered` | Built | Today's Garden when nothing is due **and** today's missions are all done: sunny full garden "All watered today · Nothing is thirsty. Your garden is resting.", Golden Bloom card "3 of 3 missions · Golden Bloom grown" + next ripening, "Want a little more?" list (Plant 5 new words from a bed · Say 3 sentences · Quiz a bed). | A1 extras, tabs | Built `e8b0d78` (EN / VI / ZH; plan: `A1b all watered implementation plan.md`) |
| A2 | Watering (Review) | `AdultReview` | Built | Flashcard: word (Fraunces), IPA, CEFR, topic, meaning (English; Vietnamese meaning first when app language is vi), example, synonyms. 4 ratings with next interval: Again / Hard / Good / Easy. Vine progress = mission progress. | A3, A1 | UI-4; keyboard shortcuts U7-3 `51b6180`. Phase 13 "Say this one?" added S11 `bc38bff`, removed 2026-10-06 `0e47e01` |
| A3 | Mission Complete | `AdultBloom` | Built | Bloom animation, stats, streak +1, "1 mission left for Golden Bloom" with a 3-min button, reminder toggle for when words ripen. | A1, A2 | UI-4 `6e7eb53`; reminder switch UI-6 U6-7b `c96515a` |
| A4 | Weekly Harvest | `AdultMissions` | Built | 7 day-plants (0–3 missions each), full week unlocks a seed pack, Road to Band 7 (mastered / target), rain barrel (streak freezes), study-group card → GR2. | GR2, tabs | UI-6. Phase 13 Sound Garden card added S10 `1968f24`, removed 2026-10-06 `0e47e01` |
| A5 | Welcome Back | `AdultComeback` | Built | No guilt: streak freeze kept the streak; wilting = most overdue only; "Quick revive, 5 min"; escape hatch "Water all 42". | A2, tabs | UI-6 |
| A5b | Welcome Back · nothing wilting | `AdultComebackStart` | Built | A5 when 0 words are wilting (the common case today): card "Start small · Water the 10 thirstiest words first" → **Quick start** (10 words · about 4 min, only the 10 most overdue) + "Water all 45 instead". ≤10 thirsty: "Water your N thirsty words" / Start watering, no second link. Nothing due after missed days → show A1 / A1b, not A5. Minutes ≈ 25 s a word. | A2, tabs | Built `7c73926` (EN / VI / ZH; plan: `A5 welcome back implementation plan.md`) |
| A6 | Topics (Beds) | `AdultTopics` | Built | Each topic = a garden bed: stage icon, fruit/flower/sprout bar, due badge, locked seed pack. Filters: All / IELTS Academic / Mine. | A7, tabs | UI-5 (wrap-up `58ab14f`) |
| A6b | Search topics | `AdultSearch` | Approved | **Redesigned 2026-10-11:** searches topics only (name, collection, level; matched letters highlighted). "Your topics" = topic cards like A6 → A7; "More topics to plant" = library topics with Plant; last row when a word matches: "Looking for a word? *x* is in Topic" → A7c. Recent searches. | A7, A7c | Built `259e19b` |
| A6c | No topics yet | `AdultTopicsEmpty` | For approval | Empty bed field + 3 suggested seed packets and "Browse all topics". | A7 | Not built |
| A7 | Topic Bed | `AdultTopicDetail` | Built | 4 stage tiles (New / Learning / Review / Mastered, tap to filter), words sorted by next due, wilting = leech. Water N due, Quiz, + Add word. **Speaking (2026-10-07, merged from SE2 + SE5):** full-width "Speak · 5 sentences from this bed" row under Water / Quiz / + → SP1; "Ready to harvest" card above the word list (ripe flowers, each with a mic; Fruit at 90%+, D-3). **2026-10-11 (Approved): "Ready to harvest" becomes "Bees are waiting"** (same place, one list: flower + bee, word, syllables with the stress, mic; pollinated = gold centre + tick, "Pollinated · on its way to fruit"; "Say all"), and a search button in the header → A7c. **2026-10-11 (Approved): a bee's mic and "Say all" open the word screens P1 (say one word), not SP1;** rows show the syllables (MI · ti · gate). | A2, Q1, A6 | UI-5 (wrap-up `58ab14f`); Quiz + leech drill U5-6 `5f016d7`; Bees `b40ac02`; search button `dd973a9` |
| A7b | Add word | `AdultAddWord` | For approval | Bottom sheet from + on A7. Type a word → meaning + IPA filled in; pick a bed (chips); Plant → seed drops into the bed (planted state). | A7 | Not built |
| A7c | Search words in a topic | `TopicWordSearch` | Built | From the new search button in the A7 header. Only this topic's words; matches the English word **or** the Vietnamese meaning. Results = A7 word rows (stage, next watering). "Not in this topic yet" → Plant here (Add word with the word filled in). Cancel → A7. | A7, A7b | Built `dd973a9` (plan: `Topics bees and search implementation plan.md`) |
| A8 | Me | `AdultMe` | Built | Garden calendar (16 weeks), keepsakes, settings (daily goal → A8b, reminder time → A8c, meaning language → A8d; links added 2026-10-07), Family → kid's garden. Gear → Account sheet (who's signed in + Sign out). | Kids, AU1, tabs | UI-6; Account sheet SO-1 `e8fea77` |
| A8b | Daily goal | `AdultDailyGoal` | For approval | Three pots: Light / Steady / Intense (words + minutes a day), minutes per week, when your target band ripens **[ETA]**. | A8 | Not built |
| A8c | Reminder time | `AdultReminder` | For approval | Master toggle, sun arc (same as OB4), presets, smart time, days of week, push / email, quiet hours. | A8 | Not built |
| A8d | Meaning language | `AdultMeaningLang` | For approval | English only / Tiếng Việt / 中文 (coming soon); "Recall first" toggle hides the translation until tapped; live card preview. | A8 | Not built |

#### Groups — page "Adult · Groups"
| ID | Screen | File | Status | What's on it | Goes to | Build status |
|---|---|---|---|---|---|---|
| GR1 | Shared Gardens | `AdultGroups` | Built | Group list with your role and your due words in shared beds; rain-day banner; Start a garden; Join with a link. | GR2, GR6, GR7 | UI-G (2) `f064042`, live (5) `92e86bb`; rain day banner RD-4 `97ad9c1` |
| GR1b | Not in any group | `AdultGroupsEmpty` | For approval | Empty Groups tab: shared-garden illustration, Join with a code / link, Start a garden. Assumes the Groups tab stays visible for learners with no group (D-6). | GR6, GR7 | Not built |
| GR2 | Group Garden | `AdultGroupGarden` | Built | Group totals only (never one person's progress), shared beds → A7, gardener avatars + Invite, admin gear → GR3/GR4. | A7, GR3, GR5 | UI-G (2) `f064042`, live (5) `92e86bb` |
| GR3 | Tricky Patches + Rain Day | `AdultGroupTricky` | Built | Most-missed words (totals only); Call a rain day: words per gardener, Start rain day → sent state. **Echo challenge (2026-10-07, merged from SE6):** card between the tricky list (now top 2) and Rain day; Say it → SP1. Totals only (D-4). | GR2, GR4 | UI-G (2) `f064042`; rain day RD-1–RD-4 (`97ad9c1`) |
| GR4 | Gardeners & Roles | `AdultGroupRoster` | Built | Roster, role menu (Admin / Editor / Viewer), active invite links → GR5. | GR5 | UI-G (2) `f064042` |
| GR5 | Invite sheet | `AdultGroupInvite` | Built | Role, expiry, max uses; token shown once → copy/share. | GR4 | UI-G (2) `f064042` |
| GR6 | Join a Garden | `AdultGroupJoin` | Built | `/join/[token]`: group preview, "your own progress stays private". | GR2, A1 | UI-G (2) `f064042` |
| GR7 | Start a Garden | `AdultGroupCreate` | Built | Name, about, open-garden switch; creator becomes admin. | GR2, GR1 | UI-G (2) `f064042` |

#### Quiz — page "Adult · Quiz"
| ID | Screen | File | Status | What's on it | Goes to | Build status |
|---|---|---|---|---|---|---|
| Q1 | Choose the word | `AdultQuiz` | Built | From A7 Quiz. Header like Review (Close, "Quiz · topic", count, vine). Sentence with a gap pill, 4 options. | Q2/Q3, A7 | UI-5 QZ (pixel diff 16/16 pass, `f034540`) |
| Q2 | Right answer | `AdultQuizRight` | Built | Green check, word · IPA, example. | next | UI-5 QZ `f034540` |
| Q3 | Not quite | `AdultQuizWrong` | Built | Gold "Your pick" (never a red ✕), meaning, "comes back in your next watering". | next | UI-5 QZ `f034540` |
| Q4 | Fill in the blank + hint | `AdultQuizCloze` | Built | Typed answer, "Need a hint?" (IPA + definition), Check dimmed until typed. | next | UI-5 QZ `f034540` |
| Q5 | Listen and spell | `AdultQuizListen` | Built | Big play button, instruction in the app language. | next | UI-5 QZ `f034540` |
| Q6 | Results, words need water | `AdultQuizResult` | Built | Watering-can art, Right / Need water tiles, missed words card, Drill tricky words, Back to bed. | Q1, A7 | UI-5 QZ-2 `956dd43` |
| Q7 | Results, all right | `AdultQuizPerfect` | Built | Bloom art. | A7 | UI-5 QZ-2 `956dd43` |
| Q8 | Tricky-word drill done | `AdultQuizDrill` | Built | Result of the leech drill. | A7 | UI-5 QZ-2 `956dd43`; drill link QZ-4 `a95b5e2` |

#### Speaking (Phase 13) — page "Adult · Speaking"
| ID | Screen | File | Status | What's on it | Goes to | Build status |
|---|---|---|---|---|---|---|
| SP0 | Mic permission | `SpeakMic` | For approval | Before the first SP2 only. Why we need the mic + "recordings are checked, then deleted"; Allow. Denied state → how to turn it on in Settings, and "Listen only for now". Design tweak `state` = ask / denied. | SP2, SP1 | Not built |
| SP1 | Listen | `SpeakListen` | Built | Compact word card (word 28 px + IPA with stressed syllable in amber, C1/verb tags, meaning — VI: Vietnamese meaning first). **"Say this sentence"** card (22 px, target word highlighted). Native-speaker card: sentence waveform (target word band tinted), Play, UK/US and 1× / 0.75× chips. Clay mic button. No timer on this screen. | SP2, A7 | Phase 13 S7 `0bdec5e`, v2 `a14c1d1`; no fixture page yet (S18b closed as is) |
| SP2 | Speaking (3·2·1·beep) | `SpeakRecording` | Built | Sentence stays visible. **Countdown 3 · 2 · 1** over the empty waveform ("Get ready · Recording starts after the beep · tap to start now"); tap skips. Beep + haptic, mic turns clay, recording starts just after the beep. Then: follow-along sentence, live clay waveform over pale native shape, elapsed time only (**no time limit**), stress tip, Stop; "or just pause, it stops by itself" (~2 s silence). Cancel → SP1. | SP3, SP1 | v2 S15 `a14c1d1`; silent-switch fix `5e5852c`; pixel diff en 0.06 / 0.40 %, vi 0.12 / 0.46 % (pass) |
| SP2b | Couldn't hear you | `SpeakNotHeard` | For approval | Silence or too quiet. Live mic-check bars ("say anything"), 3 tips, Try again; no stage lost. | SP2 | Not built |
| SP3 | Compare (result fills in) | `SpeakCompare` | Built | Opens immediately after stop. Waveforms + replay work at once. Result area has 3 states: **checking** (shimmer + "Checking your sentence…" + "Your recording is checked, then deleted."), **done** (word marks: green = fine; amber `MIT is too soft`; dashed + struck `missing`; `heard "affects"`; amber bands on waveform; garden-stage score "In bloom · 76% match"; one tip), **failed** (inline card: Check again / Record again). Overlay / Side by side switch. Replay buttons: **Native · UK** (globe avatar) and **You** (learner's initial avatar). Try again → SP2, Next word. Design file has a `result` tweak (auto/checking/done/failed) for review only. | SP2, SP1, SP4 | v2 S18 `a14c1d1`, server check `be6a008`, scoring M4 `81dd0ff`; pixel diff 0.5–1.4 % accepted (S18b) |
| SP4 | Speaking done | `SpeakDone` | Built | One plant per sentence (best stage), list with mini waveform + best %, one "Pattern to watch", Back to garden. | A1 | Phase 13 S8 `e03aac9`; no fixture page yet |

#### Pronunciation (say one word) — page "Adult · Pronunciation"
Separate from Speaking (sentences). Starts from "Bees are waiting" on A7. EN + VI boards (`…Vi`); iPad boards iP1–iP4, iP2b in §2.2. Plan: `Pronunciation stepping stones implementation plan.md`.

| ID | Screen | File | Status | What's on it | Goes to | Build status |
|---|---|---|---|---|---|---|
| P1 | Say the word | `PronStones` | Built | Word, IPA · meaning. Pond card: one stone per syllable, the stressed one big and gold ("Big stone = loud part"), bee above, hop path. Hear it / Slowly. Tip "land hard on MI". Clay mic; "First time: your phone asks for the microphone". | P2 | Pronunciation Part 2 `24396d0` |
| P2 | Recording | `PronStonesRecord` | Built | Tap → beep + vibration, **no countdown**. Cancel · "● Recording". Stones light up left to right as the voice goes on (live hint, not the score), bee hops along; "Your voice" level bars. Stops ~1 s after the voice ends, **4 s max** (ring), or tap. Design tweak `moment` = beep / MI / ti / gate. | P3, P2b, P1 | Pronunciation Part 2 `24396d0` |
| P2b | Couldn't hear you | `PronStonesNotHeard` | Built | Dark stones, bee with "?". Reasons: quiet, noisy, another word ("We heard 'medicate'"). Two tips, "This try doesn't count. Nothing is lost.", Try again, "Hear the word first". Tweak `reason`. | P2, P1 | Pronunciation Part 2 `24396d0` |
| P3 | Checking | `PronStonesChecking` | Built | "Got it. Checking each stone…", stones shimmer, Hear mine / Hear native, "Usually 1–2 seconds". Recording checked, then deleted. | P4 | Pronunciation Part 2 `24396d0` |
| P4 | Result | `PronStonesResult` | Built | **Retry:** "Almost · 2 of 3 stones", the wobbly stone tilts orange, "ti sounded like /taɪ/ · Try it like the native: /tɪ/", Hear "ti" / Hear mine, Try again → P2, Next bee. **Pass (80 %+):** "Pollinated · 3 of 3 stones", "Clean crossing!", bee flies off, "on its way to fruit", Next bee: {word} / Back to the bed. Tweak `result`. | P2, P1 (next bee), A7 | Pronunciation Part 2 `24396d0` |
| SE1 | Entry · Home speaking mission | `EntryHome` | Approved | A1 with the 3rd mission as **"Say 3 ripe words · 2 min"** (clay mic, light clay highlight), still counts to Golden Bloom; rotates with Collocation challenge. **2026-10-07: merged into A1 on the canvas; this board was removed (see A1).** | SP1 || Board drafted by Claude Code 2026-10-06 (EN + VI, `reference/SE1-entry-home`), built 2026-10-06 (see `Change Log.md`, "Speaking entry points SE1 / SE2 / SE5 / SE6"); `garden:diff` after the UAT deploy. |
| SE2 | Entry · Topic bed Speak | `EntryBed` | Approved | A7 with a full-width **"Speak · 5 sentences from this bed"** row under Water / Quiz / + . **2026-10-07: merged into A7 on the canvas; this board was removed (see A7).** | SP1 || Board drafted by Claude Code 2026-10-06 (EN + VI, `reference/SE2-entry-bed`), built 2026-10-06 (see `Change Log.md`, "Speaking entry points SE1 / SE2 / SE5 / SE6"); `garden:diff` after the UAT deploy. |
| SE5 | Entry · Harvest by voice | `EntryHarvest` | Approved | A7 with a **"Ready to harvest"** card: ripe Flower words, each with a mic; saying it well turns it into Fruit. **2026-10-07: merged into A7 on the canvas; this board was removed (see A7).** | SP1 || Board drafted by Claude Code 2026-10-06 (EN + VI, `reference/SE5-entry-harvest`), built 2026-10-06 (see `Change Log.md`, "Speaking entry points SE1 / SE2 / SE5 / SE6"); `garden:diff` after the UAT deploy. |
| SE6 | Entry · Echo challenge | `EntryEcho` | Approved | GR3 with an **Echo challenge** card (trickiest word, each gardener's best stage, "3 of 5 done", Say it). Tricky list trimmed to 2 rows. **2026-10-07: merged into GR3 on the canvas; this board was removed (see GR3).** | SP1 || Board drafted by Claude Code 2026-10-06 (EN + VI, `reference/SE6-entry-echo`), built 2026-10-06 (see `Change Log.md`, "Speaking entry points SE1 / SE2 / SE5 / SE6"); `garden:diff` after the UAT deploy. |

#### Landing page — page "Landing Page"
| ID | Screen | File | Status | What's on it | Build status |
|---|---|---|---|---|---|
| H3 | Landing · Phone | `LandingSeoPhone` (was `LandingV2Phone`) | Built | Marketing only, no backend calls. Order: header · Plant a word (type or tap a chip → pot blooms → word card → Save this word → Create account) · Sound familiar? (4 flip cards) · How your words grow · What do you need English for? (5 chips; Work/Travel/Daily life = Coming soon) · Features · For parents · Questions · Seed packet · footer. **Speaking (2026-10-07, For approval):** new section "Hear it. Say it. Watch it bloom." after How your words grow — demo card (sentence with *mitigate*, native waveform, Native · UK; mic → Listening… → compare: your waveform over native, amber MIT band, "In bloom · 76% match", Try again / Practise free → AU2), 3 steps Listen / Say it / Compare, privacy line; new FAQ "How does speaking practice work? Is my voice kept?". Real recording vs sample: D-8. | Built ahead of approval: Home HP-11 `9b4ee0d`, `9cb4617` (live). Speaking section built 2026-10-07 from this row's text (boards not in `source/` yet, so no `garden:diff`); demo uses a sample result, no mic (D-8), Play hidden until a real native clip exists |
| H4 | Landing · Desktop | `LandingSeoDesktop` (was `LandingV2Desktop`) | Built | Same sections, 1280 wide; hero keeps Create free account + I have an account. **Speaking (2026-10-07):** same section as two columns (text + steps left, demo card right); nav gets a "Speaking" link (no dot). | Built ahead of approval: Home HP-11 `9b4ee0d`, `9cb4617` (live). Speaking section + nav link built 2026-10-07 (see H3) |
| H3s | State variants | `LandingSeo{PlantBloomed,PainFlipped,UsesTravel,SpeakCompared}` (repo `source/` only; were `LandingV2*`) | Built | Plant-a-word bloomed (deadline), pain card flipped, Travel = Coming soon, Speaking demo in its compared state. | Built ahead of approval: Home HP-11 `9b4ee0d` (live) |

#### Legal — page "Legal"
| ID | Screen | File | Status | What's on it | Build status |
|---|---|---|---|---|---|
| LG1 | Terms of Service · desktop | `LegalTermsDesktop` | Built | Short-version card, "Where do you live?" switch (Vietnam · Australia · Singapore) swapping the region note + "Your local rights", table of contents. `[[…]]` = facts Dylan still fills in. | `/terms` 2026-10-09 (see `Change Log.md`) |
| LG2 | Privacy Policy · desktop | `LegalPrivacyDesktop` | Built | Same layout; PDPL / Privacy Act / PDPA rights per region. | `/privacy` 2026-10-09 |
| LG3 | Terms · phone (VI) | `LegalTermsPhoneVi` | Built | Tap-to-open sections, local rights first. | `/terms` below `lg:` |
| LG4 | Privacy · phone (VI) | `LegalPrivacyPhoneVi` | Built | Same as LG3. | `/privacy` below `lg:` |

#### Brand — page "Brand"
| ID | Screen | File | Status | What's on it | Build status |
|---|---|---|---|---|---|
| BR1 | Logo, favicon, app icon | `Logo*` boards | Approved | Logo "The Sprout" (option A, Dylan 2026-10-09): mark + wordmark, favicon, app icon. Files in `docs/design/brand/`. | Favicon / `icon.svg` / `apple-icon.png` live 2026-10-09 |

#### Kids — page "Kids" (English only)
| ID | Screen | File | Status | What's on it | Build status |
|---|---|---|---|---|---|
| K1 | Garden Home | `Main` | Approved | Thirsty plants = due, big watering-can button → study, stepping stones (past 2 days / today / next 2), sun streak. | |
| K2 | Word Patch (Topic) | `Patch` | Approved | Seed / Sprout / Flower / Fruit tree; droopy plant = leech; Plant a seed = add word; fullness bar. | |
| K3 | Watering (Study) | `Study` | Approved | Picture + auto audio; 😊 Con biết = Good, 🤔 Chưa biết = Again; garden celebration at the end. | |
| K4 | Picture Quiz | `Quiz` | Approved | Picture tiles + audio prompt; wrong = gentle wiggle; right = sparkle + a bee joins the garden. | |

### 2.2 iPad (landscape, 1194 × 834)

All iPad screens: sidebar (Garden · Missions · Topics · Groups · Me + Shared gardens + streak card), same theme as phone. **Status: For approval** unless noted.

| ID | Screen | File | What's different from phone | Build status |
|---|---|---|---|---|
| iA1 | Today's Garden | `iPadHome` | Two columns: garden + Continue mission (left), missions + "Beds to water" (2 thirstiest beds) (right). | Partly: iPad layouts behind `NEXT_PUBLIC_GARDEN_IPAD_NAV` (off on UAT), UI-7 U7-2 `ccac6d4`; not checked against these boards |
| iA2 | Watering (Review) | `iPadReview` | Full screen, no sidebar. Card split: word / IPA / Listen (left), meaning / example / synonyms (right). Keyboard hints: Space = show, 1–4 = rate. | Partly: iPad layouts behind `NEXT_PUBLIC_GARDEN_IPAD_NAV` (off on UAT), UI-7 U7-2 `ccac6d4`; not checked against these boards |
| iA3 | Mission Complete | `iPadBloom` | Centred sheet over the dimmed garden. | Partly: iPad layouts behind `NEXT_PUBLIC_GARDEN_IPAD_NAV` (off on UAT), UI-7 U7-2 `ccac6d4`; not checked against these boards |
| iA4 | Weekly Harvest | `iPadMissions` | Full-width week bed; Road to Band 7, rain barrel, group card in one row. | Partly: iPad layouts behind `NEXT_PUBLIC_GARDEN_IPAD_NAV` (off on UAT), UI-7 U7-2 `ccac6d4`; not checked against these boards |
| iA5 | Welcome Back | `iPadComeback` | Garden + "streak is safe" left, Quick revive card right with a preview of wilting words. | Partly: iPad layouts behind `NEXT_PUBLIC_GARDEN_IPAD_NAV` (off on UAT), UI-7 U7-2 `ccac6d4`; not checked against these boards |
| iA6 | Topics | `iPadTopics` | 3-column grid of bed cards; filter chips next to the title. | Partly: iPad layouts behind `NEXT_PUBLIC_GARDEN_IPAD_NAV` (off on UAT), UI-7 U7-2 `ccac6d4`; not checked against these boards |
| iA7 | Topic Bed | `iPadTopicDetail` | Split view: bed list column + selected bed; words in 2 columns. | Partly: iPad layouts behind `NEXT_PUBLIC_GARDEN_IPAD_NAV` (off on UAT), UI-7 U7-2 `ccac6d4`; not checked against these boards |
| iA8 | Me | `iPadMe` | Calendar + keepsakes side by side; settings in 2 columns; Account as a **popover** from the gear. | Partly: iPad layouts behind `NEXT_PUBLIC_GARDEN_IPAD_NAV` (off on UAT), UI-7 U7-2 `ccac6d4`; not checked against these boards |
| iAU1–4 | Sign in screens | `iPadLogin`, `iPadRegister`, `iPadRegisterInvite`, `iPadForgot` | Two panes: brand panel (garden art, "Grow your English, one word at a time.") + the phone form in a 440 pt column. | Partly: iPad layouts behind `NEXT_PUBLIC_GARDEN_IPAD_NAV` (off on UAT), UI-7 U7-2 `ccac6d4`; not checked against these boards |
| iGR1 | Shared Gardens | `iPadGroups` | Split view: list column + empty state "Pick a garden to open it". | Partly: iPad layouts behind `NEXT_PUBLIC_GARDEN_IPAD_NAV` (off on UAT), UI-7 U7-2 `ccac6d4`; not checked against these boards |
| iGR2–4 | Group Garden / Tricky / Roster | `iPadGroupGarden`, `iPadGroupTricky`, `iPadGroupRoster` | Open in the right column; garden highlighted in the list. | Partly: iPad layouts behind `NEXT_PUBLIC_GARDEN_IPAD_NAV` (off on UAT), UI-7 U7-2 `ccac6d4`; not checked against these boards |
| iGR5–7 | Invite / Join / Start | `iPadGroupInvite`, `iPadGroupJoin`, `iPadGroupCreate` | Centred sheets over the dimmed split view. | Partly: iPad layouts behind `NEXT_PUBLIC_GARDEN_IPAD_NAV` (off on UAT), UI-7 U7-2 `ccac6d4`; not checked against these boards |
| iQ1–5 | Quiz questions | `iPadQuiz`, `iPadQuizRight`, `iPadQuizWrong`, `iPadQuizCloze`, `iPadQuizListen` | Full screen; question card left, answers + feedback right; bigger question text. | Partly: iPad layouts behind `NEXT_PUBLIC_GARDEN_IPAD_NAV` (off on UAT), UI-7 U7-2 `ccac6d4`; not checked against these boards |
| iQ6–8 | Quiz results | `iPadQuizResult`, `iPadQuizPerfect`, `iPadQuizDrill` | Centred sheet over the dimmed topic bed. | Partly: iPad layouts behind `NEXT_PUBLIC_GARDEN_IPAD_NAV` (off on UAT), UI-7 U7-2 `ccac6d4`; not checked against these boards |
| iSP1 | Speak (listen + record) | `iPadSpeak` | Word + sentence left, native waveform right; right panel goes idle → countdown 3·2·1 → speaking. | |
| iSP3 | Compare | `iPadSpeakCompare` | Wide waveform + word marks; score / tip / replay in a row; same checking / done / failed states as SP3. | |
| iP1–iP3 | Pronunciation: say · recording · checking | `iPadPron` | Two columns: word card left (word 64 px, IPA with the stressed part in amber, meaning, Hear it / Slowly, tip); pond right (stones, bee) with the mic, the recording (voice bars, 4 s ring, Cancel) or checking (Hear mine / Hear native) under it. One board, tweak `state` = say / recording / checking. *Approved 2026-10-11.* | Pronunciation Part 2 `24396d0` |
| iP4 | Pronunciation: result | `iPadPronResult` | Left: badge, title, the wobbly-syllable card (or the pollinated card); right: the pond result + Try again / Next bee (or Next bee: {word} / Back to the bed). Tweak `result`. *Approved 2026-10-11.* | Pronunciation Part 2 `24396d0` |
| iP2b | Pronunciation: couldn't hear you | `iPadPronNotHeard` | Left: title, body, two tips, "This try doesn't count"; right: dark stones + bee with "?", Try again, "Hear the word first". Tweak `reason`. *Approved 2026-10-11.* | Pronunciation Part 2 `24396d0` |

### 2.3 Open decisions (don't build until decided)
| # | Question | Affects |
|---|---|---|
| D-1 | Speech-recognition service: must work from Vietnam + mainland China; cost per check | SP2, SP3 |
| D-2 | "Native speaker" vs "Native accent / Giọng bản xứ" wording while audio is text-to-speech | SP1, SP3 |
| D-3 | ~~Harvest by voice: which score harvests? Does it change review dates?~~ 2026-10-06: Fruit 90%+, no change to review dates. **Changed 2026-10-11 (Dylan): saying the word at 80 %+ on P4 = Pollinated. Visual only: never changes the stage or review dates. Fruit (mastered) comes only from reviews. No separate 90 % harvest; the sentence flow no longer pollinates.** | SE5, A7, P4 |
| D-4 | ~~Echo challenge: show each gardener's stage, or totals only?~~ **Totals only**, keeping GR3's promise (Dylan, 2026-10-06) | SE6 |
| D-6 | Learners with no group: keep the Groups tab with the GR1b empty state, or hide it (4 tabs, older rule)? | GR1b, tab bar |
| D-7 | OB1 "Not sure?": build a 2-minute level check, or start at B1 and adjust from reviews? | OB1 |
| D-8 | Home page "Try it now": really record (mic permission + one free check per visitor) or play a pre-recorded learner sample? Copy "No sign-up needed for this demo" fits the real recording. | H3, H4 #speak |
| D-5 | ~~When approved, SE1/SE2/SE5/SE6 replace A1 / A7 / GR3 — confirm~~ **Yes** (Dylan, 2026-10-06) | SE1–SE6 |

### 2.4 Removed screens
| ID | Screen | Removed | Replaced by |
|---|---|---|---|
| H1–H2 | Home page v1 (phone, desktop) | 2026-10-06 | H3–H4 (Home v2) |
| SP2a | Ready (listening, voice-activated start) | 2026-10-06 | SP2 countdown |
| SP2c | Checking (own screen) | 2026-10-06 | SP3 checking state |
| SP2d | Couldn't check (own screen) | 2026-10-06 | SP3 failed state |
| SE1, SE2, SE5, SE6 | Entry-point variant boards | 2026-10-07 | Merged into A1, A7, GR3 |

---

## 3. Changelog

Newest first. Format: `### YYYY-MM-DD — title` then lines tagged **Added / Changed / Removed / Decision**, with screen IDs and status.

### 2026-10-11 — Pronunciation: say one word (Stepping stones)
- **Added** P1 Say the word, P2 Recording, P2b Couldn't hear you, P3 Checking, P4 Result (retry / pollinated), new canvas page "Adult · Pronunciation". A **new feature, separate from Speaking (sentences)**: the learner says one word; one stone per syllable, the big stone = the stressed part; the result shows which stone wobbled. Three directions were drawn (stones, bee flight, sound tiles); Dylan chose the stones, the simplest. *Approved (Dylan, 2026-10-11).*
- **Changed** A7 Bees: a bee's mic and "Say all" open P1, not SP1 (the built Bees `b40ac02` still open the sentence flow). *Approved.*
- **Decision** D-3 changed: **80 %+ = Pollinated, visual only**; Fruit only from reviews; no 90 % harvest. *(Dylan, 2026-10-11)*
- **Added** Vietnamese boards (`PronStones…Vi`) and iPad boards iP1–iP3 (`iPadPron`), iP4 (`iPadPronResult`), iP2b (`iPadPronNotHeard`), EN + VI. VI buttons: "Giọng của tôi" / "Giọng bản xứ" (short, so they fit). *Approved (Dylan, 2026-10-11).*
- `source/`: PronStones, PronStonesRecord, PronStonesChecking, PronStonesResult, PronStonesNotHeard. `reference/`: P1-say-word, P2-recording(-beep), P3-checking, P4-result-retry, P4-result-pollinated, P2b-not-heard(-noisy, -other-word), each with `-vi`; iPad iP1-say-word, iP2-recording, iP3-checking, iP4-result-retry, iP4-result-pollinated, iP2b-not-heard (+ `-vi`); render jobs added.
- Build plan: `Pronunciation stepping stones implementation plan.md` (repo root): 1 word check on the speech server + backend, 2 the screens, 3 wire the Bees + the 80 % rule.
- **Built** Part 1, word check on the speech server + `POST /speaking/word-check`, syllables, 80 % rule: `9c6c681`.
- **Built** Part 2, P1–P4, P2b and iP1–iP4, iP2b (phone + iPad, EN / VI / ZH): `24396d0`, lint fix `cbd0d7a` (no mic explainer card: the phone asks on the first tap; iPad eyebrow "Pronunciation · {bed}" when opened from a bed).

### 2026-10-11 — Topics: pronunciation bees, two searches, Profile tab
- **Changed** A7 / iA7 (EN + VI): "Ready to harvest" (SE5) becomes **"Bees are waiting"** — same place, one list (Dylan: a bee on every word row would make the words to say hard to find). Each row: ripe flower with a bee, the word, its syllables with the stressed one in capitals (MI · ti · gate), a mic; good attempt → gold flower centre, tick, "Pollinated · on its way to fruit"; header "Say all". At most 3 bees in the whole garden, 1–2 new a day, a bee leaves quietly after 3 days. **D-3 stays:** 90%+ shows Fruit, review dates never change. iPad: same card under Water / Quiz / Add word. *Approved (Dylan, 2026-10-11).*
- **Changed** A6b → **Search topics** (topics only) and **Added** A7c **Search words in a topic** (search button in the A7 header; English word or Vietnamese meaning; "Plant here"). Dylan: Topics searches topics, a Topic Bed searches words. *Approved (Dylan, 2026-10-11).*
- **Changed** Canvas tab "Me" → **"Profile"** (VI "Hồ sơ") on all phone and iPad boards, as on the site; board titles A8 / iA8 and page "Adult · Profile" renamed. Board sources in `source/` that weren't touched today still say "Me".
- `source/`: AdultTopicDetail(Vi), iPadTopicDetail(Vi), AdultTopics(Vi), AdultSearch(Vi), TopicWordSearch(Vi). `reference/`: A6-topics, A6b-search-topics, A7-topic-bed, A7-topic-bed-filter-sprouts, A7c-word-search (EN + VI), new render jobs. **Note:** A7 and A6 references now show the new design, so `garden:diff` for A7 fails until it's built.
- Build plan: `Topics bees and search implementation plan.md` (repo root).
- **Built** Part 1, A7 Bees are waiting: `b40ac02` (v1: IPA instead of syllables, max 3 bees per bed; garden-wide bees are v2).
- **Built** Part 2, A7c Search words in a topic + the A7 search button: `dd973a9`.
- **Built** Part 3, A6b Search topics: `259e19b` (Plant sows the library topic's first 5 words instead of cloning it; the word hint covers beds already opened this visit).

### 2026-10-10 — A1b boards take the streak pill and the site's wording
- **Changed** `source/AdultAllWatered(Vi).dc.html` (Dylan): header gets A1's streak pill ("23 days" / "23 ngày"); EN date "Friday, September 25", "tomorrow 7:30 AM", last tab "Profile"; VI last tab "Hồ sơ". References `A1b-all-watered(-vi)` re-exported. `garden:diff` (local): EN 0.000%, VI 0.094%.

### 2026-10-10 — A1b All watered: ready to build
- **Added** `source/AdultAllWatered(Vi).dc.html`, `reference/A1b-all-watered(-vi)`, `tools/render.js` jobs.
- **Decision** A1b replaces A1 only when `due_now = 0` **and** every mission of the day is done (Golden Bloom grown). Nothing due but missions still open → A1 (Option D card). The header keeps A1's streak pill (the board leaves it out). *Approved (Dylan).*
- Build plan: `A1b all watered implementation plan.md` (repo root).
- **Built** `e8b0d78`: A1b replaces A1 when nothing is due and every mission is done; resting hero (sun, butterfly, swaying flowers), Golden Bloom card + next ripening, three extras (plant 5 from the bed with the most seeds, say 3 sentences, quiz a bed). Streak pill kept. EN / VI / ZH; UAT 2026-10-10.

### 2026-10-10 — Canvas: one Welcome back board
- **Removed** the old A5 board ("Start with the 12 wilting words · Quick revive", EN + VI) from the canvas (Dylan).
- **Changed** board A5b "Welcome Back · nothing wilting" renamed **"A5 · Welcome Back"** and moved into A5's place (files `AdultComeback(Vi).dc.html` on the canvas), with the site wording from `241ac8c`. Repo files keep their names (`source/AdultComebackStart*`, `reference/A5b-welcome-back-start*`) so `garden:diff` still matches the site. **Open (Claude Code, when Dylan asks):** the site still shows the wilting "Quick revive" card when words are wilting; drop it if that case should also use Start small, then rename the A5b fixture / files to A5.

### 2026-10-10 — A5 Welcome back: finish it (A5b + rules)
- **Found** (Dylan, UAT): A5 is only half done. With 0 wilting words — the usual case, because almost nobody has leeches yet — the "Start small" card loses its title and button and shows only an underlined "Water all 45" link inside an empty white card. No time estimates ("about 5 min" from the board never shows). After missed days with nothing due, A5 still shows with no card at all.
- **Added** A5b "Welcome Back · nothing wilting" (`AdultComebackStart`, EN + VI): same screen, the card offers a short start: "Water the 10 thirstiest words first" → **Quick start · 10 words · about 4 min** (watering with only the 10 most overdue words), "Water all 45 instead" underneath. *Approved (Dylan).*
- **Decision** A5 shows only when the learner missed 2+ days **and** something is due; otherwise Today's Garden (A1 / A1b). Time estimate on A5 / A5b ≈ 25 s a word, rounded (12 → 5 min, 10 → 4 min). *Approved (Dylan).*
- **Note** A5b uses the site's current title "Your garden kept your spot." (A5 board still says "Your garden waited for you."; the site wins until Dylan fine-tunes copy).
- Build plan for Claude Code: `A5 welcome back implementation plan.md` (repo root).
- **Built** `7c73926`: A5 only when something is due or wilting; Start small card for all three cases (Quick revive / Quick start → `/review?limit=10` / Start watering) with time estimates; drops over thirsty plants in the comeback garden. EN / VI / ZH; UAT 2026-10-10.
- **Changed** A5 / A5b boards (EN + VI) take the site's wording (Dylan): date "Monday, September 28"; A5 title "Your garden kept your spot." (VI "Chào Minh quay lại. / Vườn vẫn chờ bạn."); legend VI "đang khát / sắp héo / vẫn kết trái"; streak card "Your 23-day streak is still going 🛡️" / "Your rain barrel covered 2 days. 0 left, and it refills on Sunday." (VI "Chuỗi 23 ngày của bạn vẫn còn 🛡️" / "Thùng nước mưa đã giữ giúp bạn 2 ngày. Còn 0, sẽ đầy lại vào Chủ Nhật."); A5 card "Start with the 12 wilting words" / "These are the ones fading fastest. The rest can wait until tomorrow." (VI "Bắt đầu với 12 từ đang héo" / "…Các từ khác để mai cũng được."); "Water all N words instead"; tab "Profile" (VI "Hồ sơ"). References re-exported; `garden:diff` on UAT 0.000% for all four. The canvas page itself still needs the same edits.

### 2026-10-10 — A1 missions card: "Next up" + "Then" (Option D)
- **Removed** A1 / iA1 (EN + VI): the big "Continue mission" button under the missions card (Dylan: two ways in were confusing).
- **Changed** A1 / iA1: missions card = **Next up** panel (first open mission, light blue, progress, own button "Start watering →" / "Bắt đầu tưới →") + **Then** list (phone: Say 3 ripe words · 2 min → SP1; iPad: Collocation challenge · 3 min → Q1); done missions plain and struck through. Golden Bloom strip and "Tomorrow · N words ripen" unchanged. Chosen from 4 options (A action pills, B tap-to-start tiles, C progress rings, D next up) on a temporary page "Mission rows · options", now deleted. *Approved (Dylan).* **Built** `b6725e6` (phone + iPad, EN / VI / ZH; UAT 2026-10-10).
- **Changed** `source/AdultHome(Vi).dc.html`, `reference/A1-todays-garden(-vi)` re-rendered.

### 2026-10-10 — Landing Page: memory block redesigned
- **Changed** H3 / H4 / H3s (EN + VI), "How spaced repetition helps" section: the block under the growth stages. Before: chart card (white) + "A water drop…" (blue fill, stretched empty) + "Forgot one?" (no card). After: three white bordered cards in the same order (title, picture, one line). Desktop: chart card left (1.25fr), the two tips stacked right, together as tall as the chart. Tips get tiny garden tiles (English words, `aria-hidden`): *mitigate* sprout + drop, *deadline* flower, *negotiate* sprout + drop; and *deadline* faded "?" → sprout + drop → flower.
- **Changed** Drop tip copy (Dylan found it unclear): "A water drop means: review it today" / "When it’s time to review a word, Dygo puts a water drop on it. Just review the words with a drop. You don’t have to work out what to study." VI "Giọt nước = cần ôn hôm nay" / "Khi đến lúc ôn một từ, Dygo gắn giọt nước lên từ đó. Bạn chỉ cần ôn những từ có giọt nước, không cần tự tính nên học từ nào." *Built* (UAT 2026-10-10). Heights: H3 390 × 8025 (VI 8070), H4 1280 × 5455 (VI 5311).

### 2026-10-10 — Landing Page: memory chart
- **Added** H3 / H4 / H3s (EN + VI): "Reviews spread out as a word grows" card shows a chart (memory without review fades; with Dygo, six reviews at widening gaps), legend With Dygo / Without review / A review, axis Today → Weeks later. Replaces the drop strip. *Built.*

### 2026-10-10 — Landing Page: speaking demo animation
- **Changed** H3 / H4 / H3s speaking demo (D-8 decided: **animated sample, no microphone**): mic → Listening… (moving clay bars, pulsing stop ring, 2.6 s) → sample result 76%. Copy: "Tap the mic to see a sample learner’s result. No sign-up needed.", "Comparing a sample learner with the native speaker." *Built.*

### 2026-10-09 — Landing Page rebuilt for search (LandingSeo*)
- **Changed** Canvas page "Landing Page" now holds `LandingSeo{Phone,PhoneVi,Desktop,DesktopVi}` (old "Landing Page" boards removed, "Landing Page SEO" renamed "Landing Page", Dylan). Three H2s follow search topics: "How to remember English vocabulary for a long time", "How spaced repetition helps English learners", "How to practise English speaking by yourself" (VI/ZH equivalents); each intro gains one topic sentence. Layout unchanged. *Built.*
- **Changed** `tools/render.js`: landing references render from `LandingSeo*` at measured heights; `garden:diff` maps fixtures `H3-home-v2-*` / `H4-home-v2-*` to the `H3/H4-landing-v2-*` PNGs.

### 2026-10-09 — Legal pages
- **Added** Page "Legal": LG1–LG4 Terms of Service and Privacy Policy for Vietnam, Australia, Singapore (PDPL, Privacy Act, PDPA), desktop + Vietnamese phone. *Built* as `/terms`, `/privacy` (EN, VI, ZH). Open: `[[…]]` placeholders; review by a Vietnamese lawyer.

### 2026-10-09 — Brand
- **Added** Page "Brand" (was "Logo"): BR1 logo option A "The Sprout", favicon, app icon (Dylan). Exports in `docs/design/brand/`. *Built* (site favicon + icons).

### 2026-10-08 — "Home Page" renamed "Landing Page"
- **Changed** Canvas page "Home Page" → **"Landing Page"**; boards H3 "Home v2 · phone" → **"Landing · Phone"**, H4 "Home v2 · desktop" → **"Landing · Desktop"** (VI: "Landing · Điện thoại", "Landing · Máy tính"). Names only: IDs (H3, H4, H3s), files (`LandingV2*`) and the design are unchanged (Dylan).
- **Changed** `docs/design/garden`: `source/LandingV2*.dc.html` updated to the current canvas (Speaking section, no hero pill / nav dot) + new `LandingV2SpeakCompared(Vi)`; `tools/render.js` Landing jobs (new sizes, new `H3s-speaking-compared`); `reference/H3-*`, `H3s-*`, `H4-*` re-rendered (EN + VI). Reference files renamed `H3-home-v2-phone(-vi)` → **`H3-landing-v2-phone(-vi)`** and `H4-home-v2-desktop(-vi)` → **`H4-landing-v2-desktop(-vi)`** (.html + .png); `render.js` and README updated. **For Claude Code:** rename the matching `garden:diff` fixture names / routes (`/garden/_reference/H3-home-v2-phone` → `/garden/_reference/H3-landing-v2-phone`, same for H4).

### 2026-10-08 — Home page: hero pill and nav dot removed
- **Removed** H3 / H4 / H3s (EN + VI): the hero pill "NEW · Speaking practice with a native speaker →" and the clay dot on the desktop "Speaking" nav link (Dylan). The Speaking section, nav link and FAQ stay. Page heights: H3 390 × 7423 (VI 7373), H4 1280 × 5063 (VI 4867). *For approval.*

### 2026-10-07 — Home page: Speaking (For approval)
- **Added** H3 / H4 / H3s (EN + VI): desktop nav link "Speaking", section `#speak` with an interactive demo card + 3 steps + privacy line, FAQ "How does speaking practice work? Is my voice kept?". New board `LandingV2SpeakCompared` (done state). *For approval.*
- **Decision needed** D-8 (real recording or pre-recorded sample on the public page).

### 2026-10-07 — Missing screens (For approval)
- **Added** Onboarding, new page "Adult · Onboarding": OB1 Level · OB2 Target band · OB3 First topic · OB4 Reminder time · OB5 Garden ready (EN + VI). AU2 Create account → OB1.
- **Added** AU5 Set a new password (strength plant, expired-link state).
- **Added** SP0 Mic permission (ask / denied), SP2b Couldn't hear you (mic-check bars).
- **Added** A7b Add word (sheet from + on A7), A6b Search (from the search button on A6).
- **Added** A8b Daily goal, A8c Reminder time, A8d Meaning language (opened from the A8 settings rows).
- **Added** Empty states A1b All watered, A6c No topics yet, GR1b Not in any group.
- **Changed** Links only, no layout change: AU2 → OB1, A6 search → A6b, A7 + → A7b, A8 settings rows → A8b / A8c / A8d. *Approved (links follow the new screens).*
- **Decision needed** D-6 (Groups tab with no group), D-7 (level check on OB1). Phone only; no iPad versions yet.

### 2026-10-07 — Canvas reorganised by feature; entry points merged
- **Changed** Canvas pages are now one per feature, each holding phone + iPad in English + Vietnamese: Home Page · Adult · Authentication · Adult · Onboarding · Adult · Garden · Adult · Topics · Adult · Review · Adult · Quiz · Adult · Missions · Adult · Groups · Adult · Speaking · Adult · Me · Kids. Screen IDs and files are unchanged.
- **Changed** A1 now includes the speaking mission (was SE1); A7 the Speak row + Ready to harvest card (was SE2 + SE5); GR3 the Echo challenge card (was SE6). EN + VI. *Approved.*
- **Removed** SE1, SE2, SE5, SE6 variant boards (merged above). Build status of the SE rows unchanged.

### 2026-10-06 — Speaking entry points approved (Dylan)
- **Changed** SE1, SE2, SE5, SE6: *For approval* → *Approved* (Dylan in chat, 2026-10-06). **Decision** D-5: yes, they replace A1 / A7 / GR3. **Decision** D-3: Fruit at 90%+, review dates unchanged. **Decision** D-4: Echo shows totals only. Waiting for the `Entry*.dc.html` files (EN + VI), which Dylan will add to `docs/design/garden/source/`.

### 2026-10-06 — Build status filled in (Claude Code)
- **Changed** AU1–AU4, A1–A8, GR1–GR7, Q1–Q8, SP1–SP4: status → *Built*, with commits in the Build status column (§2). H3 / H4 / H3s are built and live although still *For approval*; the iPad boards are partly built behind a flag. Not built: SE1 / SE2 / SE5 / SE6 (*For approval*), iSP1 / iSP3, Kids K1–K4 (not in this web app). Questions about this file: `docs/design/QUESTIONS.md`.

### 2026-10-06 — Speaking entry points (For approval)
- **Added** SE1 Home speaking mission, SE2 Topic bed Speak row, SE5 Harvest by voice, SE6 Echo challenge (EN + VI). Variants only; A1 / A7 / GR3 unchanged. *For approval.*

### 2026-10-06 — Speaking replay buttons
- **Changed** SP3, iSP3: replay buttons show who's speaking — **Native · UK** with a globe avatar, **You** with the learner's initial; pressed state darker, label "Playing…". *Approved.*

### 2026-10-06 — Speaking flow simplified to 4 screens
- **Removed** SP2a Ready, SP2c Checking, SP2d Couldn't check.
- **Changed** SP1: mic opens SP2 directly.
- **Changed** SP2: 3 · 2 · 1 countdown (tap to skip), beep + haptic, recording starts after the beep; no time limit; auto-stop on ~2 s silence or Stop.
- **Changed** SP3: opens immediately; inline **checking** and **failed** states; Try again → SP2.
- **Changed** iSP1/iSP3: same states inside the iPad layout.
- **Decision** Scoring is done on a server by speech recognition; recordings are sent, checked and deleted (never stored). *Approved.*

### 2026-10-06 — Speaking uses whole sentences
- **Changed** SP1–SP3, iSP1, iSP3: learner says the whole example sentence; target word stays highlighted. SP3 marks every word (fine / stress / missing / unclear).
- **Changed** SP1: word card made compact; sentence is the largest text. SP2: separate word heading removed; IPA moved into the stress tip. *Approved.*

### 2026-10-06 — Speaking (Phase 13) first design
- **Added** SP1–SP4 phone, iSP1 + iSP3 iPad, EN + VI. Concept "Echo": native = green bars, you = clay, problems = amber; scores shown as garden stages. *Approved (flow as updated above).*

### 2026-10-06 — iPad
- **Added** iPad A1–A8, Sign in, Groups, Quiz (EN + VI), landscape 1194 × 834, Apple iPad patterns (sidebar, split view, sheets, popover, keyboard hints). *For approval.*
- **Changed** iA8 Me: removed a stray phone tab bar.

### 2026-10-06 — Canvas organisation
- **Changed** Vietnamese pages merged into their English pages (Adult, Adult · Groups): VI row below EN row.
- **Removed** Home page v1 (H1–H2) by Dylan.

### Baseline (before 2026-10-06)
- Phone screens AU1–AU4, A1–A8, GR1–GR7, Q1–Q8, Home v2 (H3–H4 + states), Kids K1–K4, each with Vietnamese copy (Kids English only), as on the canvas at the start of this changelog.
- Earlier decisions recorded on the canvas: 5-tab nav incl. Groups (2026-09-27); Review shows synonyms instead of collocations (2026-09-27); Account sheet with Sign out on Me (2026-09-30).

---

## 4. Template for new entries

```md
### YYYY-MM-DD — short title
- **Added** <ID> <screen> — what's new. *For approval | Approved*
- **Changed** <ID> — what changed (before → after). *Approved*
- **Removed** <ID> — replaced by <ID>.
- **Decision** <what was decided and why>.
```
