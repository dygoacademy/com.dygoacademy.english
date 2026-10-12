# Voice donation ("Donate my voice"): implementation plan (for Claude Code)

Date: 2026-10-11 · Owner: Dylan · Design: canvas pages "Adult · Profile" (A8, **A8e**), "Adult · Authentication" (AU2) and "Legal" (LG1–LG4)
Design changelog: `docs/design/garden/CHANGELOG.md`, entry "2026-10-11 — Legal: optional voice donation".

Why: Dylan will train Dygo's own GOP scorer (wav2vec2, fine-tuned for Vietnamese speakers of English). That needs real learner recordings, kept only with the learner's permission. Today the app and both legal documents promise "checked, then deleted … not used to train AI".

> **Gate:** the screens and §1 decisions are **Approved** (Dylan, 2026-10-11). The legal text still needs a lawyer's review, so **everything ships behind one flag, `VOICE_DONATION_ENABLED` (backend) / `NEXT_PUBLIC_VOICE_DONATION` (frontend), default off.** With the flag off, nothing changes for anyone: no box, no row, old legal text, nothing stored. Dylan turns the flag on (UAT first, then production) only after the review. Build in the order below, one commit and one UAT deploy (flag on in UAT only) per part.

| Part | What | Design files (`docs/design/garden/source/`) |
|---|---|---|
| 1 | Backend: consent, private storage of donated audio, delete | — |
| 2 | Screens: A8e Privacy & data, A8 row, AU2 box, small copy changes | `AdultPrivacy(Vi)`, `AdultMe(Vi)`, `AdultRegister(Vi)` |
| 3 | Terms and Privacy text (second version, behind the flag) | `LegalTermsDesktop`, `LegalPrivacyDesktop`, `LegalTermsPhoneVi`, `LegalPrivacyPhoneVi` |

Rules for every part: copy from the boards; all strings in `messages/{en-US,vi-VN,zh-CN}.json` (ZH to match); `vitest` and backend `jest` (compare with HEAD); `tsc --noEmit`; `Change Log.md` entry; set the changelog rows to **Built** with the commit; deploy UAT via `deploy/request.md`. The recording never appears in logs.

## 1. Decisions (Dylan to confirm; the plan assumes these)

| # | Decision | Default in this plan | Why |
|---|---|---|---|
| V-1 | Opt-in or opt-out? | **Opt-in, off by default.** The learner turns it on themselves. | Vietnam's PDPL needs separate, specific consent per purpose (Art. 9); Decree 356 accepts "enabling technical settings" as a consent method. Google and Apple both moved to opt-in for voice after 2019. |
| V-2 | Who can donate? | **Own accounts, 16+ only.** Child profiles never; a parent can't turn it on for a child. | Children's voice data is the highest-risk data Dygo could hold. Simple rule, easy to explain. Revisit later with a lawyer if child data is needed. |
| V-3 | What is kept | The audio, the word or sentence, the scores, accent (UK/US), app language, device type; **optional** self-reported first language, region in Vietnam, English level. No name, email or account id in the dataset. | Enough to train and to check fairness across accents. |
| V-4 | Linking | Recordings stored under a **random donor code**. The code ↔ account link is kept in a separate table, only so the learner can delete their recordings. | Pseudonymisation; Decree 356 asks to separate identifying data for big data / AI processing. |
| V-5 | Human listening | Yes, **some** recordings may be listened to by trained people to label pronunciation (Dylan / the team, or a contractor under a written agreement). Said plainly in the policy. | Labelling is needed for GOP training. Amazon and Google got into trouble for not saying this. |
| V-6 | Retention | Up to **3 years** from recording, or until the learner turns donation off / deletes (deleted within **30 days**). | A clear limit; long enough for several training rounds. |
| V-7 | Trained models | Turning off or deleting removes recordings from **future** training. A model already trained isn't retrained, and it can't play recordings back. Say this honestly. | Removing one person from trained weights isn't practical. |
| V-8 | Uses | **Only** to train and test Dygo's own speech checker. Never sold, never published, never shared as a dataset, never used to recognise who someone is (no voiceprints). | Keeps it out of "identification" (biometric) use and is the promise users care about. |
| V-9 | Reward | None. Saying no changes nothing in the app. | Consent must be freely given; no nudges. |
| V-10 | Earlier recordings | Not donated: they were already deleted. Donation starts from the moment the setting is on. | Matches the old promise. |

---

## 2. What other apps do (for reference)

| App | How they ask | Default | What they tell you | Lesson for Dygo |
|---|---|---|---|---|
| **Google** (Voice & audio activity) | A checkbox in Web & App Activity | **Off** until you turn it on | Audio is used "to develop and improve its audio recognition technologies"; "samples … are analyzed by trained reviewers" (disassociated from your account); delete any time, auto-delete available | Off by default, say human review plainly, offer delete-all |
| **Apple** (Improve Siri & Dictation) | Explicit opt-in prompt; setting under Privacy › Analytics & Improvements | Opt-in | Only Apple employees under confidentiality can listen; "Delete Siri & Dictation History" button | A one-time ask + a setting + a delete button |
| **Amazon** (Alexa) | Setting "Help improve Alexa" | Was on; manual-review opt-out added after criticism (2019) | "your voice recordings may be used to develop new features and manually reviewed … only an extremely small fraction" | Don't default to on; regulators and press punished it |
| **ELSA Speak** | No voice-specific choice | — | Lists "audio and video recordings" as user content; no retention period; revoke by emailing privacy@ | Vague wording is what *not* to copy: Dygo should name the purpose, the limit and the switch |
| **Mozilla Common Voice** | You contribute on purpose, sentence by sentence | Nothing kept unless you record | Donations are released as an open dataset | A donation framing ("help us hear Vietnamese speakers better") is clear and honest |

---

---

## Part 1 · Backend

**Tables** (new migration in `database/migrations/`):
- `voice_donation_consents`: id, user_id, granted_at, withdrawn_at (null while active), text_version (e.g. `2026-11-v1`, a constant shared with Part 3), method (`signup` / `setting`), locale, region_answer (`north` / `central` / `south` / `elsewhere` / null). Never deleted (proof of consent), even when the recordings are.
- `voice_donors`: user_id (unique) ↔ donor_code (random UUID). Deleted with the recordings or the account.
- `voice_donations`: id, donor_code, kind (`word` / `sentence`), storage_key, text (word or sentence), target_ipa, total score, per-syllable or per-word scores (jsonb), accent, app_locale, device_type, created_at. **No user_id, email or name.**

**Storage:** a **separate, private** bucket `[[dygo-voice-donations]]` on the same S3 store as `storage-config.ts` (`[[STORAGE PROVIDER]]`, `[[REGION]]`), never under the public media URL. Key: `{donor_code}/{yyyy-mm}/{uuid}.wav`. Server-side encryption on. Access: the backend's donation writer and Dylan only.

**Endpoints** (`profiles` module, or a small new `privacy` module):
- `GET /profiles/me/voice-donation` → `{ enabled, since, count, can_donate }`. `can_donate` is false for child profiles (and under-16 accounts, if an age is ever stored; today the Terms make own accounts 16+).
- `PUT /profiles/me/voice-donation` `{ enabled: true, method, locale, region_answer? }` → creates the consent row (and the donor code if missing). `{ enabled: false }` → sets withdrawn_at; stops at once.
- `DELETE /profiles/me/voice-donation/recordings` → withdraws, queues deletion of all files + rows for the donor code, deletes the donor link; returns `{ deleting: n }`. Done within 30 days (aim: the same night).
- `POST /auth/register` (or the profile created after sign-up) accepts `donate_voice: true` → same as `PUT … enabled: true, method: 'signup'`.

**Saving recordings:** in `speech-check.processor.ts`, after a check finishes **successfully** (word or sentence), if the user has an active consent at that moment, copy the audio buffer to the donation bucket and write a `voice_donations` row. Fire-and-forget: a failed save never changes the learner's result. When there is no active consent, the code path is exactly today's (audio in memory, then dropped). Failed checks and "couldn't hear you" attempts are not kept.

**Jobs:** nightly: process queued deletions; delete donations older than **3 years**. Account deletion (wherever it is or will be) must also call the recordings delete.

**Tests:** no copy without consent; copy with consent; withdraw stops copying; delete removes files, rows and the donor link but keeps the consent row; child profile can't enable; the flag off makes every endpoint 404 and never copies.

---

## Part 2 · Screens (EN + VI)

### A8 Profile — new row (`AdultMe(Vi)`)
- Between "Meanings in" and "Family": **Privacy & data** · value "Voice donation on" / "Voice donation off" (VI **Quyền riêng tư** · "Đang góp giọng" / "Không góp giọng"), shield icon, chevron → `/me/privacy`.
- To fit, the garden calendar rows are 9 px (were 13) and setting rows 48 px (were 52), as on the board.

### A8e Privacy & data — new screen (`AdultPrivacy(Vi)`, route `/me/privacy`)
- Header: back → Profile, title **Privacy & data** · VI **Quyền riêng tư**.
- Section **Your voice** · VI **Giọng nói của bạn**: one white card, no icon:
  - Title **Donate my voice** · VI **Góp giọng nói**; line "Helps improve Dygo’s speaking scores · Optional" · VI "Giúp Dygo chấm điểm phát âm chính xác hơn · Không bắt buộc"; switch on the right (`role="switch"`).
  - Off: "Off · recordings are deleted after each check" · VI "Đang tắt · bản ghi được xoá sau mỗi lần chấm".
  - On: green border; "**38** recordings donated · since 12 Oct 2026" · VI "Đã góp **38** bản ghi · từ 12/10/2026"; three ticks: "Stored under a random code, not your name" / "Some may be listened to by trained people" / "Never sold or published · kept up to 3 years" (VI on the board); outlined button **Delete my donated recordings** · VI **Xoá các bản ghi đã góp**.
  - Link "How we use donated recordings" → `/privacy#p4` · VI "Dygo dùng bản ghi được góp như thế nào".
- Section **Your data** · VI **Dữ liệu của bạn**: Download my data, Privacy Policy, Terms of Service, Delete account (rows that already have a destination link to it; "Download my data" and "Delete account" may stay hidden until those features exist; don't build them here).
- **Turning the switch on** opens the confirm sheet (never turns on straight away): title **Donate your voice recordings?**, four numbered lines, "Where did you grow up? (optional)" chips North / Central / South / Elsewhere / Prefer not to say, buttons **Not now** / **Yes, donate** with equal size. Yes → `PUT … enabled: true` → switch on. Not now / tap outside → stays off.
- **Turning it off**: no sheet; `PUT … enabled: false`; switch off; recordings stay (the delete button still works from a small "Delete donated recordings" link shown under the off line while count > 0).
- **Delete**: alert dialog "Delete {n} donated recordings?" + body + **Delete recordings** / Cancel → `DELETE …/recordings` → toast "Deleting your {n} recordings. Donation is off."
- Hidden entirely when `can_donate` is false (child profile): the Your voice section doesn't show.

### AU2 Create account (`AdultRegister(Vi)`)
- Under the password, kept **quiet on purpose** (changed 2026-10-11): a plain 18 px checkbox and one 13 px grey line, no card or border: "Let Dygo keep my speaking recordings to help improve speaking scores. Optional. **Learn more**" · VI "Cho Dygo lưu bản ghi luyện nói của tôi để cải thiện việc chấm điểm phát âm. Không bắt buộc. **Tìm hiểu thêm**". Don't mention Vietnamese speakers. "Learn more" opens the Privacy Policy at #p4 (new tab, before sign-up).
- **Unticked** by default. Ticked → send `donate_voice: true` with sign-up (consent method `signup`). Not on AU3 (invite) or child profiles.
- The terms line becomes "By creating an account you agree to the Terms and Privacy Policy." with both as links.

### Small copy changes (only while donation is on)
- SP0 mic screen, SP3 checking line and P3 checking: "Your recording is checked, then deleted." → "Your recording is checked and kept to improve Dygo (you chose this in Profile)." · VI "Bản ghi được chấm và lưu lại để cải thiện Dygo (bạn đã chọn trong Hồ sơ)." Off: unchanged.

### Messages
`screens.privacy.*` (A8e), `screens.me.privacyRow`, `screens.auth.register.donate*`. Copy every string from the boards (EN + VI); ZH to match.

### Fixtures + tests
Reference fixtures for A8e off / confirm / on / delete and AU2 with the box; tests: the switch opens the sheet; Not now keeps it off; Yes calls the API; delete flow; hidden for child profiles; AU2 sends `donate_voice` only when ticked; flag off hides the row, the screen route (404) and the box.

### Later (not in this plan; needs a design)
The one-time invitation card after the 5th pronunciation check.

## Part 3 · Terms and Privacy text (behind the flag)

Design: canvas page "Legal" (`source/LegalTermsDesktop`, `LegalPrivacyDesktop`, `LegalTermsPhoneVi`, `LegalPrivacyPhoneVi`) already shows this text. In `com.dygoacademy.frontend/src/content/legal/{en-US,vi-VN,zh-CN}.ts` (ZH to match) add the new text **as a second version** chosen by `voiceDonationEnabled()`: flag off → today's text exactly; flag on → the text below. Keep section ids; extend `legal.test.ts` for both versions. Also fix the old path "Me › Account" → "Profile › Account" (the tab is Profile now). Update "Last updated" and, per t11 / p12, tell existing users in the app before it applies (nothing changes for anyone who doesn't turn it on).

### 5.1 Terms of Service

**short[3]** (Speaking practice bullet)
- EN: "Speaking practice: your recording is checked, then deleted, unless you choose to donate your recordings to help improve Dygo."
- VI: "Luyện nói: bản ghi âm được chấm xong là xoá ngay, trừ khi bạn chọn góp bản ghi để giúp Dygo tốt hơn."

**t7 · Speaking practice** (replace the paragraph with three)
- EN:
  1. "Dygo uses your microphone only while you tap to record. Unless you choose to donate (below), your recording is checked against a native speaker's, then deleted straight away. Speaking scores are a learning guide, not an official assessment."
  2. "<b>Donating your recordings (optional).</b> If you are 16 or older, you can choose in Profile › Privacy to let us keep your speaking and pronunciation recordings to improve Dygo's speech checker for Vietnamese speakers of English. It is off unless you turn it on, it never changes what you can use in Dygo, and you can turn it off or delete your donated recordings at any time. Child profiles can never donate."
  3. "If you donate, you give us a free, non-exclusive licence to use those recordings to train and test Dygo's own speech checker, for as long as we keep them under our Privacy Policy. We won't sell them, publish them or use them for anything else."
- VI:
  1. "Dygo chỉ dùng micro khi bạn nhấn để ghi âm. Trừ khi bạn chọn góp bản ghi (xem dưới), bản ghi được so với giọng người bản xứ rồi xoá ngay. Điểm luyện nói chỉ để tham khảo khi học, không phải đánh giá chính thức."
  2. "<b>Góp bản ghi giọng nói (không bắt buộc).</b> Nếu bạn từ 16 tuổi trở lên, bạn có thể chọn trong Hồ sơ › Quyền riêng tư để chúng tôi lưu bản ghi luyện nói và phát âm của bạn nhằm cải thiện bộ chấm phát âm của Dygo cho người Việt nói tiếng Anh. Mặc định tắt, không ảnh hưởng đến những gì bạn được dùng trong Dygo, và bạn có thể tắt hoặc xoá các bản ghi đã góp bất cứ lúc nào. Hồ sơ của trẻ em không bao giờ được góp."
  3. "Khi góp, bạn cho phép chúng tôi sử dụng miễn phí, không độc quyền các bản ghi đó để huấn luyện và kiểm thử bộ chấm phát âm riêng của Dygo, trong thời gian chúng tôi lưu giữ theo Chính sách quyền riêng tư. Chúng tôi không bán, không công khai và không dùng vào việc khác."

### 5.2 Privacy Policy

**short[2]**
- EN: "Your voice is checked, then deleted, unless you choose to donate your recordings to improve Dygo. Donating is off until you turn it on."
- VI: "Giọng nói được chấm xong là xoá, trừ khi bạn chọn góp bản ghi để cải thiện Dygo. Mặc định không góp cho đến khi bạn tự bật."

**p2 · What we collect**: add a row after "Voice recording":
| What | Why | Legal basis | How long |
|---|---|---|---|
| EN: Donated voice recordings (only if you turn donation on): the recording, the word or sentence, its scores, your accent setting and, if you choose, your first language, region and English level | To train and test Dygo's own speech checker so it understands Vietnamese speakers of English better | Your separate consent (Profile › Privacy) | Up to [[3 years]], or until you turn donation off or delete them (we delete within [[30]] days) |
| VI: Bản ghi giọng nói được góp (chỉ khi bạn bật): bản ghi, từ hoặc câu, điểm, giọng UK/US bạn chọn và, nếu bạn muốn, tiếng mẹ đẻ, vùng miền và trình độ tiếng Anh | Để huấn luyện và kiểm thử bộ chấm phát âm riêng của Dygo, giúp chấm người Việt nói tiếng Anh chính xác hơn | Sự đồng ý riêng của bạn (Hồ sơ › Quyền riêng tư) | Tối đa [[3 năm]], hoặc đến khi bạn tắt hoặc xoá (chúng tôi xoá trong vòng [[30]] ngày) |

And change the note under the table:
- EN: "We don't collect precise location, contacts or photos, and we don't use your data for advertising. We never use your voice to identify or recognise you."
- VI: "Chúng tôi không thu thập vị trí chính xác, danh bạ hay ảnh, và không dùng dữ liệu của bạn để quảng cáo. Chúng tôi không bao giờ dùng giọng nói để nhận diện bạn."

**p3 · Children**: add a bullet
- EN: "Child profiles can never donate voice recordings, and a parent can't turn donation on for a child."
- VI: "Hồ sơ của trẻ em không bao giờ được góp bản ghi giọng nói, và phụ huynh không thể bật việc góp cho trẻ."

**p4 · Your voice** (replace)
- EN:
  - p: "<b>Normally:</b> when you tap the mic, your recording is sent to our own speech checker, compared with a native speaker's recording and deleted as soon as the result is ready. If you never tap the mic, we never hear you."
  - p: "<b>If you choose to donate:</b> in Profile › Privacy you can turn on “Donate my voice”. From then on, we keep your speaking and pronunciation recordings to train and test our own speech checker. Recordings made before you turned it on were already deleted."
  - ul:
    - "It's off unless you turn it on. Saying no, or stopping later, never changes what you can do in Dygo."
    - "We store donated recordings under a random code, apart from your name and email. We keep the link only so you can delete them."
    - "Some recordings may be listened to by trained people, our team or a contractor bound by a written agreement, to mark how words were said. They don't see your name or email."
    - "We use them only for Dygo's own speech checker. We never sell them, publish them or use them to recognise who you are."
    - "We keep them for up to [[3 years]]. Turn donation off and we stop keeping new recordings at once; tap “Delete my donated recordings” and we delete them within [[30]] days. A speech model already trained can't be un-trained, but your recordings won't be used in any future training."
- VI:
  - p: "<b>Thông thường:</b> khi bạn nhấn micro, bản ghi được gửi đến bộ chấm phát âm của chính chúng tôi, so với giọng người bản xứ và xoá ngay khi có kết quả. Nếu bạn không nhấn micro, chúng tôi không nghe thấy bạn."
  - p: "<b>Nếu bạn chọn góp:</b> trong Hồ sơ › Quyền riêng tư, bạn có thể bật “Góp giọng nói”. Từ lúc đó, chúng tôi lưu bản ghi luyện nói và phát âm của bạn để huấn luyện và kiểm thử bộ chấm phát âm riêng. Các bản ghi trước khi bạn bật đã được xoá."
  - ul:
    - "Mặc định tắt cho đến khi bạn tự bật. Không đồng ý, hoặc dừng sau này, không làm thay đổi những gì bạn được dùng trong Dygo."
    - "Bản ghi được góp lưu dưới một mã ngẫu nhiên, tách khỏi tên và email của bạn. Chúng tôi chỉ giữ liên kết để bạn có thể xoá chúng."
    - "Một số bản ghi có thể được người đã qua đào tạo (đội ngũ của chúng tôi hoặc đối tác có thoả thuận bằng văn bản) nghe để đánh dấu cách phát âm. Họ không thấy tên hay email của bạn."
    - "Chúng tôi chỉ dùng chúng cho bộ chấm phát âm của Dygo. Không bán, không công khai và không dùng để nhận diện bạn."
    - "Chúng tôi lưu tối đa [[3 năm]]. Khi bạn tắt, chúng tôi ngừng lưu bản ghi mới ngay; khi bạn nhấn “Xoá các bản ghi đã góp”, chúng tôi xoá trong vòng [[30]] ngày. Mô hình đã huấn luyện không thể “quên” lại, nhưng bản ghi của bạn sẽ không được dùng cho lần huấn luyện nào sau đó."

**p5 · Who we share data with**: add
- EN: "<b>Voice labelling (donated recordings only):</b> [[LABELLING PROVIDER, or remove if only our team]] may listen to some donated recordings to mark pronunciation, without your name or email." and "<b>Model training:</b> [[TRAINING / GPU PROVIDER]], in [[REGION]], processes donated recordings for us."
- VI: "<b>Gán nhãn giọng nói (chỉ bản ghi được góp):</b> [[ĐỐI TÁC GÁN NHÃN, hoặc bỏ nếu chỉ đội ngũ của chúng tôi]] có thể nghe một số bản ghi để đánh dấu cách phát âm, không kèm tên hay email của bạn." and "<b>Huấn luyện mô hình:</b> [[NHÀ CUNG CẤP GPU / HUẤN LUYỆN]], tại [[KHU VỰC]], xử lý bản ghi được góp cho chúng tôi."

**p8 · Your rights**: change the withdraw bullet
- EN: "withdraw consent, for example turn off reminders, stop speaking practice or stop donating your voice;"
- VI: "rút lại sự đồng ý, ví dụ tắt nhắc học, ngừng luyện nói hoặc ngừng góp giọng nói;"

**p9 · Automated decisions**: add a sentence
- EN: "Our speech checker is an AI model, trained in part on recordings learners chose to donate."
- VI: "Bộ chấm phát âm của chúng tôi là một mô hình AI, được huấn luyện một phần từ các bản ghi người học tự nguyện góp."

**p11 · Your local rights** (add one paragraph per region)
- VN (EN): "Donating your voice is a separate purpose with its own consent, which you give by turning on the setting yourself. We record when you agreed and to which version of this text, and we protect donated recordings as sensitive data." · VI: "Góp giọng nói là một mục đích riêng với sự đồng ý riêng, do bạn tự bật trong cài đặt. Chúng tôi ghi lại thời điểm và phiên bản văn bản bạn đã đồng ý, và bảo vệ bản ghi được góp như dữ liệu nhạy cảm."
- AU (EN): "We collect donated recordings only with your consent and only for the purpose above." · VI: "Chúng tôi chỉ thu thập bản ghi được góp khi bạn đồng ý và chỉ cho mục đích nêu trên."
- SG (EN): "Voice donation relies on your consent under the PDPA. You can withdraw it at any time, and we will stop collecting and delete as described above." · VI: "Việc góp giọng nói dựa trên sự đồng ý của bạn theo PDPA. Bạn có thể rút lại bất cứ lúc nào; chúng tôi sẽ ngừng thu thập và xoá như mô tả ở trên."

---

---

---

## Part 4 · Onboarding OB4b "Say 5 words" — REMOVED 2026-10-12 (Dylan: it doesn't help). Don't build it.

## Before Dylan turns the flag on
- **Lawyer review** of Part 3 (Vietnam; Singapore if the company moves). Ask: is a voice recording "biometric data" under Decree 356 when never used to identify anyone (the plan treats it as sensitive)? Does training Dygo's own model need a data-processing-service licence (Decree 356, Arts. 21–27; likely not for your own product)?
- Update the **processing impact assessment** (and the cross-border one if storage or GPUs are outside Vietnam) to include voice donation; file with A05.
- Fill the `[[…]]` placeholders: bucket, storage provider and region, labelling and training providers, retention (3 years), deletion time (30 days), `text_version`.
- Tell existing users in the app before the new Terms apply (Terms t11 / Privacy p12); nothing changes for anyone who doesn't donate.
- Then: flag on in UAT → check → flag on in production.
