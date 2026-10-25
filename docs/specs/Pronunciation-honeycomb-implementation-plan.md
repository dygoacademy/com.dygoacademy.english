# Plan: Pronunciation flow redesign, from stepping stones to honeycomb (P1, P2, P2b, P3, P4)

> Put this file in the repo at `docs/specs/Pronunciation-honeycomb-implementation-plan.md`. It **replaces** `P4-honeycomb-result-implementation-plan.md` and supersedes the visual parts of `Pronunciation stepping stones implementation plan.md`. Recording rules, scoring thresholds and the flow are unchanged.
>
> Suggested prompt for Claude Code:
> *"Read `docs/specs/Pronunciation-honeycomb-implementation-plan.md`. Do Phase 0 and report back before writing code. Then implement phase by phase, committing after each phase. Ask me before changing the backend scoring contract and before any UAT deploy."*

Design reference: Design canvas → page **Adult · Pronunciation** → artboards P1 `PronStones`, P2 `PronStonesRecord`, P2b `PronStonesNotHeard`, P3 `PronStonesChecking`, P4 `PronStonesResult`. If this file and the canvas disagree, this file wins.

(Saved from Dylan's message of 2026-10-25. `P4-honeycomb-result-implementation-plan.md` was never committed to this repo, so there was nothing to delete. Phase 0 findings: `docs/reports/Pronunciation honeycomb phase 0.md`.)

---

## 1. What changes and why

Customer feedback:

1. **Per-syllable playback on P4 was inaccurate.** Cutting audio at syllable boundaries sounds wrong. → Remove it. Each syllable shows **pass / not yet + % match with native** instead.
2. **The "Whole word" controls were hard to use.** → Replace them with one consistent **listen card** pattern (two large play buttons) on P1, P3 and P4.
3. **Make the flow consistent.** → Every screen uses the same **honeycomb board**: one hexagon cell per syllable, and honey fills a cell to show progress or score. This replaces the stones on every screen. The dashed **80% pass line** appears **only on P4** (the result).

Flow (unchanged): Topic bed → **P1** Say the word → (SP0 mic permission, first time) → **P2** Recording → **P3** Checking → **P4** Result, or **P2b** Couldn't hear you.

---

## 2. Shared building blocks (build these first)

### 2.1 `HoneycombBoard`: one component, five modes

The dark green card (`#24463A`, radius 26).

- **Header row:** a title on the left (12px uppercase, `#DDE7DA`). **`result` mode only:** on the right, the legend: a dashed swatch plus "Pass line 80%" (`#F2D28B`).
- **Cells:** a 334 × 150 SVG viewBox with one pointy-top hexagon per syllable (radius 40, centre y 100), centred in equal slots. It must work for 2–4 syllables.
- **Pass line (`result` mode only):** a dashed line across the whole board at `y = cy + R − 2R × 0.8`. Never show it on P1, P2, P3 or P2b.
- **Cell text:** an HTML overlay positioned in % (crisper text and easier i18n). Stressed syllables are UPPERCASE at 21px; the others are 16px. All weight 800.
- **Bee:** the existing bee SVG at scale 1.15, hovering 4px above the cell row (~34 units from the top).
- **Clip paths:** honey is clipped to each hexagon. Use `useId()` for clip-path ids so two boards never clash.

| mode | used on | cell fill | honey | title (EN) | bee |
|---|---|---|---|---|---|
| `empty` | P1 | cream `#FBF7EC` | none | Big letters = loud part | over cell 1, hovering. Dashed "hop" path across the cell tops (`#B7D6AE`) |
| `live` | P2 | cream | **pale** honey `#F2D28B`, up to ~62%, for each part heard so far. The current cell bubbles (scaleY .82↔1, 0.5s) | Waiting for your voice → Filling as you speak | hops (translateY −10px, 0.6s) over the current cell |
| `checking` | P3 | cream | honey `#F2C744` rises and falls (scaleY .3↔1, 1.4s, staggered 0.25s per cell) | Measuring the honey | hovers over the centre |
| `dim` | P2b | `#3A5E4F`, edge `#5E7F70`, text `#DDE7DA` | none | No honey yet | over cell 1, with a gold "?" beside it |
| `result` | P4 | cream | honey to the **score %** with a wavy top. Pass/close `#F2C744`, fail `#E8A87C`. "Close" cells get a dashed gold edge | Fill each cell | flies to the tapped cell. If everything passed and nothing is selected, it flies away |

**Result mode extras (P4):**

- Each cell is a real `<button>` overlay. It shows the syllable, `NN%`, and a corner badge: ✓ on `#3E7F5A`, ✓ on `#8A6A12` when close, ✗ on `#B4552E`. The badge glyph is white.
- The selected cell gets a pulsing gold ring (`#F2D28B`, 3.5px).
- A **detail strip** under the board (`#1F3E33`, `aria-live="polite"`) shows a tag (Pass / Close / Not yet / All pass) and one sentence.

**Important:** in `live` mode the pale honey shows *that a part was heard*, not a score. Never use the result colours there.

### 2.2 `ListenCard`: the two-button play pattern

A white card (radius 22, border `#E3DDD0`) with a 2-column grid of 60px buttons. Each button has a 36px round icon on the left and a label on the right.

| screen | card heading | button 1 | button 2 |
|---|---|---|---|
| P1 | eyebrow "Listen first" + title "Hear how it sounds" | **Normal** · "Real speed" | **Slowly** · "Each part clear" |
| P3 | eyebrow "While Dygo checks" + title "Have a listen" | **Native** · "1. Listen" | **Your try** · "2. Compare" |
| P4 | *no heading, no extra text* (screen is already busy) | **Native** | **Your try** |

- **Colours.** Native, Normal and Slowly use background `#F1F6EF`, border `#C9D8C4`, a `#24463A` circle and text `#24463A`. Your try uses background `#FBF1EC`, border `#EBC7B6`, a `#B4552E` circle and text `#8A3E20`. Sub-text is `#4E5A52` (green buttons) or `#6E4A3A` (clay button).
- **States:**
  - **Idle:** play triangle.
  - **Loading:** spinner, sub-text "Loading…", `aria-busy`.
  - **Playing:** P1 makes the whole button dark green with animated level bars and sub-text "Playing, tap to stop". P3 and P4 use a slightly darker tint (`#DCEAD6` / `#F6DED2`).
  - **Tap while playing** stops the sound.
  - **Error:** inline line under the card: "Couldn't play the sound. Tap to try again."
- **No "Both" button** and **no durations** anywhere.
- **One sound at a time.** Starting one button stops the other.

### 2.3 `useExclusiveAudio()`

One audio element per screen. `play(key)`, `stop()`, exposes `{ key, state: 'idle' | 'loading' | 'playing' | 'error' }`. Stops on unmount and on route change. Slow playback uses the slow TTS/native asset if one exists, otherwise `playbackRate = 0.75` with pitch preserved.

### 2.4 Other shared pieces

`BeeMarker` (reuse the existing SVG), `PassLineLegend` (P4 only), and `ScreenHeader` (close/cancel, eyebrow, "Bee 1 of 3"). Every animation respects `prefers-reduced-motion` (static frames).

---

## 3. Screen by screen

### P1 · Say the word (`PronStones`)

Top to bottom:

1. Header: Close · "PRONUNCIATION" · Bee x of y.
2. Word (Fraunces 44px), then IPA · short meaning.
3. `HoneycombBoard mode="empty"` (no pass line).
4. `ListenCard` with Normal / Slowly.
5. Tip box (`#FBF4E4`, text `#4A3A10`): "Fill every cell with honey: say **MI** loud, **ti** light, then **gate**." Generate it from the syllables: the stressed one is "loud", the next one is "light".
6. Bottom: "Tap, then say just the word", an 84px clay mic button (→ P2), and "First time: your phone asks for the microphone".

### P2 · Recording (`PronStonesRecord`)

1. Header: Cancel (→ P1, nothing sent) · "● RECORDING" · Bee x of y.
2. Word, then prompt: "Beep! Say it now" → "Keep going…".
3. `HoneycombBoard mode="live"` (no pass line). Cells fill left to right as the voice reaches each part.
   - **How to drive it:** split the native audio duration into syllable slots by the syllable timings (or equal slots if there are none). Map the learner's *voiced* time onto those slots. A cell counts as reached once voiced time passes the start of its slot.
   - This is a progress cue only, not a score.
4. **Your voice meter** (white card, radius 18):
   - Label "YOUR VOICE" plus a status line: "Starting…" (grey, during the beep), then a blinking clay dot and "Recording" (`#B4552E`).
   - To the right, a **honeycomb strip**: 21 mini hexagons (r ≈ 9) in two staggered rows. The colour ramps left to right: `#F2D28B` → `#F2C744` → `#E8B23A` → `#E0A030`, over an empty `#EFEAE0`.
   - **Drive it from the live mic level:** RMS from an `AnalyserNode`, smoothed at about 60 fps. Light up the first *N* hexes where *N* = level × 21, with a short decay so it ripples.
   - Before speech starts, all hexes are empty.
   - Never show quality words like "good" or "clear" here.
5. Bottom: status text ("Say "mitigate" now" → "Listening…"), and the stop button (84px clay) with a 4s countdown ring and a pulse ring. Caption: "Stops by itself when you finish · or tap to stop".

Recording rules (unchanged):

- One word only.
- Beep plus a short vibration, then record.
- Auto-stop after ~1s of silence following speech, or at 4s max, or on tap.
- Less than 0.3s of voice → P2b.
- Otherwise → P3.
- The recording is deleted after checking.

### P3 · Checking (`PronStonesChecking`)

1. Header with **no close button** (it's 1–2 s) · "PRONUNCIATION" · Bee x of y.
2. Word, then "Got it. Checking each cell…".
3. `HoneycombBoard mode="checking"` (no pass line).
4. `ListenCard` titled "While Dygo checks · Have a listen" with Native / Your try. Both work here.
5. Bottom: three pulsing dots and "Usually 1–2 seconds".
6. **Server error:** inline "Check again / Record again" (same pattern as SP3).

### P2b · Couldn't hear you (`PronStonesNotHeard`)

1. Header: Close · "PRONUNCIATION" · Bee x of y.
2. `HoneycombBoard mode="dim"` (no pass line, 8px extra top margin).
3. Title (Fraunces 28px), body, and a white card with two numbered tips. The text depends on the reason:

| reason | title | body | tip 1 | tip 2 |
|---|---|---|---|---|
| quiet | We couldn't hear you | The bee heard almost nothing. | Hold the phone about a hand away from your mouth | Speak a little louder than normal |
| noisy | Too noisy to hear | There was a lot of sound around you. | Move somewhere a bit quieter | Speak close to the phone, then wait for the beep |
| otherWord | That sounded like another word | We heard "{heard}". Say just "{word}". | Tap Hear it and copy the native speaker | Start with the loud cell: {stressed} |

4. "This try doesn't count. Nothing is lost." (`#3E7F5A`).
5. CTA: **Try again** (→ P2). Link: **Hear the word first** (→ P1).

### P4 · Result (`PronStonesResult`)

1. Header: Close · "PRONUNCIATION" · Bee x of y.
2. Result headline block (pops in on pass):
   - Badge: "Hive full · n of n cells" (green `#DDE7DA` / `#24463A`) or "Almost · k of n cells" (`#FBF4E4` / `#6B5215`).
   - Headline (Fraunces 30px).
   - **One short sub line that never repeats the syllable score.** The detail strip owns that.
3. `HoneycombBoard mode="result"` with the pass line, its legend, and the detail strip.
4. **Listen & compare card. No text inside except the button labels.**
   - **Mirror waveform** (330 × 70) on the left: 40 native bars above a centre line (`#3E7F5A`) and 40 learner bars below it (`#B4552E`).
   - On retry/close, the weak syllable's zone is tinted `#FBEFE9` with a tiny syllable tag (`#8A3E20`).
   - **Match ring** (54px) on the right: the overall % in the middle. The arc is `#3E7F5A`, or `#E0A030` on retry.
   - Below: `ListenCard` buttons **Native** and **Your try**.
   - **Waveform data:** decode both audio files with the Web Audio API, take 40 RMS buckets each, normalise to 0–1, and cache by URL (`useAudioEnvelope(url, 40)`). If timings are missing, place the weak zone by equal syllable slots. If decoding fails, show a flat skeleton row and keep the rest of the screen working.
5. Actions: one main CTA plus one text link (see §5).

Default selection:

- **Pass:** nothing selected. The strip says "All pass".
- **Almost / retry:** the weakest syllable is selected.
- Tapping a cell selects it. **Tapping a cell never plays audio.**

---

## 4. Scoring rules (`lib/pronunciation/pronunciationResult.ts`)

```ts
export const PASS_MARK = 80;   // syllable passes at >= 80
export const CLOSE_BAND = 5;   // 80–84 = close (passes, show a polish hint)

syllableStatus(score) = score < 80 ? 'fail' : score < 85 ? 'close' : 'pass';
resultKind(syls)      = any fail ? 'retry' : any close ? 'almostPerfect' : 'pass';
overall               = scorer's word score if provided, else round(mean(syllable scores));
```

Keep the thresholds in config. Unit-test 79 / 80 / 84 / 85.

**Data contract needed by P4.** Map it to the current endpoint in Phase 0. Don't change NestJS without asking.

```ts
interface PronunciationResult {
  word: string;
  syllables: { text: string; stressed: boolean; score: number; heardIpa?: string | null; targetIpa: string; startMs?: number; endMs?: number }[];
  overallScore?: number;
  nativeAudioUrl: string;  slowAudioUrl?: string;
  learnerAudioUrl: string;
  round: { index: number; total: number; nextWord?: string };
}
```

If the wav2vec2 GOP scorer doesn't return per-syllable scores yet, add a mock adapter behind `NEXT_PUBLIC_PRON_MOCK=1`:

| word | syllables | pass scores | weak | retry | close |
|---|---|---|---|---|---|
| mitigate | MI · ti · gate | 95, 91, 94 | ti | 56 (/taɪ/ → /tɪ/) | 82 |
| compensation | com · pen · SA · tion | 93, 90, 92, 95 | SA | 56 (/sæ/ → /seɪ/) | 82 |
| cloudy | CLOU · dy | 96, 93 | dy | 41 (cut short → /di/) | 82 |
| sunny | SUN · ny | 94, 92 | ny | 56 (/naɪ/ → /ni/) | 82 |

---

## 5. Copy: EN + VI draft

All strings go in i18n. ZH keys fall back to EN. Check the existing VI glossary for bee / pollinate / bed terms and reuse it where it differs from the drafts below.

| key | EN | VI (draft) |
|---|---|---|
| comb.passLine (P4 only) | Pass line {mark}% | Vạch đạt {mark}% |
| comb.title.empty | Big letters = loud part | Chữ to = phần đọc mạnh |
| comb.title.live.wait / live | Waiting for your voice / Filling as you speak | Đang chờ giọng bạn / Đang lấp đầy khi bạn nói |
| comb.title.checking | Measuring the honey | Đang đo mật |
| comb.title.dim | No honey yet | Chưa có mật |
| comb.title.result | Fill each cell | Lấp đầy từng ô |
| p1.tip | Fill every cell with honey: say {loud} loud, {light} light, then {rest}. | Lấp đầy mật mọi ô: đọc {loud} mạnh, {light} nhẹ, rồi {rest}. |
| p1.listen.eyebrow / title | Listen first / Hear how it sounds | Nghe trước / Nghe cách đọc |
| p1.btn.normal / sub | Normal / Real speed | Bình thường / Tốc độ thật |
| p1.btn.slow / sub | Slowly / Each part clear | Chậm / Rõ từng phần |
| p1.cta.hint / mic | Tap, then say just the word / First time: your phone asks for the microphone | Chạm rồi chỉ đọc từ này / Lần đầu: điện thoại sẽ xin quyền micro |
| p2.prompt.beep / going | Beep! Say it now / Keep going… | Bíp! Đọc ngay / Tiếp tục… |
| p2.voice.label | Your voice | Giọng của bạn |
| p2.voice.starting / rec | Starting… / Recording | Đang bắt đầu… / Đang ghi âm |
| p2.stopHint | Stops by itself when you finish · or tap to stop | Tự dừng khi bạn đọc xong · hoặc chạm để dừng |
| p3.sub | Got it. Checking each cell… | Đã nhận. Đang kiểm tra từng ô… |
| p3.listen.eyebrow / title | While Dygo checks / Have a listen | Trong lúc Dygo kiểm tra / Nghe thử nhé |
| btn.native / sub | Native / 1. Listen | Bản xứ / 1. Nghe |
| btn.you / sub | Your try / 2. Compare | Bạn đọc / 2. So sánh |
| p3.wait | Usually 1–2 seconds | Thường mất 1–2 giây |
| p2b.noCount | This try doesn't count. Nothing is lost. | Lần này không tính. Không mất gì cả. |
| p4.badge.full / almost | Hive full · {n} of {n} cells / Almost · {k} of {n} cells | Tổ đầy · {n}/{n} ô / Gần xong · {k}/{n} ô |
| p4.head.pass / almost / retry | Sweet as honey! / Nearly perfect! / One cell needs honey | Ngọt như mật! / Gần như hoàn hảo! / Còn một ô thiếu mật |
| p4.sub.pass / almost / retry | {word} is pollinated. / It counts! {word} is pollinated. / Say it once more to pollinate {word}. | Đã thụ phấn {word}. / Được tính rồi! Đã thụ phấn {word}. / Đọc thêm một lần để thụ phấn {word}. |
| p4.tag.pass / close / fail / all | Pass / Close / Not yet / All pass | Đạt / Gần đạt / Chưa đạt / Đạt hết |
| p4.detail.all | Every cell filled past the {mark}% line. Tap one to see its score. | Mọi ô đều vượt vạch {mark}%. Chạm một ô để xem điểm. |
| p4.detail.ok | {syl}: {pct}% match with native. | {syl}: khớp {pct}% với người bản xứ. |
| p4.detail.close | {syl}: {pct}% match. Just past the line, aim for {ipa}. | {syl}: khớp {pct}%. Vừa qua vạch, hãy nhắm tới {ipa}. |
| p4.detail.fail | {syl}: {pct}% match. Sounded like {heard}, aim for {ipa}. | {syl}: khớp {pct}%. Nghe như {heard}, hãy nhắm tới {ipa}. |
| p4.detail.cut | {syl}: {pct}% match. Cut short, aim for {ipa}. | {syl}: khớp {pct}%. Bị ngắt sớm, hãy nhắm tới {ipa}. |
| p4.cta.* | Try again / Skip to next bee / Next bee: {next} / Back to the bed / Say it again / Polish {syl}: say it again | Thử lại / Sang chú ong tiếp / Ong tiếp: {next} / Về luống hoa / Đọc lại / Luyện {syl}: đọc lại |

P4 CTA logic:

- **Retry:** primary **Try again** (→ P2). Link: **Skip to next bee**, or on the last round **Back to the bed**.
- **Pass / almost, not the last round:** primary **Next bee: {next}**. Link: **Say it again** (almost: **Polish {syl}: say it again**).
- **Last round:** primary **Back to the bed**.

---

## 6. Visual tokens

ground `#F4F1EA` · ink `#1C2B24` · muted `#5E6A62` · forest `#24463A` / deep `#1F3E33` / edge `#3A5E4F` · cell cream `#FBF7EC` · honey `#F2C744` · pale honey `#F2D28B` · fail honey `#E8A87C` · ok `#3E7F5A` · close `#8A6A12` · clay `#B4552E` (shadow `#7E3719`) · tip box `#FBF4E4`.

Fonts: Fraunces 600 (display), DM Sans 400–800 (UI). Touch targets ≥ 44px. Text contrast ≥ 4.5:1. Phone layouts are designed at 390 × 844 and must not overflow at 360px.

**iPad (≥ 768px):** two columns. The board sits on the left. The listen card, tips and actions sit on the right. Same components.

---

## 7. Phases

### Phase 0: Discover (no code)
- Run `git status` and look for untracked work. Read the master schedule changelog and the latest session report.
- Find the current P1–P4 / P2b components, routes, the stepping-stones components, the scoring API call and type, the i18n setup, the audio utilities and the Tailwind tokens.
- Report: file list, the mapping to §4, gaps (per-syllable scores? IPA? timings? slow audio?), and which stones code can be deleted.

### Phase 1: Logic and hooks
- `pronunciationResult.ts` (§4) plus `buildResultViewModel()`, which produces every string key and value P4 needs.
- Mock adapter, `useExclusiveAudio`, `useAudioEnvelope`, and `useMicLevel` (AnalyserNode RMS, smoothed).
- Live-fill progress helper for P2: voiced time mapped onto syllable slots.
- Unit tests: thresholds, resultKind, the CTA matrix, live-fill mapping, and P1 tip generation for 2-, 3- and 4-syllable words.

### Phase 2: Shared components
- `HoneycombBoard` (all five modes; pass line and legend in `result` mode only), `ListenCard` + `PlayButton` (all states), `BeeMarker`, `PassLineLegend`, `VoiceMeterComb`, `MirrorWave`, `MatchRing`, `SyllableDetail`.
- Add a Storybook/preview page if the repo has one: each mode × 2 / 3 / 4 syllables.

### Phase 3: Screens
- Rebuild P1, P2, P3, P2b and P4 per §3 using the shared components.
- Delete the stepping-stones components and the syllable audio-slicing code.
- Wire up EN + VI. Add ZH keys with EN fallback.
- Build the iPad layouts.

### Phase 4: Quality
- **Accessibility:**
  - Board SVGs: `role="img"` with a descriptive label.
  - Result cells: real buttons with labels like "ti: 56% match with native, below the pass line. Show details."
  - Play buttons: `aria-pressed` / `aria-busy`.
  - Detail strip: `aria-live`.
  - Reduced-motion users see static frames.
  - Keyboard order: cells → play buttons → CTA.
- **Tests:**
  - Component tests: selection → detail text; play buttons are mutually exclusive; P2 meter shows no quality words; the pass line renders only in `result` mode.
  - Playwright screenshots: every screen × {mitigate, compensation, cloudy} × {EN, VI} at 390px and 1194px, plus P4 × {pass, almost, retry} and P2b × {quiet, noisy, otherWord}.
- Run lint, typecheck and jest. If `next build` hangs in the sandbox (a known issue), note it instead of retrying.

### Phase 5: Hand-off
- Update the session report and changelog: what changed, the mock flag, and open gaps.
- **Ask Dylan before deploying to UAT** (the `deploy/request.md` watcher).

---

## 8. Acceptance criteria

- [ ] No stepping stones remain anywhere in the pronunciation flow. All five screens use `HoneycombBoard`. The pass line and its legend appear only on P4.
- [ ] P1: empty cells, Normal / Slowly buttons with loading, playing, stop and error states; the tip is generated from the syllables.
- [ ] P2: cells fill with *pale* honey as each part is heard. The honeycomb voice meter follows the real mic level. The status reads "Starting…" then "● Recording", with no quality words. The auto-stop rules behave as before.
- [ ] P3: honey rises and falls while checking, Native / Your try both play, and a server error shows the inline retry.
- [ ] P2b: dim cells and the bee with "?"; all three reasons show the right text; Try again → P2.
- [ ] P4: tapping a cell never plays audio. Each cell shows ✓/✗ and its %. The 80% line is visible. The detail strip explains the selected cell. The headline sub never repeats the score. The listen card has no text apart from the two button labels, with the mirror waveform and match ring. There is no "Both" button. CTAs match §5.
- [ ] Works for 2–4 syllables at 360–430px widths and on iPad. EN and VI complete. Only one sound plays at a time.
- [ ] Unit and component tests pass. Screenshots are attached to the session report.

## 9. Out of scope

Changing the scorer model, the sentence-speaking screens (Adult · Speaking), Kids mode, and any change to the backend contract unless approved.
