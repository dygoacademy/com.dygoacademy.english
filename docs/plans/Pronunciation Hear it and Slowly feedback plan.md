# Pronunciation (P1): Hear it and Slowly show what they are doing

Status: proposal, waiting for Dylan's approval (2026-10-18).
Frontend only. No backend change and no migration. Adds one message key.

## The problem (Dylan, 2026-10-18, iPhone screenshot of P1)

1. After tapping **Hear it**, nothing on the screen changes while the clip loads, so the learner can't tell the tap worked and taps again.
2. **Slowly** sometimes does nothing, and works after a few taps.

## Why it happens (from reading the code; not reproduced on an iPhone)

- `PronounceScreen` draws both buttons the same way at all times. `usePlayer` already knows which clip is playing (`src`) and when a play failed (`error`), but the screen doesn't use either. Nothing shows a clip that is still loading.
- A second tap restarts the clip. The first `play()` then fails with an AbortError, and `playClip` handles that by clearing `src` and setting `error`. So the state says "nothing playing" while the second clip plays.
- Slowly: `playClip` sets `currentTime` (where the word starts in the sentence clip) and `playbackRate` right after changing `src`, before the clip's metadata has loaded. Safari can ignore a seek made that early. It also resets `playbackRate` to `defaultPlaybackRate` when the clip loads. When either happens, the learner hears the start of the sentence, or the word at normal speed. That feels like "Slowly didn't work". When the clip is already loaded (a later tap), both settings hold, which would explain why it works after a few taps.

## Design (boards in `docs/design/garden/source/PronStones(Vi).dc.html`)

Each button has three looks: idle, loading and playing. Only one button is active at a time.

| State | Look | Tap does |
|---|---|---|
| Idle | White outline (as today) | Starts that clip |
| Loading | Pale green `forest-wash` fill, `forest-wash-border`, spinner instead of the speaker, `aria-busy` | Nothing (a double tap is ignored) |
| Playing | Filled `forest`, white text, three moving bars instead of the speaker, `aria-pressed="true"` | Stops it |
| Play failed | Buttons go back to idle, and a line under them reads "Couldn't play the sound. Tap to try again." (VI "Không phát được âm thanh. Chạm để thử lại.") | Next tap retries, and the line goes away |

- Tapping the other button while one is loading or playing switches to it.
- Every button scales to 97 % while pressed, so the tap itself shows.
- With reduced motion, the spinner and bars hold still.
- iPad (iP1) uses the same `PronounceScreen` buttons, so it gets the same states.

New references: `P1-say-word-loading`, `-playing`, `-slowly`, `-sound-error`, each with a `-vi` version.

## Code

1. `hooks/usePlayer.ts` / `playClip`:
   - Add `loading: boolean` to `PlayerState`. It is true from the tap until the `playing` event.
   - Seek and set the rate once metadata has loaded (`loadedmetadata` when `readyState` is below `HAVE_METADATA`, otherwise straight away). Set `defaultPlaybackRate` as well as `playbackRate`, and apply the rate again on `playing`.
   - Start the span timer on `playing`, not when `play()` resolves.
   - Ignore an AbortError from a play that a newer tap replaced. Only a real failure sets `error`.
2. `live/PronounceLive.tsx`: work out `audio` from the player: which button (`hear` / `slow`, from the src and rate last asked for), `loading` / `playing`, and `error`. A tap on the playing button calls `player.stop()`. A tap while loading is ignored.
3. `pronounce/PronounceScreen.tsx`: an `audio` prop (`idle | loadingHear | loadingSlow | hear | slow | error`). Button looks as in the table. New `SoundBarsIcon` and spinner, following the board.
4. Messages: `screens.pronounce.playFailed` in en / vi / zh.
5. Tests: the button states and aria; a tap while loading is ignored; a tap while playing stops; an AbortError from a replaced play doesn't set `error`; the rate and seek are applied after `loadedmetadata`.

## Steps

1. Design commit (rule 13): the 2 boards, `render.js` jobs and the 10 new references.
2. Code, tests, typecheck / eslint / vitest (baseline 65), Change Log.
3. UAT only when Dylan asks. Check on a real iPhone: tap Slowly first on a fresh screen, and double-tap Hear it.
