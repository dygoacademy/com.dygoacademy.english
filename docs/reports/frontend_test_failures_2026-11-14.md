# The 57 failing frontend tests (2026-11-14)

Adult Profile step 6. Before this fix, `npm test` in `com.dygoacademy.frontend` reported 57 failures on the base branch. 15 suites didn't load, and 42 tests failed. After the fix, all 103 files and 1,019 tests pass. The suites that now load bring in 213 more tests than before.

There were three causes. None of them was a bug in the app.

## 1. Fifteen suites didn't load: missing env in tests

The suites stopped at import with "Invalid frontend environment configuration". `src/config/env.ts` requires `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and vitest doesn't read `.env.local`. Two of them, `onboardingLive` and `useReminderSwitch`, showed this as a `vi.mock` factory error.

**Fix**: `vitest.config.ts` now sets placeholder values under `test.env`. Tests never call the real API or Supabase.

The 15 suites:
- `AccountSheet`
- `EmptyState`
- `live/HomeLive`
- `live/bed`
- `live/data`
- `live/onboardingLive`
- `live/topics`
- `live/useReminderSwitch`
- `pronounce/honeycomb`
- `screens/TopicSearchScreen`
- `screens/quiz`
- `screens/screens`
- `useExclusiveAudio`
- `lib/accent`
- `lib/pronunciation/helpers`

`AccountSheet`, `EmptyState`, `HomeLive`, `quiz` and `screens` loaded after this fix but then hit causes 2 and 3 below.

## 2. HomeLive: a hook the test didn't mock

`HomeLive` calls `useActiveBed` (Seeds & Harvest), which needs a React Query client. The test mocks every other data hook but not this one, so 6 tests failed with "No QueryClient set".

**Fix**: the test mocks `@/hooks/useBeds` with no active bed.

## 3. Everything else: the tests checked older copy

The rest of the failures were tests that still expected wording from before the copy was rewritten in `messages/*.json`. The app showed the current copy correctly. Each test now expects the current en-US or vi-VN string. No message changed.

| Test file | Old wording in the test | Current wording |
| --- | --- | --- |
| AccountSheet | Couldn't sign out | We couldn’t sign you out… |
| AppUpdateWatcher | A new version of Dygo is ready. | There’s a new version of Dygo. |
| BottomTabBar | nav "Main" | "Main navigation" |
| EmptyState | No beds yet… / This bed is empty. Add your first word… | No beds here yet… / …Add a word to start planting. |
| LanguageSheet | Meanings in / English style / US English | Meanings shown in / English dialect / US English 🇺🇸 |
| RatingBar | Again | Forgot |
| groups (InviteSheetBody) | Role for new gardeners | Role for new members |
| auth: SignIn, Register, RegisterLive, ForgotPassword | Email, Welcome back, Plant your first seed, Check your inbox, Create account and join, Send a new link, the terms line, the sent line, the mismatch error | Email address, Welcome back 👋, Plant your first seed 🌱, Check your inbox 📩, Create account & join, Send new link, and the current terms, sent and error lines |
| SpeakLive, speak, SpeakNotice | the privacy line, quick check, mic explainer, denied, unsupported, connection dropped, "headphones help" | the current `screens.speak.*` lines |
| groupScreens | Shared gardens, 3 khu vườn · 25 người, rain-day line, invite links, role legend | Shared Gardens, 3 vườn · 25 người làm vườn, and the current lines |
| quiz | No definition…, Play the word, Listen, then type the word…, Not quite…, That’s right!, comes back line | the current `screens.quiz.*` lines |
| quizResult | Quiz done, Drill done, Drill tricky words, Every answer right… | Quiz done 🌟, Practice done 🎉, Practice tricky words, You got every one right 🌱 |
| screens | All 18 watered, switch "Ripening reminder" | All 18 words watered 🎉, "Reminder" |
| home: GrowthStages, HomeFaq, HomeScreen, PlantAWord, SpeakDemo, UseCaseBeds | Forgot one? No problem., …credit card., two section headings, Save this word — it’s free, Practise free, Until then… | Forgot one? That’s normal., …a card., What’s in your garden, A garden for kids is on the way, Save this word for free, Practice for free, In the meantime… |

## Worth knowing

The current copy differs from the design boards in places, and the tests now follow the copy. This affects the home page (H3/H4 still say "Forgot one? No problem.", "Save this word — it’s free" and "Practise free") and A8 ("Ripening reminder", "Garden calendar", "English only"). If the boards are meant to win, the copy in `messages/*.json` is what should change, and these tests would change with it.
