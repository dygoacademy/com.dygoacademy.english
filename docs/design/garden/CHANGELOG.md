# Dygo Word Garden — Design changelog & screen inventory

Location in the repo: `docs/design/CHANGELOG.md`
Design source of truth: the **Dygo Word Garden** design canvas (owner: Dylan).
Last updated: **2026-10-23**

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
| OB1 | About you (level + goal) | `OnboardLevel` | Approved (Dylan, 2026-10-12) | 2-step plant header (seed → sprout). Level as 4 compact tiles (A1–A2 … C1) + goal chips (IELTS Academic / General, Work, Travel, Just for me); IELTS target band inline. "Not sure? Pick the closest; Dygo adjusts." | OB4 | Built `40a151d` |
| OB2 | Target band | `OnboardGoal` | Removed 2026-10-11 (merged into OB1) | IELTS / PTE / just for life; target band; decides which words ripen first. | OB3 | Not built |
| OB3 | First topic | `OnboardBed` | Removed 2026-10-11 (bed picked from the goal) | Topics as seed packets; the one you pick becomes the first bed in A6. | OB4 | Not built |
| OB4 | Reminder time | `OnboardReminder` | Approved (Dylan, 2026-10-12) | 3 choices: Morning 7:30 / Lunch 12:30 / Evening 21:00; "Remind me at …"; Not now. Phone notification by default (Zalo / Email in A8c). Asks for notifications after the button. | OB5 | Built `40a151d` |
| OB5 | Garden ready | `OnboardReady` | Approved (Dylan, 2026-10-12) | First seeds planted (animation), summary of Level, Goal, Reminder (each with Change), "Meet your first 5 words" / "Look around the garden first". | A2, A1 | Built `40a151d` |

#### Adult core — pages "Adult · Garden" (A1, A5), "Adult · Review" (A2, A3), "Adult · Missions" (A4), "Adult · Topics" (A6, A7), "Adult · Me" (A8)
| ID | Screen | File | Status | What's on it | Goes to | Build status |
|---|---|---|---|---|---|---|
| A1 | Today's Garden (Home) | `AdultHome` | Built | Greeting + streak. Garden card (every word as a plant, counts: thirsty / ripe / wilting). **3 daily missions** (review due, learn new, 1 quiz) → finishing all 3 grows the **Golden Bloom**. **2026-10-10 (Option D, Approved):** no big button under the card; the missions card opens with **Next up** (first open mission, its own button, e.g. "Water 3 thirsty words · Start watering →") and a **Then** list (other missions, each opens its activity; done rows plain, struck through). "Tomorrow 7:30 · N words ripen". **Speaking mission (2026-10-07, merged from SE1):** 3rd mission can be "Say 3 ripe words · 2 min" (clay mic row) → SP1; still counts to Golden Bloom. | A2, tabs | UI-4 `4b701fd`, `6e7eb53`; iPad home `48912ed`; Next up + Then (Option D) `b6725e6` |
| A1b | All watered (nothing due) | `AdultAllWatered` | Built | Today's Garden when nothing is due **and** today's missions are all done: sunny full garden "All watered today · Nothing is thirsty. Your garden is resting.", Golden Bloom card "3 of 3 missions · Golden Bloom grown" + next ripening, "Want a little more?" list (Plant 5 new words from a bed · Say 3 sentences · Quiz a bed). | A1 extras, tabs | Built `e8b0d78` (EN / VI / ZH; plan: `docs/plans/A1b all watered implementation plan.md`) |
| A1c | Missions done, words still thirsty | `AdultTodayDone` | Built | A1 when every mission of the day is done **and** words are still due (`due_now > 0`): missions card unchanged (3 Done rows + Golden Bloom line), no "Tomorrow … ripen" line, then "Want a little more?" list: **Water N thirsty words** (Bonus · about 1 min, due-only Review), Plant 5 new words (from a bed), Say 3 sentences. No quiz row. | A2, A7, SP1, tabs | Built 2026-10-18 (EN / VI / ZH; plan: `docs/plans/A1c missions done want more implementation plan.md`) |
| A2 | Watering (Review) | `AdultReview` | Built | Flashcard: word (Fraunces), IPA, CEFR, topic, meaning (English; Vietnamese meaning first when app language is vi), example, synonyms. 4 ratings with next interval: Again / Hard / Good / Easy. Vine progress = mission progress. | A3, A1 | UI-4; keyboard shortcuts U7-3 `51b6180`. Phase 13 "Say this one?" added S11 `bc38bff`, removed 2026-10-06 `0e47e01` |
| A3 | Mission Complete | `AdultBloom` | Built | Bloom animation, stats, streak +1, "1 mission left for Golden Bloom" with a 3-min button, reminder toggle for when words ripen. | A1, A2 | UI-4 `6e7eb53`; reminder switch UI-6 U6-7b `c96515a` |
| A4 | This week (weekly missions) | `AdultMissions` | Built (changed 2026-10-17) | 3 weekly missions (Rescue wilting words · Use it in a sentence · Sound of the week) + "+1 rain barrel" reward, seed-pack line inside the card; Road to Band 7 below (week plants dropped 2026-10-18). | GR2, tabs | UI-6. Phase 13 Sound Garden card added S10 `1968f24`, removed 2026-10-06 `0e47e01`; This week `592d1a9` (plan: `docs/plans/A4 weekly missions implementation plan.md`) |
| A5 | Welcome Back | `AdultComeback` | Built | No guilt: streak freeze kept the streak; wilting = most overdue only; "Quick revive, 5 min"; escape hatch "Water all 42". | A2, tabs | UI-6 |
| A5b | Welcome Back · nothing wilting | `AdultComebackStart` | Built | A5 when 0 words are wilting (the common case today): card "Start small · Water the 10 thirstiest words first" → **Quick start** (10 words · about 4 min, only the 10 most overdue) + "Water all 45 instead". ≤10 thirsty: "Water your N thirsty words" / Start watering, no second link. Nothing due after missed days → show A1 / A1b, not A5. Minutes ≈ 25 s a word. | A2, tabs | Built `7c73926` (EN / VI / ZH; plan: `docs/plans/A5 welcome back implementation plan.md`) |
| A6 | Topics (Beds) | `AdultTopics` | Built `d1c8402` (changed 2026-10-17) | Each topic = a garden bed: stage icon, fruit/flower/sprout bar, due badge, locked seed pack. Filters: All / Mine / Academic / General / Work / Travel / Shared (fixed groups, sideways slider). Bed name up to 2 lines. | A7, tabs | UI-5 (wrap-up `58ab14f`) |
| A6b | Search topics | `AdultSearch` | Built `3729cd3` (changed 2026-10-17) | **Redesigned 2026-10-11:** searches topics only (name, collection, level; matched letters highlighted). "Your topics" = topic cards like A6 → A7; "More topics to plant" = library topics with Plant; last row when a word matches: "Looking for a word? *x* is in Topic" → A7c. Recent searches. | A7, A7c | Built `259e19b`; finish `3729cd3` (word search across beds, long names) |
| A7 | Topic Bed | `AdultTopicDetail` | Built | 4 stage tiles (New / Learning / Review / Mastered, tap to filter), words sorted by next due, wilting = leech. Water N due, Quiz, + Add word. **Speaking (2026-10-07, merged from SE2 + SE5):** full-width "Speak · 5 sentences from this bed" row under Water / Quiz / + → SP1; "Ready to harvest" card above the word list (ripe flowers, each with a mic; Fruit at 90%+, D-3). **2026-10-11 (Approved): "Ready to harvest" becomes "Bees are waiting"** (same place, one list: flower + bee, word, syllables with the stress, mic; pollinated = gold centre + tick, "Pollinated · on its way to fruit"; "Say all"), and a search button in the header → A7c. **2026-10-11 (Approved): a bee's mic and "Say all" open the word screens P1 (say one word), not SP1;** rows show the syllables (MI · ti · gate). | A2, Q1, A6 | UI-5 (wrap-up `58ab14f`); Quiz + leech drill U5-6 `5f016d7`; Bees `b40ac02`; search button `dd973a9`; bees open P1 + syllables `1c94dae` |
| A7b | Add word | `AdultAddWord` | Built (header + board 2026-10-17) | Bottom sheet from + on A7. Type a word → meaning + IPA filled in; pick a bed (chips); Plant → seed drops into the bed (planted state). | A7 | Built `5075024` from this row (Dylan, 2026-10-17); header + board (plan: `docs/plans/A7b add word header and board plan.md`) |
| A7c | Search words in a topic | `TopicWordSearch` | Built | From the new search button in the A7 header. Only this topic's words; matches the English word **or** the Vietnamese meaning. Results = A7 word rows (stage, next watering). "Not in this topic yet" → Plant here (Add word with the word filled in). Cancel → A7. | A7, A7b | Built `dd973a9` (plan: `docs/plans/Topics bees and search implementation plan.md`) |
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
Separate from Speaking (sentences). Starts from "Bees are waiting" on A7. EN + VI boards (`…Vi`); iPad boards iP1–iP4, iP2b in §2.2. Plan: `docs/plans/Pronunciation stepping stones implementation plan.md`.

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

#### Seeds & Harvest — page "Adult · Seeds & Harvest" (English only until Phase 3)
| ID | Screen | File | Status | What's on it | Goes to | Build status |
|---|---|---|---|---|---|---|
| S1 | Fruit drops seeds | `SeedDrop` | Built | Right after a review turns a word into fruit: the plant drops 1–2 related words (pairing, then word family, then synonym) into the same bed, each with meaning and a Hear button. "Your bed grows from 5 words to 7". | Study (Plant them now), A3 / A1 (Later) | Phase 2, branch `seeds-harvest/phase-2` |
| S2 | Bed harvest | `BedHarvest` | Built | The bed has nothing left to plant: basket art, "Your first harvest", tiles words grown / fruit / still growing, basket of every word coloured by stage (fruit / ripe / growing), "This bed stays in your garden". Share · Choose next bed. | S3, A1 (✕) | Phase 1, branch `seeds-harvest/phase-1` |
| S3 | Pick a seed packet | `SeedPackets` | Built | 3 packets: Follow the bee (most words shared with the garden), Same goal (next on the goal path), Something new (an interest not planted yet, at their level). Each: name, collection · level · word count, why line. Tap to select; "Plant <bed>" makes it the active bed. Browse all topics. | A7, A6 | Phase 1, branch `seeds-harvest/phase-1` |
| S4 | Home · Pick your next seed packet | `HomeNextPacket` | For approval | A1 when the active bed is fully planted and no packet was picked: Next up = "Pick your next seed packet" (packet icon, "Environment is fully planted · 3 beds picked for you", See seed packets). Replaces the Plant mission, so Home never shows "Plant 0". | S3 | — |
| S5 | Home · Plant with dropped seeds | `HomeDroppedSeeds` | For approval | A1 Next up "Plant 5 new words" with an "incl. 2 dropped seeds" pill when today's planting includes seeds. | A2 | — |
| S6 | Want a little more? · harvest | `TodayDoneHarvest` | For approval | A1c when all missions are done and the bed has nothing left to plant: the Plant row becomes "See your harvest · Environment is fully planted". | S2 | — |
| S7 | Harvest share card | `HarvestShareCard` (360 × 450, exported 1080 × 1350) | For approval | The image S2's Share sends: dygo, basket, "<bed> · harvested", "I grew 7 English words", words grown / fruit / days, the first words, dygoacademy.com. | — | — |

#### Landing page — page "Landing Page"
| ID | Screen | File | Status | What's on it | Build status |
|---|---|---|---|---|---|
| H3 | Landing · Phone | `LandingSeoPhone` (was `LandingV2Phone`) | Built | Marketing only, no backend calls. Order: header · Plant a word (type or tap a chip → pot blooms → word card → Save this word → Create account) · Sound familiar? (4 flip cards) · How your words grow · What do you need English for? (5 chips; Work/Travel/Daily life = Coming soon) · Features · For parents · Questions · Seed packet · footer. **Speaking (2026-10-07, For approval):** new section "Hear it. Say it. Watch it bloom." after How your words grow — demo card (sentence with *mitigate*, native waveform, Native · UK; mic → Listening… → compare: your waveform over native, amber MIT band, "In bloom · 76% match", Try again / Practise free → AU2), 3 steps Listen / Say it / Compare, privacy line; new FAQ "How does speaking practice work? Is my voice kept?". Real recording vs sample: D-8. | Built ahead of approval: Home HP-11 `9b4ee0d`, `9cb4617` (live). Speaking section built 2026-10-07 from this row's text (boards not in `source/` yet, so no `garden:diff`); demo uses a sample result, no mic (D-8), Play hidden until a real native clip exists |
| H4 | Landing · Desktop | `LandingSeoDesktop` (was `LandingV2Desktop`) | Built | Same sections, 1280 wide; hero keeps Create free account + I have an account. **Speaking (2026-10-07):** same section as two columns (text + steps left, demo card right); nav gets a "Speaking" link (no dot). | Built ahead of approval: Home HP-11 `9b4ee0d`, `9cb4617` (live). Speaking section + nav link built 2026-10-07 (see H3) |
| H3s | State variants | `LandingSeo{PlantBloomed,PainFlipped,UsesTravel,SpeakCompared}` (repo `source/` only; were `LandingV2*`) | Built | Plant-a-word bloomed (deadline), pain card flipped, Travel = Coming soon, Speaking demo in its compared state. | Built ahead of approval: Home HP-11 `9b4ee0d` (live) |

#### Legal — page "Legal"
| ID | Screen | File | Status | What's on it | Build status |
|---|---|---|---|---|---|
| LG1 | Terms of Service · desktop | `LegalTermsDesktop` | Built (voice donation text: For approval) | Short-version card, "Where do you live?" switch (Vietnam · Australia · Singapore) swapping the region note + "Your local rights", table of contents. `[[…]]` = facts Dylan still fills in. | `/terms` 2026-10-09 (see `Change Log.md`) |
| LG2 | Privacy Policy · desktop | `LegalPrivacyDesktop` | Built (voice donation text: For approval) | Same layout; PDPL / Privacy Act / PDPA rights per region. | `/privacy` 2026-10-09 |
| LG3 | Terms · phone (VI) | `LegalTermsPhoneVi` | Built (voice donation text: For approval) | Tap-to-open sections, local rights first. | `/terms` below `lg:` |
| LG4 | Privacy · phone (VI) | `LegalPrivacyPhoneVi` | Built (voice donation text: For approval) | Same as LG3. | `/privacy` below `lg:` |

#### Brand — page "Brand"
| ID | Screen | File | Status | What's on it | Build status |
|---|---|---|---|---|---|
| BR1 | Logo, favicon, app icon | `Logo*` boards | Approved | Logo "The Sprout" (option A, Dylan 2026-10-09): mark + wordmark, favicon, app icon. Files in `docs/design/brand/`. | Favicon / `icon.svg` / `apple-icon.png` live 2026-10-09 |

#### Loading — page "Loading"
| ID | Screen | File | Status | What's on it | Goes to | Build status |
|---|---|---|---|---|---|---|
| LD1 | Loading · Seed to sprout | `LoadingSprout` (`lang` tweak, no Vi file) | Built `ed2165a` | App start. Full screen, cream. The logo grows in a 4 s loop: seed → stem → leaves → the bee lands. "dygo" + rotating line (Watering your garden… / Waking the bees… / Ripening today's words…). | LD3b after 4 s; the screen when ready | — |
| LD3b | Loading · Bee's flight (slow loads) | `LoadingBeeNav` (`lang` + `tab` tweaks, no Vi file) | Built `d71799d` | Slow loads. The bee circles "dygo" on a dotted path, rotating line; **no word card**. The tab bar stays at the bottom on tab screens (tab being loaded highlighted); other screens show it without the tab bar. After 10 s: "Still loading… check your connection" + Try again. | the screen when ready | — |
| LD2 | Loading · Morning rain | `LoadingRain` | Not used | Kept on the canvas for reference only. Don't build. | — | — |

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
| D-3 | ~~Harvest by voice: which score harvests? Does it change review dates?~~ 2026-10-06: Fruit 90%+, no change to review dates. **Changed 2026-10-11 (Dylan): saying the word at 80 %+ on P4 = Pollinated. Visual only: never changes the stage or review dates. Fruit (mastered) comes only from reviews. No separate 90 % harvest; the sentence flow no longer pollinates.** Built: `1c94dae`. | SE5, A7, P4 |
| D-4 | ~~Echo challenge: show each gardener's stage, or totals only?~~ **Totals only**, keeping GR3's promise (Dylan, 2026-10-06) | SE6 |
| D-6 | Learners with no group: keep the Groups tab with the GR1b empty state, or hide it (4 tabs, older rule)? | GR1b, tab bar |
| D-7 | OB1 "Not sure?": build a 2-minute level check, or start at B1 and adjust from reviews? | OB1 |
| D-8 | Home page "Try it now": really record (mic permission + one free check per visitor) or play a pre-recorded learner sample? Copy "No sign-up needed for this demo" fits the real recording. | H3, H4 #speak |
| D-5 | ~~When approved, SE1/SE2/SE5/SE6 replace A1 / A7 / GR3 — confirm~~ **Yes** (Dylan, 2026-10-06) | SE1–SE6 |

### 2.4 Removed screens
| ID | Screen | Removed | Replaced by |
|---|---|---|---|
| H1–H2 | Home page v1 (phone, desktop) | 2026-10-06 | H3–H4 (Home v2) |
| A6c | No topics yet (`AdultTopicsEmpty`, never built) | 2026-10-17 | Not needed: onboarding plants the first bed and Topics always lists the library topics; the one-line empty text in A6 stays for an empty library |
| LD3 | Loading · Bee's flight, full screen with "While you wait" word card (`LoadingBee`, built `ed2165a`) | 2026-10-13 | LD3b |
| SP2a | Ready (listening, voice-activated start) | 2026-10-06 | SP2 countdown |
| SP2c | Checking (own screen) | 2026-10-06 | SP3 checking state |
| SP2d | Couldn't check (own screen) | 2026-10-06 | SP3 failed state |
| SE1, SE2, SE5, SE6 | Entry-point variant boards | 2026-10-07 | Merged into A1, A7, GR3 |

---

## 3. Changelog

Newest first. Format: `### YYYY-MM-DD — title` then lines tagged **Added / Changed / Removed / Decision**, with screen IDs and status.

### 2026-10-24 — S4–S7 Seeds & Harvest follow-ups (For approval)
- **Added** on the canvas page "Adult · Seeds & Harvest", second row: S4 `HomeNextPacket`, S5 `HomeDroppedSeeds`, S6 `TodayDoneHarvest`, S7 `HarvestShareCard`; `source/*.dc.html`, `reference/S4-home-next-packet`, `S5-home-dropped-seeds`, `S6-today-done-harvest`, `S7-harvest-share-card`, `tools/render.js` jobs. English only.
- **Decision** Dylan (2026-10-24) asked for the Home "Pick your next seed packet" card, the "incl. 2 dropped seeds" note, the "Want a little more?" harvest row and a share card to be drawn. Drawn by Claude from A1 / A1c's own parts; *for approval* before they are built.

### 2026-10-24 — S1–S3 Seeds & Harvest: full task, gaps closed (Built)
- **Changed** S3: always 3 packets while beds remain (an empty slot takes the next bed of the other rules); Plant <bed> opens the new bed's first planting instead of the bed page; with no bed left, the intro says so and Browse all topics is the button (no board).
- **Changed** S1 sits behind the `seed_drops` flag (`SEED_DROPS_ENABLED`, off by default) and only drops related words that have a lexicon entry with native audio; a fruit word drops once, ever.
- **Added** `seeds-harvest.md`, the build guide (every value per screen); README points to it.
- **Decision** Not built, no boards: the Home "Pick your next seed packet" card, the "incl. 2 dropped seeds" note, the "Want a little more?" harvest row and a share card image (questions for Dylan in `docs/plans/Seeds and Harvest gap map.md`). Phase 3 stopped: no Vietnamese or iPad boards for S1–S3 on the canvas.

### 2026-10-23 — S1–S3 Seeds & Harvest (Approved)
- **Added** canvas page "Adult · Seeds & Harvest": `source/SeedDrop.dc.html` (S1), `source/BedHarvest.dc.html` (S2), `source/SeedPackets.dc.html` (S3); `reference/S1-seed-drop`, `reference/S2-bed-harvest`, `reference/S3-seed-packets`, `reference/S3-seed-packets-goal` (`pick: 'goal'`), `tools/render.js` jobs. English only: the Vietnamese and iPad boards are the plan's Phase 3.
- **Decision** A small bed must never leave "Plant N new words" empty. Fruit drops related words into the bed (S1), and a bed with nothing left to plant ends in a harvest (S2) and a choice of 3 seed packets for the next bed (S3). *Approved (Dylan, 2026-10-23).* Product plan: doc "Dygo Word Garden: Seeds & Harvest plan". Build plan: `docs/plans/Seeds and Harvest implementation plan.md`. Phase 1 = S2 + S3, Phase 2 = S1.
- *Built* S2 + S3 (Phase 1, branch `seeds-harvest/phase-1`, 2026-10-23): `/topics/[id]/harvest`, `/topics/[id]/packets`, new `user_beds` and `/beds` API. Screenshots at 390 × 844 match `reference/S2-bed-harvest`, `S3-seed-packets` and `S3-seed-packets-goal` with 0 differing pixels. Open: Q-24 to Q-29 in `docs/design/QUESTIONS.md`.
- *Built* S1 (Phase 2, branch `seeds-harvest/phase-2`, 2026-10-24): `/topics/[id]/seeds?word=…`, shown when a watering session ends with a new fruit that dropped seeds; `word_relations` + `seed_drops`, planting order bed words then seeds. Screenshot at 390 × 844 matches `reference/S1-seed-drop` with 0 differing pixels. Content: `npm run relations-import` (only editor-reviewed rows drop). Open: Q-30 to Q-36.

### 2026-10-18 — P1–P4 Pronunciation: every stone fits its text (Built)
- **Changed** `source/PronStonesResult(Vi).dc.html`: `result` gets `long` (conditional, con · DI · tio · nal) and `one` (a word with no syllable split, one wide stone). **Added** `reference/P4-result-long-word(-vi)`, `reference/P4-result-one-stone(-vi)`, `tools/render.js` jobs.
- **Decision** A stone is always at least as wide as its text plus 0.6 × the font size each side; the boards' three-stone places stay when they fit, otherwise the row is packed in the middle and shrunk (stones and text together) to the card. Applies to every pond (P1–P4, iP1–iP4). Dylan's iPhone (2026-10-18): "CONDITIONAL" ran off its stone onto the dark water. Chosen from three ideas (A stones that fit, B words above, C word is the path). *Approved (Dylan, 2026-10-18, option A).*
- Build plan: `docs/plans/Pronunciation stones fit their text plan.md`.
- *Built* 2026-10-18 (see `Change Log.md`): `layoutStones` sizes each stone to its text; backend splits words whose IPA has no syllable dots.

### 2026-10-18 — A1c Missions done, words still thirsty (Built)
- **Added** `source/AdultTodayDone(Vi).dc.html`, `reference/A1c-today-done(-vi)`, `tools/render.js` jobs.
- **Decision** A learner who finished all of today's missions while words are still due (new words come back due minutes after planting) saw A1 with nothing to tap; A1b only shows when nothing is due. A1c keeps A1 and adds the "Want a little more?" list under the missions card: Water N thirsty words (new, water tone) · Plant 5 new words · Say 3 sentences. A1b keeps its three rows (with Quiz a bed). *Approved (Dylan, 2026-10-18).*
- Build plan: `docs/plans/A1c missions done want more implementation plan.md`.
- *Built* 2026-10-18 (see `Change Log.md`): `showMoreOnHome` (all missions done and `due_now > 0`) adds the list to A1; shared `MoreList` for A1b and A1c. The Plant row follows A1b's daily allowance, so it is hidden once today's Plant mission is done.

### 2026-10-17 — A4 This week: weekly missions (Built)
- **Changed** A4 Weekly harvest → **This week**: 3 weekly missions on top — **Rescue wilting words** (3, leech drill), **Use it in a sentence** (3 accepted sentences, SP1), **Sound of the week** (5 pollinated words with the week's sound, P1–P4; v1 = a fixed rotation of sounds hard for Vietnamese learners, personal sound is v2). Finish all 3 → +1 rain barrel (max 3 held; Monday refill keeps it). Fallback when no wilting words: "Water 20 words".
- **Changed** below the missions: week plants (smaller), Golden Bloom seed-pack line, Road to Band 7 (smaller). **Removed** the rain barrel and group tiles. Daily missions stay on A1. Missions only link to existing screens (bees and sentences stay on A7).
- *Approved (Dylan, 2026-10-17).* Build: `docs/plans/A4 weekly missions implementation plan.md`. References `A4-weekly-harvest(-vi)` (updated), `A4-weekly-harvest-done(-vi)` (new).
- *Built* `592d1a9` (2026-10-17): `GET /missions/weekly`, migration `20261017_weekly_missions.sql` (needs applying on UAT before deploy). `garden:diff` A4-weekly-harvest 0.043 % EN / 0.001 % VI, -done the same (pass). Open: Q-21 (personal sound, v2), Q-22 (Water fallback row has no board), Q-23 (Rescue goal when fewer than 3 words wilt) in `docs/design/QUESTIONS.md`.
- *Changed after UAT (Dylan, 2026-10-18):* the week's daily-mission plants are dropped (they repeated A1 and gave nothing to do); the seed-pack line moves into the missions card under "+1 rain barrel". The `AdultMissions` A4 boards and references still draw the plants, so `garden:diff` A4 fails until they are re-exported.

### 2026-10-17 — A6c No topics yet: dropped
- **Removed** A6c No topics yet (Dylan). A learner can't reach an empty Topics screen: onboarding plants the first bed from the goal, `GET /topics` always includes the library topics, and empty filters are hidden. The existing one-line empty text in A6 stays for an empty library (dev data only). Boards deleted from the canvas; **don't build A6c**.

### 2026-10-17 — A7b Add word: header + board (Built)
- **Fixed (to build)** the sheet's title and ✕ go off screen on phones (keyboard opens during the slide-in). `BottomSheet` keeps its header above the keyboard (visual viewport), the field is focused after the slide-in. Applies to all sheets.
- **Added** boards `AdultAddWord(Vi)` to `source/` (Q-19 resolved): header "Plant a new word" / "Type a word you met today" + ✕ (same in the planted state); word card with IPA · part of speech, level, play button, meaning, example; "Plant it in" chips; clay "Plant in {bed}"; planted state with "Plant another" / "Done" side by side. References `A7b-add-word(-planted)(-vi)`.
- *Approved (Dylan, 2026-10-17).* Build: `docs/plans/A7b add word header and board plan.md`.
- **Built** (Claude Code, 2026-10-17): as the boards, except the "Not the right meaning? Write your own" link (no custom-meaning flow yet, Q-20). The ✕ in every `BottomSheet` is now 20 px, as the canvas.

### 2026-10-17 — A7b Add word (Built `5075024`)
- **Changed** A7b *For approval* → built on Dylan's request from the inventory line (no `AdultAddWord` board, Q-19): seed card with the word, IPA, part of speech · level and meaning (new `GET /words/lookup`); "Plant in" bed chips (this bed, My words, other beds the learner can add to); "Already in {bed}."; planted state (seed drops into the soil, "Plant another word" / "Done"). EN / VI / ZH.

### 2026-10-17 — A6b Search topics: finish (Built `3729cd3`)
- **Changed** "Looking for a word?" searches the words of all the learner's beds (new `GET /topics/word-search`), not only the beds opened this visit, so it shows whenever a word matches (English word or meaning).
- **Changed** "Your topics" card = the A6 card (grows, name up to 2 lines, due pill top-right); "More topics to plant" names up to 2 lines, Plant button stays put. Boards `AdultSearch(Vi)` redrawn with the new card; references `A6b-search-topics(-vi)` updated.
- *Approved (Dylan, 2026-10-17).* Build: `docs/plans/A6b search topics finish plan.md`.

### 2026-10-17 — A6 Topics: fixed filter groups, long names (Built `d1c8402`)
- **Changed** A6 Topics filters: fixed groups instead of one chip per library collection: **All · Mine · Academic · General · Work · Travel · Shared** (VI: Tất cả · Của tôi · Học thuật · Tổng quát · Công việc · Du lịch · Nhóm). Mine = beds the learner created; Shared = beds from their groups; Academic / General / Work / Travel = the library shelf of the bed's collection. A chip shows only when it has at least one bed (All always).
- **Changed** the chip row is a sideways slider when it doesn't fit (never wraps), with a cream fade on the edge that has more; the selected chip scrolls into view. Chips 38 px, 12 px side padding, max 200 px then "…".
- **Changed** bed card: name up to 2 lines then "…"; card grows from 76 px; due pill stays top-right on one line; meta line one line. Same card in A6b search results.
- **Changed** boards `AdultTopics(Vi)` now show this design (6 long-named demo beds, 7 filters, `filter` tweak); the separate A6d boards were folded into A6. *Approved (Dylan, 2026-10-17).* Build: `docs/plans/Topics filters and long names implementation plan.md`. References `A6-topics(-vi)` (updated), `A6-topics-filter-travel`, `A6-topics-filter-shared-vi` (new). *Built `d1c8402`, deployed to UAT 2026-10-17 with migration `20261017_library_shelf`.*

### 2026-10-13 — Loading: LD3b replaces LD3 (Built `d71799d`)
- **Removed** LD3 Bee's flight full screen with the "While you wait" word card (Dylan). Board deleted from the canvas; `source/LoadingBee.dc.html` kept for history.
- **Added** LD3b Bee's flight (`LoadingBeeNav`): same bee orbit and lines, no word card, the art centred above the **tab bar**, which stays on tab screens (Garden, Missions, Topics, Groups, Profile) with the tab being loaded highlighted, so the learner can still switch tab. Screens without a tab bar (Review, Quiz, Speak, Join, onboarding) show the same art without it.
- Unchanged: LD1 full screen at app start, timings (400 ms / 4 s / 10 s), continue-the-wait, slow message + Try again, reduced motion.
- *Approved (Dylan, 2026-10-13); built `d71799d`, tab bar width fix in the next commit.* Build: `docs/plans/Loading screen LD3b implementation plan.md`. References `LD3b-loading-bee-nav(-vi)`, `LD3b-loading-bee-nav-topics` replace `LD3-loading-bee(-vi)`.

### 2026-10-13 — Loading screen: LD1 Seed to sprout + LD3 Bee's flight (Built `ed2165a`)
- **Added** canvas page "Loading" with three full-screen ideas; Dylan picked **LD1 for app start** and **LD3 for slow loads**. LD2 Morning rain is not used.
- Flow: app start → nothing for 400 ms → LD1 → still loading at 4 s → LD3 → at 10 s the slow message + Try again. Later loads in the same session keep today's spinner / tab skeleton (tab bar stays, `f050396`) and switch to LD3 only after 2.5 s. No minimum time: a ready screen is never held back.
- Reduced motion: still frames, first line only. Screen readers hear "Loading your garden…" once. Pure CSS/SVG.
- *Approved (Dylan, 2026-10-13); built `ed2165a`, anchor fix in the next commit.* Build: `docs/plans/Loading screen implementation plan.md`. Sources `source/LoadingSprout.dc.html`, `source/LoadingBee.dc.html`; references `LD1-loading-sprout(-vi)`, `LD3-loading-bee(-vi)`.

### 2026-10-12 — Onboarding: no "Say 5 words", no First bed row (Built `40a151d`)
- **Removed** OB4b Say 5 words (Dylan: it doesn't help). Board deleted from the canvas; `source/OnboardVoice(Vi).dc.html` kept for history. Voice donation is offered only on AU2 (sign-up box) and A8e (Profile › Privacy); donated recordings come from normal pronunciation practice.
- **Changed** OB4 Reminder: "Remind me at …" and "Not now" → OB5. **Changed** OB5 Ready: summary is Level, Goal, Reminder; the "First bed" and "Sounds" rows are removed (the bed is still picked from the goal and shows in Topics).
- Flow: AU2 → OB1 About you → OB4 Reminder → OB5. *Approved (Dylan, 2026-10-12).* Supersedes the OB4b entry below.

### 2026-10-11 — Onboarding: 2 steps (Built `40a151d`)
- **Removed** OB3 First bed (Dylan: keep it simple). The first bed is picked from the goal: IELTS → Environment, Work → Work & careers, Travel → Travel, Just for me → Everyday life (or the closest library topic). OB5 shows "First bed · Environment · picked for IELTS · Change" → Topics (A6). Board deleted from the canvas; `source/OnboardBed(Vi).dc.html` kept for history.
- Header is now 2 stages (seed → sprout). Flow: AU2 → OB1 About you → OB4 Reminder → (OB4b Say 5 words) → OB5. *For approval.*

### 2026-10-11 — Onboarding: 3 steps instead of 4 (For approval)
- **Changed** OB1 → **About you**: level (4 compact tiles) + goal chips on one screen; IELTS target band inline only when an IELTS goal is picked. Test day removed from onboarding (Profile header already has "Test day: add date").
- **Removed** OB2 Goal (merged into OB1). Board deleted from the canvas; `source/OnboardGoal(Vi).dc.html` kept for history.
- **Changed** OB3 First bed: 3-step header, back → OB1. **Changed** OB4 Reminder: 3 choices (Morning 7:30 / Lunch 12:30 / Evening 21:00) + "Remind me at …" + Not now; phone notification by default; Zalo / Email and custom time move to Profile › Reminder (A8c). Continue / Not now → OB4b (bonus, Skip) → OB5.
- **Changed** OB5: Goal "Change" → OB1. Flow is now: AU2 → OB1 About you → OB3 First bed → OB4 Reminder → (OB4b Say 5 words) → OB5. *For approval.*

### 2026-10-11 — Onboarding: OB4b "Say 5 words" (voice data, For approval)
- **Added** OB4b Say 5 words (`OnboardVoice(Vi)`), an optional bonus step after OB4 Reminder (Skip any time; OB4 "Continue" → OB4b, "Not now" → OB5). The learner reads 5 set words (think · ship · world · very · sixth: th, sh, final consonants, v), one at a time with the mic; result = mic check + "Sounds to practise first", which seeds the first bees.
- Voice data: the quiet unticked box "Let Dygo keep these 5 and my future speaking recordings to help improve speaking scores. Optional. Learn more". The 5 recordings stay on the device until this screen; they're uploaded to the donation store **only if ticked**, otherwise dropped. "Where did you grow up?" (North / Central / South / Elsewhere) appears only when ticked. Same consent as AU2 / A8e (method `onboarding`); reflects the AU2 choice if already given.
- **Changed** OB5 Ready: new row "Sounds · th · final d · Redo". *For approval.* Build: `docs/plans/Voice donation consent plan.md`, Part 4 (behind the voice-donation flag for the box; the 5-word step itself can ship without it).

### 2026-10-11 — Legal: optional voice donation (screens Approved; legal text behind a flag until a lawyer's review)
- **Changed** LG1–LG4 (canvas): Terms and Privacy now describe **optional voice donation**: learners 16+ can turn on "Help improve Dygo's speech checker" in Profile › Privacy so Dygo keeps their speaking recordings to train its own speech checker. Off by default; child profiles never; random code instead of name; some recordings may be listened to by trained people; up to [[3 years]]; turn off or delete any time. Sections changed: Terms short list, 07 Speaking practice (+ licence); Privacy short list, 02 table row + note, 03 Children, 04 Your voice, 05 sharing, 08 rights, 09 automated decisions, 11 local rights (VN · AU · SG). "Me ›" → "Profile ›". *For approval (Dylan, after a lawyer's review).*
- **Changed** AU2 Create account (EN + VI): optional, unticked "Help improve Dygo's speech checker" box; terms line links Terms + Privacy. **Changed** A8 Profile: new "Privacy & data" row (calendar squares and rows slightly smaller to fit). **Added** A8e Privacy & data (`AdultPrivacy(Vi)`): "Donate my voice" switch (off, no icon), confirm sheet, donated count + delete, Your data links. *Approved (Dylan, 2026-10-11).* Build: `docs/plans/Voice donation consent plan.md`, everything behind `NEXT_PUBLIC_VOICE_DONATION` / `VOICE_DONATION_ENABLED` (off).
- **Changed** AU2 sign-up box made quiet (plain checkbox + one grey line, no card): "Let Dygo keep my speaking recordings to help improve speaking scores. Optional. Learn more"; no mention of Vietnamese speakers. A8e line → "Helps improve Dygo's speaking scores · Optional". *Approved (Dylan, 2026-10-11).* Built version (`e49308a`) still has the old copy: needs a follow-up.
- **Don't build on the site yet:** the text must go live in the same release as the Profile › Privacy setting and the data handling. Plan and exact EN + VI text: `docs/plans/Voice donation consent plan.md`.
- `source/`: LegalTermsDesktop, LegalPrivacyDesktop, LegalTermsPhoneVi, LegalPrivacyPhoneVi updated.

### 2026-10-11 — Pronunciation: say one word (Stepping stones)
- **Added** P1 Say the word, P2 Recording, P2b Couldn't hear you, P3 Checking, P4 Result (retry / pollinated), new canvas page "Adult · Pronunciation". A **new feature, separate from Speaking (sentences)**: the learner says one word; one stone per syllable, the big stone = the stressed part; the result shows which stone wobbled. Three directions were drawn (stones, bee flight, sound tiles); Dylan chose the stones, the simplest. *Approved (Dylan, 2026-10-11).*
- **Changed** A7 Bees: a bee's mic and "Say all" open P1, not SP1 (the built Bees `b40ac02` still open the sentence flow). *Approved.*
- **Decision** D-3 changed: **80 %+ = Pollinated, visual only**; Fruit only from reviews; no 90 % harvest. *(Dylan, 2026-10-11)*
- **Added** Vietnamese boards (`PronStones…Vi`) and iPad boards iP1–iP3 (`iPadPron`), iP4 (`iPadPronResult`), iP2b (`iPadPronNotHeard`), EN + VI. VI buttons: "Giọng của tôi" / "Giọng bản xứ" (short, so they fit). *Approved (Dylan, 2026-10-11).*
- `source/`: PronStones, PronStonesRecord, PronStonesChecking, PronStonesResult, PronStonesNotHeard. `reference/`: P1-say-word, P2-recording(-beep), P3-checking, P4-result-retry, P4-result-pollinated, P2b-not-heard(-noisy, -other-word), each with `-vi`; iPad iP1-say-word, iP2-recording, iP3-checking, iP4-result-retry, iP4-result-pollinated, iP2b-not-heard (+ `-vi`); render jobs added.
- Build plan: `docs/plans/Pronunciation stepping stones implementation plan.md`: 1 word check on the speech server + backend, 2 the screens, 3 wire the Bees + the 80 % rule.
- **Built** Part 1, word check on the speech server + `POST /speaking/word-check`, syllables, 80 % rule: `9c6c681`.
- **Built** Part 2, P1–P4, P2b and iP1–iP4, iP2b (phone + iPad, EN / VI / ZH): `24396d0`, lint fix `cbd0d7a` (no mic explainer card: the phone asks on the first tap; iPad eyebrow "Pronunciation · {bed}" when opened from a bed).
- **Built** Part 3, A7 bees open P1 and rows show the syllables; D-3 one 80 % rule (the sentence flow no longer pollinates): `1c94dae`.

### 2026-10-11 — Topics: pronunciation bees, two searches, Profile tab
- **Changed** A7 / iA7 (EN + VI): "Ready to harvest" (SE5) becomes **"Bees are waiting"** — same place, one list (Dylan: a bee on every word row would make the words to say hard to find). Each row: ripe flower with a bee, the word, its syllables with the stressed one in capitals (MI · ti · gate), a mic; good attempt → gold flower centre, tick, "Pollinated · on its way to fruit"; header "Say all". At most 3 bees in the whole garden, 1–2 new a day, a bee leaves quietly after 3 days. **D-3 stays:** 90%+ shows Fruit, review dates never change. iPad: same card under Water / Quiz / Add word. *Approved (Dylan, 2026-10-11).*
- **Changed** A6b → **Search topics** (topics only) and **Added** A7c **Search words in a topic** (search button in the A7 header; English word or Vietnamese meaning; "Plant here"). Dylan: Topics searches topics, a Topic Bed searches words. *Approved (Dylan, 2026-10-11).*
- **Changed** Canvas tab "Me" → **"Profile"** (VI "Hồ sơ") on all phone and iPad boards, as on the site; board titles A8 / iA8 and page "Adult · Profile" renamed. Board sources in `source/` that weren't touched today still say "Me".
- `source/`: AdultTopicDetail(Vi), iPadTopicDetail(Vi), AdultTopics(Vi), AdultSearch(Vi), TopicWordSearch(Vi). `reference/`: A6-topics, A6b-search-topics, A7-topic-bed, A7-topic-bed-filter-sprouts, A7c-word-search (EN + VI), new render jobs. **Note:** A7 and A6 references now show the new design, so `garden:diff` for A7 fails until it's built.
- Build plan: `docs/plans/Topics bees and search implementation plan.md`.
- **Built** Part 1, A7 Bees are waiting: `b40ac02` (v1: IPA instead of syllables, max 3 bees per bed; garden-wide bees are v2).
- **Built** Part 2, A7c Search words in a topic + the A7 search button: `dd973a9`.
- **Built** Part 3, A6b Search topics: `259e19b` (Plant sows the library topic's first 5 words instead of cloning it; the word hint covers beds already opened this visit).

### 2026-10-10 — A1b boards take the streak pill and the site's wording
- **Changed** `source/AdultAllWatered(Vi).dc.html` (Dylan): header gets A1's streak pill ("23 days" / "23 ngày"); EN date "Friday, September 25", "tomorrow 7:30 AM", last tab "Profile"; VI last tab "Hồ sơ". References `A1b-all-watered(-vi)` re-exported. `garden:diff` (local): EN 0.000%, VI 0.094%.

### 2026-10-10 — A1b All watered: ready to build
- **Added** `source/AdultAllWatered(Vi).dc.html`, `reference/A1b-all-watered(-vi)`, `tools/render.js` jobs.
- **Decision** A1b replaces A1 only when `due_now = 0` **and** every mission of the day is done (Golden Bloom grown). Nothing due but missions still open → A1 (Option D card). The header keeps A1's streak pill (the board leaves it out). *Approved (Dylan).*
- Build plan: `docs/plans/A1b all watered implementation plan.md`.
- **Built** `e8b0d78`: A1b replaces A1 when nothing is due and every mission is done; resting hero (sun, butterfly, swaying flowers), Golden Bloom card + next ripening, three extras (plant 5 from the bed with the most seeds, say 3 sentences, quiz a bed). Streak pill kept. EN / VI / ZH; UAT 2026-10-10.

### 2026-10-10 — Canvas: one Welcome back board
- **Removed** the old A5 board ("Start with the 12 wilting words · Quick revive", EN + VI) from the canvas (Dylan).
- **Changed** board A5b "Welcome Back · nothing wilting" renamed **"A5 · Welcome Back"** and moved into A5's place (files `AdultComeback(Vi).dc.html` on the canvas), with the site wording from `241ac8c`. Repo files keep their names (`source/AdultComebackStart*`, `reference/A5b-welcome-back-start*`) so `garden:diff` still matches the site. **Open (Claude Code, when Dylan asks):** the site still shows the wilting "Quick revive" card when words are wilting; drop it if that case should also use Start small, then rename the A5b fixture / files to A5.

### 2026-10-10 — A5 Welcome back: finish it (A5b + rules)
- **Found** (Dylan, UAT): A5 is only half done. With 0 wilting words — the usual case, because almost nobody has leeches yet — the "Start small" card loses its title and button and shows only an underlined "Water all 45" link inside an empty white card. No time estimates ("about 5 min" from the board never shows). After missed days with nothing due, A5 still shows with no card at all.
- **Added** A5b "Welcome Back · nothing wilting" (`AdultComebackStart`, EN + VI): same screen, the card offers a short start: "Water the 10 thirstiest words first" → **Quick start · 10 words · about 4 min** (watering with only the 10 most overdue words), "Water all 45 instead" underneath. *Approved (Dylan).*
- **Decision** A5 shows only when the learner missed 2+ days **and** something is due; otherwise Today's Garden (A1 / A1b). Time estimate on A5 / A5b ≈ 25 s a word, rounded (12 → 5 min, 10 → 4 min). *Approved (Dylan).*
- **Note** A5b uses the site's current title "Your garden kept your spot." (A5 board still says "Your garden waited for you."; the site wins until Dylan fine-tunes copy).
- Build plan for Claude Code: `docs/plans/A5 welcome back implementation plan.md`.
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
