// Renders Word Garden .dc.html artboards to static HTML + PNG at 390x844.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const OUT = process.argv[2] || path.join(__dirname, '..', 'reference');
fs.mkdirSync(OUT, { recursive: true });
const fontDir = path.join(__dirname, 'node_modules/@fontsource');
const f = (fam, file) => 'data:font/woff2;base64,' + fs.readFileSync(path.join(fontDir, fam, 'files', file)).toString('base64');
const fv = (file) => 'data:font/woff2;base64,' + fs.readFileSync(path.join(__dirname, 'node_modules/@fontsource-variable/fraunces/files', file)).toString('base64');
// Unicode ranges as Google Fonts / next/font split them, so a Vietnamese letter
// missing from DM Sans falls back to Be Vietnam Pro glyph by glyph (same as the app).
const VI = 'U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB';
const EXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';
const face = (fam, w, src, range) => `@font-face{font-family:'${fam}';font-weight:${w};font-style:normal;${range ? `unicode-range:${range};` : ''}src:url(${src}) format('woff2');}`;
const W4 = [400, 500, 600, 700];
const fontCss =
  face('Fraunces', '100 900', fv('fraunces-latin-opsz-normal.woff2')) +
  face('Fraunces', '100 900', fv('fraunces-latin-ext-opsz-normal.woff2'), EXT) +
  face('Fraunces', '100 900', fv('fraunces-vietnamese-opsz-normal.woff2'), VI) +
  W4.map(w => face('DM Sans', w, f('dm-sans', `dm-sans-latin-${w}-normal.woff2`)) + face('DM Sans', w, f('dm-sans', `dm-sans-latin-ext-${w}-normal.woff2`), EXT)).join('') +
  // Baloo 2 (kids card on the home page); needs `npm i @fontsource/baloo-2` in tools/.
  (fs.existsSync(path.join(fontDir, 'baloo-2')) ? [700, 800].map(w => ['latin', 'latin-ext', 'vietnamese'].map(sub => face('Baloo 2', w, f('baloo-2', `baloo-2-${sub}-${w}-normal.woff2`))).join('')).join('') : '') +
  [...W4, 800].map(w => ['latin', 'latin-ext', 'vietnamese'].map(sub => face('Be Vietnam Pro', w, f('be-vietnam-pro', `be-vietnam-pro-${sub}-${w}-normal.woff2`))).join('')).join('');

// [file, output name, state overrides]
// [source file, locale, output name, state overrides]
// en = the English canvas pages, vi = "Adult · Tiếng Việt" and "Adult · Groups · Tiếng Việt";
// AU* (en + vi) come from the canvas page "Adult · Sign in".
// Usage: node render.js [outDir] [filter]   e.g. node render.js ../reference GR   or   node render.js ../reference -vi
const FILTER = process.argv[3] || '';
const JOBS = [
  ['AdultHome.dc.html', 'en', 'A1-todays-garden', {}],
  ['AdultAllWatered.dc.html', 'en', 'A1b-all-watered', {}],
  ['AdultTodayDone.dc.html', 'en', 'A1c-today-done', {}],
  ['AdultReview.dc.html', 'en', 'A2-review-question', {}],
  ['AdultReview.dc.html', 'en', 'A2-review-answer', { shown: true }],
  ['AdultReview.dc.html', 'en', 'A2-review-finished', { i: 3 }],
  ['AdultBloom.dc.html', 'en', 'A3-mission-complete', {}],
  ['AdultMissions.dc.html', 'en', 'A4-weekly-harvest', {}],
  ['AdultMissions.dc.html', 'en', 'A4-weekly-harvest-done', { state: 'done' }],
  ['AdultComeback.dc.html', 'en', 'A5-welcome-back', {}],
  ['AdultComebackStart.dc.html', 'en', 'A5b-welcome-back-start', {}],
  ['AdultTopics.dc.html', 'en', 'A6-topics', {}],
  ['AdultSearch.dc.html', 'en', 'A6b-search-topics', {}],
  // A6 filter states (2026-10-17): fixed filter groups slide sideways; the selected chip scrolls into view.
  ['AdultTopics.dc.html', 'en', 'A6-topics-filter-travel', { filter: 'travel' }],
  ['AdultTopicsVi.dc.html', 'vi', 'A6-topics-filter-shared-vi', { filter: 'shared' }],
  ['TopicWordSearch.dc.html', 'en', 'A7c-word-search', {}],
  ['AdultTopicDetail.dc.html', 'en', 'A7-topic-bed', {}],
  ['AdultTopicDetail.dc.html', 'en', 'A7-topic-bed-filter-sprouts', { stage: 'sprout' }],
  ['AdultMe.dc.html', 'en', 'A8-me', {}],
  ['AdultGroups.dc.html', 'en', 'GR1-shared-gardens', {}],
  ['AdultGroupGarden.dc.html', 'en', 'GR2-group-garden', {}],
  ['AdultGroupTricky.dc.html', 'en', 'GR3-tricky-patches', {}],
  ['AdultGroupRoster.dc.html', 'en', 'GR4-gardeners', {}],
  ['AdultGroupInvite.dc.html', 'en', 'GR5-invite', {}],
  ['AdultGroupJoin.dc.html', 'en', 'GR6-join', {}],
  ['AdultGroupCreate.dc.html', 'en', 'GR7-create', {}],
  ['AdultLogin.dc.html', 'en', 'AU1-sign-in', {}],
  ['AdultLogin.dc.html', 'en', 'AU1-sign-in-error', { error: true }],
  ['AdultRegister.dc.html', 'en', 'AU2-create-account', {}],
  ['AdultRegisterInvite.dc.html', 'en', 'AU3-create-account-invite', {}],
  ['AdultForgot.dc.html', 'en', 'AU4-reset-password', {}],
  ['AdultForgot.dc.html', 'en', 'AU4-reset-password-sent', { sent: true }],
  ['AdultHomeVi.dc.html', 'vi', 'A1-todays-garden-vi', {}],
  ['AdultAllWateredVi.dc.html', 'vi', 'A1b-all-watered-vi', {}],
  ['AdultTodayDoneVi.dc.html', 'vi', 'A1c-today-done-vi', {}],
  ['AdultReviewVi.dc.html', 'vi', 'A2-review-question-vi', {}],
  ['AdultReviewVi.dc.html', 'vi', 'A2-review-answer-vi', { shown: true }],
  ['AdultReviewVi.dc.html', 'vi', 'A2-review-finished-vi', { i: 3 }],
  ['AdultBloomVi.dc.html', 'vi', 'A3-mission-complete-vi', {}],
  ['AdultMissionsVi.dc.html', 'vi', 'A4-weekly-harvest-vi', {}],
  ['AdultMissionsVi.dc.html', 'vi', 'A4-weekly-harvest-done-vi', { state: 'done' }],
  ['AdultComebackVi.dc.html', 'vi', 'A5-welcome-back-vi', {}],
  ['AdultComebackStartVi.dc.html', 'vi', 'A5b-welcome-back-start-vi', {}],
  ['AdultTopicsVi.dc.html', 'vi', 'A6-topics-vi', {}],
  ['AdultSearchVi.dc.html', 'vi', 'A6b-search-topics-vi', {}],
  ['TopicWordSearchVi.dc.html', 'vi', 'A7c-word-search-vi', {}],
  ['AdultTopicDetailVi.dc.html', 'vi', 'A7-topic-bed-vi', {}],
  ['AdultTopicDetailVi.dc.html', 'vi', 'A7-topic-bed-filter-sprouts-vi', { stage: 'sprout' }],
  ['AdultMeVi.dc.html', 'vi', 'A8-me-vi', {}],
  ['AdultGroupsVi.dc.html', 'vi', 'GR1-shared-gardens-vi', {}],
  ['AdultGroupGardenVi.dc.html', 'vi', 'GR2-group-garden-vi', {}],
  ['AdultGroupTrickyVi.dc.html', 'vi', 'GR3-tricky-patches-vi', {}],
  ['AdultGroupRosterVi.dc.html', 'vi', 'GR4-gardeners-vi', {}],
  ['AdultGroupInviteVi.dc.html', 'vi', 'GR5-invite-vi', {}],
  ['AdultGroupJoinVi.dc.html', 'vi', 'GR6-join-vi', {}],
  ['AdultGroupCreateVi.dc.html', 'vi', 'GR7-create-vi', {}],
  ['AdultLoginVi.dc.html', 'vi', 'AU1-sign-in-vi', {}],
  ['AdultLoginVi.dc.html', 'vi', 'AU1-sign-in-error-vi', { error: true }],
  ['AdultRegisterVi.dc.html', 'vi', 'AU2-create-account-vi', {}],
  ['AdultRegisterInviteVi.dc.html', 'vi', 'AU3-create-account-invite-vi', {}],
  ['AdultForgotVi.dc.html', 'vi', 'AU4-reset-password-vi', {}],
  ['AdultForgotVi.dc.html', 'vi', 'AU4-reset-password-sent-vi', { sent: true }],
  ['AdultMe.dc.html', 'en', 'A8-me-account', { account: true }],
  ['AdultMeVi.dc.html', 'vi', 'A8-me-account-vi', { account: true }],
  // Quiz (canvas page "Adult · Quiz", 2026-10-01). States are baked into each board.
  ['AdultQuiz.dc.html', 'en', 'Q1-quiz-choose', {}],
  ['AdultQuizRight.dc.html', 'en', 'Q2-quiz-right', {}],
  ['AdultQuizWrong.dc.html', 'en', 'Q3-quiz-not-quite', {}],
  ['AdultQuizCloze.dc.html', 'en', 'Q4-quiz-cloze-hint', {}],
  ['AdultQuizListen.dc.html', 'en', 'Q5-quiz-listen', {}],
  ['AdultQuizResult.dc.html', 'en', 'Q6-quiz-result', {}],
  ['AdultQuizPerfect.dc.html', 'en', 'Q7-quiz-result-perfect', {}],
  ['AdultQuizDrill.dc.html', 'en', 'Q8-quiz-drill-done', {}],
  ['AdultQuizVi.dc.html', 'vi', 'Q1-quiz-choose-vi', {}],
  ['AdultQuizRightVi.dc.html', 'vi', 'Q2-quiz-right-vi', {}],
  ['AdultQuizWrongVi.dc.html', 'vi', 'Q3-quiz-not-quite-vi', {}],
  ['AdultQuizClozeVi.dc.html', 'vi', 'Q4-quiz-cloze-hint-vi', {}],
  ['AdultQuizListenVi.dc.html', 'vi', 'Q5-quiz-listen-vi', {}],
  ['AdultQuizResultVi.dc.html', 'vi', 'Q6-quiz-result-vi', {}],
  ['AdultQuizPerfectVi.dc.html', 'vi', 'Q7-quiz-result-perfect-vi', {}],
  ['AdultQuizDrillVi.dc.html', 'vi', 'Q8-quiz-drill-done-vi', {}],
  // Public home page (canvas page "Home page", 2026-10-02): tall boards, so they
  // carry their own size ($size, [width, height]); Baloo 2 is the kids-card font.
  ['LandingPhone.dc.html', 'en', 'H1-home-phone', { $size: [390, 3800] }],
  ['LandingDesktop.dc.html', 'en', 'H2-home-desktop', { $size: [1280, 2600] }],
  ['LandingPhoneVi.dc.html', 'vi', 'H1-home-phone-vi', { $size: [390, 3800] }],
  ['LandingDesktopVi.dc.html', 'vi', 'H2-home-desktop-vi', { $size: [1280, 2600] }],
  // Landing page (canvas page "Landing Page", was "Home page v2"; renamed 2026-10-08):
  // H3 "Landing · Phone", H4 "Landing · Desktop". Output names renamed
  // H3-home-v2-* → H3-landing-v2-*, H4-home-v2-* → H4-landing-v2-* (2026-10-08).
  // 2026-10-07: Speaking section (#speak) + FAQ + desktop nav link; 2026-10-08:
  // hero NEW pill and nav dot removed. Sizes from the canvas.
  ['LandingSeoPhone.dc.html', 'en', 'H3-landing-v2-phone', { $size: [390, 8025] }],
  ['LandingSeoPhoneVi.dc.html', 'vi', 'H3-landing-v2-phone-vi', { $size: [390, 8070] }],
  ['LandingSeoDesktop.dc.html', 'en', 'H4-landing-v2-desktop', { $size: [1280, 5455] }],
  ['LandingSeoDesktopVi.dc.html', 'vi', 'H4-landing-v2-desktop-vi', { $size: [1280, 5311] }],
  ['LandingSeoPlantBloomed.dc.html', 'en', 'H3s-plant-bloomed', { $size: [390, 8442] }],
  ['LandingSeoPlantBloomedVi.dc.html', 'vi', 'H3s-plant-bloomed-vi', { $size: [390, 8506] }],
  ['LandingSeoPainFlipped.dc.html', 'en', 'H3s-pain-flipped', { $size: [390, 8025] }],
  ['LandingSeoPainFlippedVi.dc.html', 'vi', 'H3s-pain-flipped-vi', { $size: [390, 8070] }],
  ['LandingSeoUsesTravel.dc.html', 'en', 'H3s-uses-travel', { $size: [390, 8004] }],
  ['LandingSeoUsesTravelVi.dc.html', 'vi', 'H3s-uses-travel-vi', { $size: [390, 8053] }],
  // 2026-10-10: sources are the LandingSeo* boards (canvas page "Landing Page": three H2s
  // rewritten as search topics); the H3s state boards are repo-only copies with the same
  // three headings. Heights are each page's rendered scrollHeight (measured 2026-10-10).
  // Speaking demo after "Try it now" (spk: 'done'), new 2026-10-07.
  ['LandingSeoSpeakCompared.dc.html', 'en', 'H3s-speaking-compared', { $size: [390, 8107] }],
  ['LandingSeoSpeakComparedVi.dc.html', 'vi', 'H3s-speaking-compared-vi', { $size: [390, 8135] }],
  // Speaking (canvas page "Adult · Speaking", Phase 13 handover v2, 2026-10-04): SP1–SP4.
  // componentDidMount doesn't run here, so each state is set by its overrides.
  ['SpeakListen.dc.html', 'en', 'SP1-speak-listen', {}],
  ['SpeakListenVi.dc.html', 'vi', 'SP1-speak-listen-vi', {}],
  ['SpeakRecording.dc.html', 'en', 'SP2-speak-countdown', { n: 3, phase: 'count' }],
  ['SpeakRecordingVi.dc.html', 'vi', 'SP2-speak-countdown-vi', { n: 3, phase: 'count' }],
  ['SpeakRecording.dc.html', 'en', 'SP2-speak-recording', { phase: 'speaking' }],
  ['SpeakRecordingVi.dc.html', 'vi', 'SP2-speak-recording-vi', { phase: 'speaking' }],
  ['SpeakCompare.dc.html', 'en', 'SP3-speak-checking', { phase: 'checking' }],
  ['SpeakCompareVi.dc.html', 'vi', 'SP3-speak-checking-vi', { phase: 'checking' }],
  ['SpeakCompare.dc.html', 'en', 'SP3-speak-done', { phase: 'done' }],
  ['SpeakCompareVi.dc.html', 'vi', 'SP3-speak-done-vi', { phase: 'done' }],
  ['SpeakCompare.dc.html', 'en', 'SP3-speak-failed', { phase: 'failed' }],
  ['SpeakCompareVi.dc.html', 'vi', 'SP3-speak-failed-vi', { phase: 'failed' }],
  ['SpeakDone.dc.html', 'en', 'SP4-speak-done', {}],
  ['SpeakDoneVi.dc.html', 'vi', 'SP4-speak-done-vi', {}],
  // Speaking entry points (changelog SE1/SE2/SE5/SE6, approved 2026-10-06; boards
  // drafted by Claude Code on top of A1/A7/GR3, for Dylan to confirm).
  ['EntryHome.dc.html', 'en', 'SE1-entry-home', {}],
  ['EntryHomeVi.dc.html', 'vi', 'SE1-entry-home-vi', {}],
  ['EntryBed.dc.html', 'en', 'SE2-entry-bed', {}],
  ['EntryBedVi.dc.html', 'vi', 'SE2-entry-bed-vi', {}],
  ['EntryHarvest.dc.html', 'en', 'SE5-entry-harvest', {}],
  ['EntryHarvestVi.dc.html', 'vi', 'SE5-entry-harvest-vi', {}],
  ['EntryEcho.dc.html', 'en', 'SE6-entry-echo', {}],
  ['EntryEchoVi.dc.html', 'vi', 'SE6-entry-echo-vi', {}],
  // Pronunciation · Honeycomb (P1–P4, P2b), 2026-10-25 (docs/specs/Pronunciation-honeycomb-implementation-plan.md).
  // English phone boards only: vi-VN uses the same layout with translated copy, the iPad its own two columns.
  ['PronStones.dc.html', 'en', 'P1-say-word', {}],
  ['PronStones.dc.html', 'en', 'P1-say-word-loading', { audio: 'loadingHear' }],
  ['PronStones.dc.html', 'en', 'P1-say-word-playing', { audio: 'hear' }],
  ['PronStones.dc.html', 'en', 'P1-say-word-slowly', { audio: 'slow' }],
  ['PronStones.dc.html', 'en', 'P1-say-word-sound-error', { audio: 'error' }],
  ['PronStonesRecord.dc.html', 'en', 'P2-recording-beep', { moment: 'beep' }],
  ['PronStonesRecord.dc.html', 'en', 'P2-recording', { moment: 'MI' }],
  ['PronStonesChecking.dc.html', 'en', 'P3-checking', {}],
  ['PronStonesNotHeard.dc.html', 'en', 'P2b-not-heard', { reason: 'quiet' }],
  ['PronStonesNotHeard.dc.html', 'en', 'P2b-not-heard-noisy', { reason: 'noisy' }],
  ['PronStonesNotHeard.dc.html', 'en', 'P2b-not-heard-other-word', { reason: 'otherWord' }],
  // iPad (1194 x 834): iP1–iP3 one board with a `state` tweak.
  // P4 honeycomb result (pass / almost perfect / retry, middle and last bee) and SP0 microphone first time / denied.
  // These boards read the Demo enums from props.
  ['PronStonesResult.dc.html', 'en', 'P4-result-pass', { result: 'pass', round: 'next' }],
  ['PronStonesResult.dc.html', 'en', 'P4-result-pass-last', { result: 'pass', round: 'last' }],
  ['PronStonesResult.dc.html', 'en', 'P4-result-almost', { result: 'almostPerfect', round: 'next' }],
  ['PronStonesResult.dc.html', 'en', 'P4-result-almost-last', { result: 'almostPerfect', round: 'last' }],
  ['PronStonesResult.dc.html', 'en', 'P4-result-retry', { result: 'retry', round: 'next' }],
  ['PronStonesResult.dc.html', 'en', 'P4-result-retry-last', { result: 'retry', round: 'last' }],
  ['PronStonesResult.dc.html', 'en', 'P4-result-sunny-pass-last', { result: 'pass', word: 'sunny', round: 'last' }],
  ['PronStonesResult.dc.html', 'en', 'P4-result-compensation', { result: 'retry', word: 'compensation' }],
  ['PronStonesResult.dc.html', 'en', 'P4-result-cloudy', { result: 'retry', word: 'cloudy' }],
  ['SpeakMic.dc.html', 'en', 'SP0-mic', { state: 'ask' }],
  ['SpeakMic.dc.html', 'en', 'SP0-mic-denied', { state: 'denied' }],
  ['SpeakMicVi.dc.html', 'vi', 'SP0-mic-vi', { state: 'ask' }],
  ['SpeakMicVi.dc.html', 'vi', 'SP0-mic-denied-vi', { state: 'denied' }],
  // Voice donation (2026-10-11): A8e Privacy & data, `state` = the board's Demo enum.
  ['AdultPrivacy.dc.html', 'en', 'A8e-privacy', { state: 'off' }],
  ['AdultPrivacy.dc.html', 'en', 'A8e-privacy-confirm', { state: 'confirm' }],
  ['AdultPrivacy.dc.html', 'en', 'A8e-privacy-on', { state: 'on' }],
  ['AdultPrivacy.dc.html', 'en', 'A8e-privacy-delete', { state: 'delete' }],
  ['AdultPrivacy.dc.html', 'en', 'A8e-privacy-deleted', { state: 'deleted' }],
  ['AdultPrivacyVi.dc.html', 'vi', 'A8e-privacy-vi', { state: 'off' }],
  ['AdultPrivacyVi.dc.html', 'vi', 'A8e-privacy-confirm-vi', { state: 'confirm' }],
  ['AdultPrivacyVi.dc.html', 'vi', 'A8e-privacy-on-vi', { state: 'on' }],
  ['AdultPrivacyVi.dc.html', 'vi', 'A8e-privacy-delete-vi', { state: 'delete' }],
  ['AdultPrivacyVi.dc.html', 'vi', 'A8e-privacy-deleted-vi', { state: 'deleted' }],
  // Adult Profile (boards added 2026-11-14; A8b, A8c, A8d approved by Dylan the same day).
  // A8b Daily goal: `pick` = the selected pot (light / steady / intense).
  ['AdultDailyGoal.dc.html', 'en', 'A8b-daily-goal', {}],
  ['AdultDailyGoal.dc.html', 'en', 'A8b-daily-goal-intense', { pick: 'intense' }],
  ['AdultDailyGoalVi.dc.html', 'vi', 'A8b-daily-goal-vi', {}],
  ['AdultDailyGoalVi.dc.html', 'vi', 'A8b-daily-goal-intense-vi', { pick: 'intense' }],
  // A8c Reminder: default (on, 7:30), Smart time, an evening time (night sky), and off.
  ['AdultReminder.dc.html', 'en', 'A8c-reminder', {}],
  ['AdultReminder.dc.html', 'en', 'A8c-reminder-smart', { smart: true }],
  ['AdultReminder.dc.html', 'en', 'A8c-reminder-evening', { time: '21:00', hh: 21 }],
  ['AdultReminder.dc.html', 'en', 'A8c-reminder-off', { on: false }],
  ['AdultReminderVi.dc.html', 'vi', 'A8c-reminder-vi', {}],
  ['AdultReminderVi.dc.html', 'vi', 'A8c-reminder-smart-vi', { smart: true }],
  ['AdultReminderVi.dc.html', 'vi', 'A8c-reminder-evening-vi', { time: '21:00', hh: 21 }],
  ['AdultReminderVi.dc.html', 'vi', 'A8c-reminder-off-vi', { on: false }],
  // A8d Meanings in: `pick` = en / vi / zh, `recall` = Recall first.
  ['AdultMeaningLang.dc.html', 'en', 'A8d-meanings', {}],
  ['AdultMeaningLang.dc.html', 'en', 'A8d-meanings-vi-recall', { pick: 'vi', recall: true }],
  ['AdultMeaningLang.dc.html', 'en', 'A8d-meanings-vi-shown', { pick: 'vi', recall: false }],
  ['AdultMeaningLang.dc.html', 'en', 'A8d-meanings-zh-recall', { pick: 'zh', recall: true }],
  ['AdultMeaningLangVi.dc.html', 'vi', 'A8d-meanings-vi', {}],
  ['AdultMeaningLangVi.dc.html', 'vi', 'A8d-meanings-vi-shown-vi', { recall: false }],
  ['AdultMeaningLangVi.dc.html', 'vi', 'A8d-meanings-en-vi', { pick: 'en' }],
  ['AdultMeaningLangVi.dc.html', 'vi', 'A8d-meanings-zh-recall-vi', { pick: 'zh', recall: true }],
  // iA8 iPad Me (1194 x 834; the app shows it from 1024 px behind NEXT_PUBLIC_GARDEN_IPAD_NAV).
  ['iPadMe.dc.html', 'en', 'iA8-me', { $size: [1194, 834] }],
  ['iPadMe.dc.html', 'en', 'iA8-me-account', { $size: [1194, 834], account: true }],
  ['iPadMeVi.dc.html', 'vi', 'iA8-me-vi', { $size: [1194, 834] }],
  ['iPadMeVi.dc.html', 'vi', 'iA8-me-account-vi', { $size: [1194, 834], account: true }],
  // AU2 with the donate box ticked.
  ['AdultRegister.dc.html', 'en', 'AU2-create-account-donate', { donate: true }],
  ['AdultRegisterVi.dc.html', 'vi', 'AU2-create-account-donate-vi', { donate: true }],
  // Onboarding (canvas page "Adult · Onboarding", 2026-10-12): OB1 About you → OB4 Reminder → OB5 All set.
  // OB2 Goal, OB3 First bed and OB4b Say 5 words were removed; their sources stay for history only.
  ['OnboardLevel.dc.html', 'en', 'OB1-about-you', {}],
  ['OnboardLevel.dc.html', 'en', 'OB1-about-you-work', { goal: 'work' }],
  ['OnboardReminder.dc.html', 'en', 'OB4-reminder', {}],
  ['OnboardReady.dc.html', 'en', 'OB5-ready', {}],
  ['OnboardLevelVi.dc.html', 'vi', 'OB1-about-you-vi', {}],
  ['OnboardLevelVi.dc.html', 'vi', 'OB1-about-you-work-vi', { goal: 'work' }],
  ['OnboardReminderVi.dc.html', 'vi', 'OB4-reminder-vi', {}],
  ['OnboardReadyVi.dc.html', 'vi', 'OB5-ready-vi', {}],
  // Loading (canvas page "Loading", 2026-10-13, Approved): LD1 app start, LD3b slow loads.
  // One board per screen with a `lang` tweak (no …Vi file); still frames (animations frozen).
  ['LoadingSprout.dc.html', 'en', 'LD1-loading-sprout', { lang: 'en' }],
  ['LoadingSprout.dc.html', 'vi', 'LD1-loading-sprout-vi', { lang: 'vi' }],
  // LD3b replaces LD3 (2026-10-13): bee + tab bar, no word card.
  ['LoadingBeeNav.dc.html', 'en', 'LD3b-loading-bee-nav', { lang: 'en' }],
  ['LoadingBeeNav.dc.html', 'vi', 'LD3b-loading-bee-nav-vi', { lang: 'vi' }],
  ['LoadingBeeNav.dc.html', 'en', 'LD3b-loading-bee-nav-topics', { lang: 'en', tab: 'topics' }],
  // A7b Add word (board added 2026-10-17, Q-19).
  ['AdultAddWord.dc.html', 'en', 'A7b-add-word', {}],
  ['AdultAddWord.dc.html', 'en', 'A7b-add-word-planted', { planted: true }],
  ['AdultAddWordVi.dc.html', 'vi', 'A7b-add-word-vi', {}],
  ['AdultAddWordVi.dc.html', 'vi', 'A7b-add-word-planted-vi', { planted: true }],
  // Seeds & Harvest (canvas page "Adult · Seeds & Harvest", approved 2026-10-23). English only:
  // the Vietnamese boards come in the plan's Phase 3. S1 is built in Phase 2.
  ['SeedDrop.dc.html', 'en', 'S1-seed-drop', {}],
  ['BedHarvest.dc.html', 'en', 'S2-bed-harvest', {}],
  ['SeedPackets.dc.html', 'en', 'S3-seed-packets', {}],
  ['SeedPackets.dc.html', 'en', 'S3-seed-packets-goal', { pick: 'goal' }],
  // Seeds & Harvest follow-ups (drawn 2026-10-24, for approval): Home Next up = next seed packet (S4),
  // Plant mission with dropped seeds (S5), A1c with the harvest row (S6), harvest share card (S7).
  ['HomeNextPacket.dc.html', 'en', 'S4-home-next-packet', {}],
  ['HomeDroppedSeeds.dc.html', 'en', 'S5-home-dropped-seeds', {}],
  ['TodayDoneHarvest.dc.html', 'en', 'S6-today-done-harvest', {}],
  ['HarvestShareCard.dc.html', 'en', 'S7-harvest-share-card', { $size: [360, 450] }],
].filter(([, , name]) => !FILTER || name.includes(FILTER));

// English pages redrawn with the app's body stack (DM Sans, then Be Vietnam
// Pro for the Vietnamese letters DM Sans lacks), like the -vi sources, instead
// of the English canvas's 'DM Sans', sans-serif (system fallback for those
// letters). Only screens whose English page shows Vietnamese text need it.
// A7-topic-bed: redrawn 2026-09-27 (Dylan's font decision, 2026-09-26).
const APP_FONT_STACK = new Set(['A7-topic-bed', 'SE2-entry-bed', 'SE5-entry-harvest']);
const withAppFontStack = (html) => html.replace(/'DM Sans',\s*sans-serif/g, "'DM Sans', 'Be Vietnam Pro', sans-serif");

// Vietnamese references (2026-10-04): body text in Be Vietnam Pro only, the
// same as the app since Dylan's 2026-10-03 fix (globals.css, `:lang(vi)`).
// The canvas draws them DM Sans first ('DM Sans', 'Be Vietnam Pro'), so DM
// Sans drew the letters it can build from a base letter and marks (ế, ỗ, ố)
// and Be Vietnam Pro the rest (ệ, ộ, ư, đ): two fonts in one word, the bug
// the app fix removed. Only the body stack changes; Fraunces and Baloo 2
// headings stay as drawn. The canvas sources are untouched.
const withVietnameseBody = (html) =>
  html.replace(/'DM Sans',\s*(?:'Be Vietnam Pro',\s*)?sans-serif/g, "'Be Vietnam Pro', 'DM Sans', sans-serif");

const RUNTIME = String.raw`
(function (overrides) {
  class DCLogic { constructor(p){ this.props = p || {}; this.state = {}; } setState(p){ Object.assign(this.state, p); } forceUpdate(){} }
  const code = document.querySelector('script[data-dc-script]').textContent;
  const Component = new Function('DCLogic', code + '\nreturn Component;')(DCLogic);
  const inst = new Component(Object.assign({}, overrides));
  inst.state = Object.assign({}, inst.state, overrides);
  const vals = inst.renderVals();
  const HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  const look = (p, scope) => {
    if (p === 'true') return true; if (p === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(p)) return Number(p);
    return p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), scope);
  };
  const fill = (s, scope) => s.replace(HOLE, (_, p) => { const v = look(p, scope); return v == null ? '' : (typeof v === 'function' ? '' : String(v)); });
  const whole = (s, scope) => { const m = s.trim().match(/^\{\{\s*([^}]+?)\s*\}\}$/); return m ? look(m[1], scope) : fill(s, scope); };
  function render(node, scope, out) {
    if (node.nodeType === 3) { out.push(document.createTextNode(fill(node.nodeValue, scope))); return; }
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toLowerCase();
    if (tag === 'sc-if') { if (whole(node.getAttribute('value'), scope)) node.childNodes.forEach(c => render(c, scope, out)); return; }
    if (tag === 'sc-for') {
      const list = whole(node.getAttribute('list'), scope) || []; const as = node.getAttribute('as');
      list.forEach((item, i) => { const s2 = Object.assign({}, scope, { [as]: item, $index: i }); node.childNodes.forEach(c => render(c, s2, out)); });
      return;
    }
    const el = node.cloneNode(false);
    for (const a of Array.from(el.attributes)) {
      if (/^on[A-Z]/.test(a.name) || /^on[a-z]+$/.test(a.name)) { el.removeAttribute(a.name); continue; }
      if (a.value.includes('{{')) el.setAttribute(a.name, fill(a.value, scope));
    }
    const kids = []; node.childNodes.forEach(c => render(c, scope, kids)); kids.forEach(k => el.appendChild(k));
    out.push(el);
  }
  const xdc = document.querySelector('x-dc');
  const helmet = xdc.querySelector('helmet');
  if (helmet) { Array.from(helmet.children).forEach(ch => { if (ch.tagName !== 'LINK') document.head.appendChild(ch); }); helmet.remove(); }
  const out = []; xdc.childNodes.forEach(c => render(c, vals, out));
  xdc.replaceWith(...out);
  document.querySelectorAll('script').forEach(s => s.remove());
  // freeze animations for a stable reference image
  const st = document.createElement('style'); st.textContent = '*,*::before,*::after{animation:none!important;transition:none!important}'; document.head.appendChild(st);
})`;

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, channel: process.env.CHROME_PATH ? undefined : 'chrome' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  for (const [file, locale, name, overrides] of JOBS) {
    const [W, H] = overrides.$size || [390, 844];
    await page.setViewportSize({ width: W, height: H });
    let html = fs.readFileSync(path.join(__dirname, '..', 'source', file), 'utf8').replace('<script src="./support.js"></script>', '');
    if (APP_FONT_STACK.has(name)) html = withAppFontStack(html);
    if (locale === 'vi') html = withVietnameseBody(html);
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    await page.evaluate(`${RUNTIME}(${JSON.stringify(overrides)})`);
    await page.addStyleTag({ content: fontCss });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(OUT, name + '.png'), clip: { x: 0, y: 0, width: W, height: H } });
    const flat = '<!doctype html>\n' + (await page.evaluate(() => document.documentElement.outerHTML)).replace(/@font-face\{[^}]*\}/g, '');
    fs.writeFileSync(path.join(OUT, name + '.html'), flat);
    console.log('ok', name);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
