# Dygo Word Garden — Design changelog & screen inventory

Location in the repo: `docs/design/CHANGELOG.md`
Design source of truth: the **Dygo Word Garden** design canvas (owner: Dylan).
Last updated: **2026-10-06**

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

#### Sign in — page "Adult · Sign in"
| ID | Screen | File | Status | What's on it | Goes to | Build status |
|---|---|---|---|---|---|---|
| AU1 | Sign in | `AdultLogin` | Built | Email + password (Supabase `signInWithPassword`), no Google sign-in (blocked in China). Language chip top-right sets `dygo_locale` before sign-in. Show/Hide password, error state. | AU2, AU4, A1 | UI-A A-2 `a1b8332` (pixel fix `7068a9e`) |
| AU2 | Create account | `AdultRegister` | Built | Name, email, password (`signUp`); name is saved to the profile so the garden greets people by name. Terms / Privacy line. | A1, AU1 | UI-A A-3 `38665d9` |
| AU3 | Create account from an invite | `AdultRegisterInvite` | Built | Invite banner (from `?next=/join/…`), then straight into the group garden. | GR2, AU1 | UI-A A-3 `38665d9` |
| AU4 | Reset password | `AdultForgot` | Built | `resetPasswordForEmail` + set-new-password page. Sent state. | AU1 | UI-A A-4 `7a5e342` |

#### Adult core — page "Adult"
| ID | Screen | File | Status | What's on it | Goes to | Build status |
|---|---|---|---|---|---|---|
| A1 | Today's Garden (Home) | `AdultHome` | Built | Greeting + streak. Garden card (every word as a plant, counts: thirsty / ripe / wilting). **3 daily missions** (review due, learn new, 1 quiz) → finishing all 3 grows the **Golden Bloom**. "Continue mission" button. "Tomorrow 7:30 · N words ripen". | A2, tabs | UI-4 `4b701fd`, `6e7eb53`; iPad home `48912ed` |
| A2 | Watering (Review) | `AdultReview` | Built | Flashcard: word (Fraunces), IPA, CEFR, topic, meaning (English; Vietnamese meaning first when app language is vi), example, synonyms. 4 ratings with next interval: Again / Hard / Good / Easy. Vine progress = mission progress. | A3, A1 | UI-4; keyboard shortcuts U7-3 `51b6180`. Phase 13 "Say this one?" added S11 `bc38bff`, removed 2026-10-06 `0e47e01` |
| A3 | Mission Complete | `AdultBloom` | Built | Bloom animation, stats, streak +1, "1 mission left for Golden Bloom" with a 3-min button, reminder toggle for when words ripen. | A1, A2 | UI-4 `6e7eb53`; reminder switch UI-6 U6-7b `c96515a` |
| A4 | Weekly Harvest | `AdultMissions` | Built | 7 day-plants (0–3 missions each), full week unlocks a seed pack, Road to Band 7 (mastered / target), rain barrel (streak freezes), study-group card → GR2. | GR2, tabs | UI-6. Phase 13 Sound Garden card added S10 `1968f24`, removed 2026-10-06 `0e47e01` |
| A5 | Welcome Back | `AdultComeback` | Built | No guilt: streak freeze kept the streak; wilting = most overdue only; "Quick revive, 5 min"; escape hatch "Water all 42". | A2, tabs | UI-6 |
| A6 | Topics (Beds) | `AdultTopics` | Built | Each topic = a garden bed: stage icon, fruit/flower/sprout bar, due badge, locked seed pack. Filters: All / IELTS Academic / Mine. | A7, tabs | UI-5 (wrap-up `58ab14f`) |
| A7 | Topic Bed | `AdultTopicDetail` | Built | 4 stage tiles (New / Learning / Review / Mastered, tap to filter), words sorted by next due, wilting = leech. Water N due, Quiz, + Add word. | A2, Q1, A6 | UI-5 (wrap-up `58ab14f`); Quiz + leech drill U5-6 `5f016d7` |
| A8 | Me | `AdultMe` | Built | Garden calendar (16 weeks), keepsakes, settings (daily goal, reminder time, meaning language), Family → kid's garden. Gear → Account sheet (who's signed in + Sign out). | Kids, AU1, tabs | UI-6; Account sheet SO-1 `e8fea77` |

#### Groups — page "Adult · Groups"
| ID | Screen | File | Status | What's on it | Goes to | Build status |
|---|---|---|---|---|---|---|
| GR1 | Shared Gardens | `AdultGroups` | Built | Group list with your role and your due words in shared beds; rain-day banner; Start a garden; Join with a link. | GR2, GR6, GR7 | UI-G (2) `f064042`, live (5) `92e86bb`; rain day banner RD-4 `97ad9c1` |
| GR2 | Group Garden | `AdultGroupGarden` | Built | Group totals only (never one person's progress), shared beds → A7, gardener avatars + Invite, admin gear → GR3/GR4. | A7, GR3, GR5 | UI-G (2) `f064042`, live (5) `92e86bb` |
| GR3 | Tricky Patches + Rain Day | `AdultGroupTricky` | Built | Most-missed words (totals only); Call a rain day: words per gardener, Start rain day → sent state. | GR2, GR4 | UI-G (2) `f064042`; rain day RD-1–RD-4 (`97ad9c1`) |
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
| SP1 | Listen | `SpeakListen` | Built | Compact word card (word 28 px + IPA with stressed syllable in amber, C1/verb tags, meaning — VI: Vietnamese meaning first). **"Say this sentence"** card (22 px, target word highlighted). Native-speaker card: sentence waveform (target word band tinted), Play, UK/US and 1× / 0.75× chips. Clay mic button. No timer on this screen. | SP2, A7 | Phase 13 S7 `0bdec5e`, v2 `a14c1d1`; no fixture page yet (S18b closed as is) |
| SP2 | Speaking (3·2·1·beep) | `SpeakRecording` | Built | Sentence stays visible. **Countdown 3 · 2 · 1** over the empty waveform ("Get ready · Recording starts after the beep · tap to start now"); tap skips. Beep + haptic, mic turns clay, recording starts just after the beep. Then: follow-along sentence, live clay waveform over pale native shape, elapsed time only (**no time limit**), stress tip, Stop; "or just pause, it stops by itself" (~2 s silence). Cancel → SP1. | SP3, SP1 | v2 S15 `a14c1d1`; silent-switch fix `5e5852c`; pixel diff en 0.06 / 0.40 %, vi 0.12 / 0.46 % (pass) |
| SP3 | Compare (result fills in) | `SpeakCompare` | Built | Opens immediately after stop. Waveforms + replay work at once. Result area has 3 states: **checking** (shimmer + "Checking your sentence…" + "Your recording is checked, then deleted."), **done** (word marks: green = fine; amber `MIT is too soft`; dashed + struck `missing`; `heard "affects"`; amber bands on waveform; garden-stage score "In bloom · 76% match"; one tip), **failed** (inline card: Check again / Record again). Overlay / Side by side switch. Replay buttons: **Native · UK** (globe avatar) and **You** (learner's initial avatar). Try again → SP2, Next word. Design file has a `result` tweak (auto/checking/done/failed) for review only. | SP2, SP1, SP4 | v2 S18 `a14c1d1`, server check `be6a008`, scoring M4 `81dd0ff`; pixel diff 0.5–1.4 % accepted (S18b) |
| SP4 | Speaking done | `SpeakDone` | Built | One plant per sentence (best stage), list with mini waveform + best %, one "Pattern to watch", Back to garden. | A1 | Phase 13 S8 `e03aac9`; no fixture page yet |
| SE1 | Entry · Home speaking mission | `EntryHome` | Approved | A1 with the 3rd mission as **"Say 3 ripe words · 2 min"** (clay mic, light clay highlight), still counts to Golden Bloom; rotates with Collocation challenge. | SP1 | |
| SE2 | Entry · Topic bed Speak | `EntryBed` | Approved | A7 with a full-width **"Speak · 5 sentences from this bed"** row under Water / Quiz / + . | SP1 | |
| SE5 | Entry · Harvest by voice | `EntryHarvest` | Approved | A7 with a **"Ready to harvest"** card: ripe Flower words, each with a mic; saying it well turns it into Fruit. | SP1 | |
| SE6 | Entry · Echo challenge | `EntryEcho` | Approved | GR3 with an **Echo challenge** card (trickiest word, each gardener's best stage, "3 of 5 done", Say it). Tricky list trimmed to 2 rows. | SP1 | |

#### Public home page — page "Home Page"
| ID | Screen | File | Status | What's on it | Build status |
|---|---|---|---|---|---|
| H3 | Home v2 · phone | `LandingV2Phone` | For approval | Marketing only, no backend calls. Order: header · Plant a word (type or tap a chip → pot blooms → word card → Save this word → Create account) · Sound familiar? (4 flip cards) · How your words grow · What do you need English for? (5 chips; Work/Travel/Daily life = Coming soon) · Features · For parents · Questions · Seed packet · footer. | Built ahead of approval: Home HP-11 `9b4ee0d`, `9cb4617` (live) |
| H4 | Home v2 · desktop | `LandingV2Desktop` | For approval | Same sections, 1280 wide; hero keeps Create free account + I have an account. | Built ahead of approval: Home HP-11 `9b4ee0d`, `9cb4617` (live) |
| H3s | State variants | `LandingV2PlantBloomed`, `LandingV2PainFlipped`, `LandingV2UsesTravel` | For approval | Plant-a-word bloomed (deadline), pain card flipped, Travel = Coming soon. | Built ahead of approval: Home HP-11 `9b4ee0d` (live) |

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

### 2.3 Open decisions (don't build until decided)
| # | Question | Affects |
|---|---|---|
| D-1 | Speech-recognition service: must work from Vietnam + mainland China; cost per check | SP2, SP3 |
| D-2 | "Native speaker" vs "Native accent / Giọng bản xứ" wording while audio is text-to-speech | SP1, SP3 |
| D-3 | ~~Harvest by voice: which score harvests (Bloom 70%+ or Fruit 90%+)? Does it change review dates?~~ **Fruit 90%+, no change to review dates** (speaking stays visual only, D5) (Dylan, 2026-10-06) | SE5 |
| D-4 | ~~Echo challenge: show each gardener's stage, or totals only?~~ **Totals only**, keeping GR3's promise (Dylan, 2026-10-06) | SE6 |
| D-5 | ~~When approved, SE1/SE2/SE5/SE6 replace A1 / A7 / GR3 — confirm~~ **Yes** (Dylan, 2026-10-06) | SE1–SE6 |

### 2.4 Removed screens
| ID | Screen | Removed | Replaced by |
|---|---|---|---|
| H1–H2 | Home page v1 (phone, desktop) | 2026-10-06 | H3–H4 (Home v2) |
| SP2a | Ready (listening, voice-activated start) | 2026-10-06 | SP2 countdown |
| SP2c | Checking (own screen) | 2026-10-06 | SP3 checking state |
| SP2d | Couldn't check (own screen) | 2026-10-06 | SP3 failed state |

---

## 3. Changelog

Newest first. Format: `### YYYY-MM-DD — title` then lines tagged **Added / Changed / Removed / Decision**, with screen IDs and status.

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
