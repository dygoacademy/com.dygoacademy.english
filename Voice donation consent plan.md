# Voice donation: consent, Terms and Privacy, implementation plan (for Claude Code)

Date: 2026-10-11 · Owner: Dylan · Status: **Draft for Dylan's review** (and a lawyer's, see §6)
Why: Dylan will train Dygo's own GOP scorer (wav2vec2, fine-tuned for Vietnamese speakers of English). That needs real learner recordings, kept with the learner's permission. Today both documents promise the opposite ("checked, then deleted … not used to train AI"), so the text, the app and the data handling must change **together, in one release**. Don't ship the new legal text before the setting exists, or the old promise before the setting is removed.

> **Gate:** build nothing here until Dylan marks this plan **Approved** and the legal text has been reviewed (§6).

---

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

## 3. The app (consent UX)

### 3.1 Setting: Profile › Privacy (new section)
- Toggle, **off by default**:
  - EN: **Help improve Dygo's speech checker** · "Keep my speaking and pronunciation recordings to train Dygo's own checker for Vietnamese speakers of English. You can stop at any time." · link "How we use donated recordings" → `/privacy#p4`
  - VI: **Góp giọng để Dygo chấm phát âm tốt hơn** · "Lưu bản ghi luyện nói và phát âm của tôi để huấn luyện bộ chấm riêng của Dygo cho người Việt nói tiếng Anh. Bạn có thể dừng bất cứ lúc nào." · "Dygo dùng bản ghi được góp như thế nào"
- Turning it **on** opens a short confirm sheet (below) — the switch alone isn't enough for a first consent.
- When on, a row: "{n} recordings donated" · VI "Đã góp {n} bản ghi", and a button **Delete my donated recordings** · VI **Xoá các bản ghi đã góp**. Confirm: "We'll delete your {n} donated recordings within 30 days. This can't be undone." · VI "Chúng tôi sẽ xoá {n} bản ghi bạn đã góp trong vòng 30 ngày. Không thể hoàn tác."
- Hidden for child profiles and for accounts under 16.

### 3.2 Confirm sheet (first time turning it on)
- Title: **Donate your voice recordings?** · VI **Góp bản ghi giọng nói?**
- Four short lines (EN / VI):
  1. "We keep your recordings from now on, under a random code, not your name." / "Từ giờ chúng tôi lưu bản ghi của bạn dưới một mã ngẫu nhiên, không kèm tên bạn."
  2. "Some may be listened to by trained people to mark how words were said." / "Một số bản ghi có thể được người đã qua đào tạo nghe để đánh dấu cách phát âm."
  3. "We use them only to improve Dygo's speech checker. Never sold, never public." / "Chỉ dùng để cải thiện bộ chấm phát âm của Dygo. Không bán, không công khai."
  4. "Kept up to 3 years. Turn off or delete any time in Profile › Privacy." / "Lưu tối đa 3 năm. Tắt hoặc xoá bất cứ lúc nào trong Hồ sơ › Quyền riêng tư."
- Optional fields (each "Prefer not to say"): first language, where in Vietnam you grew up (North / Central / South / elsewhere), English level. · VI: Tiếng mẹ đẻ · Bạn lớn lên ở miền nào (Bắc / Trung / Nam / nơi khác) · Trình độ tiếng Anh · "Không muốn trả lời".
- Buttons with **equal weight**: **Yes, donate** / **Not now** · VI **Đồng ý góp** / **Để sau**.

### 3.3 One-time invitation (optional, after the learner's 5th pronunciation check, adults only)
- A small card on the result screen, shown **once**, never again after "Not now":
  - EN: **Help Dygo hear Vietnamese speakers better?** "Most speech checkers learn only from native speakers. Your recordings would teach Dygo how Vietnamese speakers say English words, so its feedback gets fairer." · **Tell me more** (→ the confirm sheet) · **No thanks**
  - VI: **Giúp Dygo nghe người Việt nói chuẩn hơn?** "Hầu hết bộ chấm phát âm chỉ học từ người bản xứ. Bản ghi của bạn giúp Dygo hiểu cách người Việt nói từ tiếng Anh, để nhận xét công bằng hơn." · **Tìm hiểu thêm** · **Không, cảm ơn**

### 3.4 Small copy changes elsewhere
- SP0 mic screen and P3 checking: "Your recording is checked, then deleted." → when donation is **on**: "Your recording is checked and kept to improve Dygo (you chose this in Profile › Privacy)." · VI "Bản ghi được chấm và lưu lại để cải thiện Dygo (bạn đã chọn trong Hồ sơ › Quyền riêng tư)." Off: unchanged.
- Landing page speak demo: unchanged (visitors never donate).

---

## 4. Data handling (backend)

- `voice_donation_consents`: user_id, granted_at, withdrawn_at, text_version (e.g. `2026-11-v1`), method (`setting` / `invite`), locale. Never delete these rows (proof of consent), even after the recordings go.
- `voice_donors`: donor_code (random UUID) ↔ user_id. Deleting the account or the recordings deletes this link.
- Recordings: when consent is active at the moment of the check, after scoring copy the audio to a **separate encrypted bucket** (`[[STORAGE PROVIDER]]`, `[[REGION]]`) with metadata {donor_code, item text, target IPA, scores, accent, app locale, device type, optional profile answers, created_at}. No email, name or account id. Access: Dylan + named reviewers only, logged.
- The check path stays the same when consent is off: audio in memory only, then dropped.
- Withdrawal: stop copying at once. "Delete my donated recordings" and account deletion: queue a delete; done within 30 days; nightly job also deletes anything older than 3 years.
- Training sets are built from the bucket at training time; a set is deleted when the model built from it is replaced. Record which donor codes were in each set (so deletions are respected next time).
- Labelling: if a contractor is used, they get audio + text only, under a written data processing agreement.
- Tests: no copy when consent is off; copy when on; withdrawal stops copying; delete removes files + link; child / under-16 can't enable; consent row written with version.

---

## 5. Terms and Privacy: new text

Edit `com.dygoacademy.frontend/src/content/legal/{en-US,vi-VN,zh-CN}.ts` (ZH to match). Keep section ids. Also fix the old path "Me › Account" → "Profile › Account" (the tab is Profile now). Update "Last updated" and, per t11 / p12, tell existing users in the app before it applies (nothing changes for anyone who doesn't turn it on).

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
  - p: "<b>If you choose to donate:</b> in Profile › Privacy you can turn on “Help improve Dygo's speech checker”. From then on, we keep your speaking and pronunciation recordings to train and test our own speech checker. Recordings made before you turned it on were already deleted."
  - ul:
    - "It's off unless you turn it on. Saying no, or stopping later, never changes what you can do in Dygo."
    - "We store donated recordings under a random code, apart from your name and email. We keep the link only so you can delete them."
    - "Some recordings may be listened to by trained people, our team or a contractor bound by a written agreement, to mark how words were said. They don't see your name or email."
    - "We use them only for Dygo's own speech checker. We never sell them, publish them or use them to recognise who you are."
    - "We keep them for up to [[3 years]]. Turn donation off and we stop keeping new recordings at once; tap “Delete my donated recordings” and we delete them within [[30]] days. A speech model already trained can't be un-trained, but your recordings won't be used in any future training."
- VI:
  - p: "<b>Thông thường:</b> khi bạn nhấn micro, bản ghi được gửi đến bộ chấm phát âm của chính chúng tôi, so với giọng người bản xứ và xoá ngay khi có kết quả. Nếu bạn không nhấn micro, chúng tôi không nghe thấy bạn."
  - p: "<b>Nếu bạn chọn góp:</b> trong Hồ sơ › Quyền riêng tư, bạn có thể bật “Góp giọng để Dygo chấm phát âm tốt hơn”. Từ lúc đó, chúng tôi lưu bản ghi luyện nói và phát âm của bạn để huấn luyện và kiểm thử bộ chấm phát âm riêng. Các bản ghi trước khi bạn bật đã được xoá."
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

## 6. Before launch (Dylan, not Claude Code)

- **Lawyer review** of §5 in Vietnam (and Singapore if the company moves). I'm not a lawyer; this is a draft. Points to ask about:
  - Is a voice recording "biometric data" (sensitive) under Decree 356 even when it's never used to identify anyone? The plan treats it as sensitive to be safe.
  - Does training Dygo's own model count as a "personal data processing service" needing a licence (Decree 356, Arts. 21–27)? Likely not for your own product, but confirm.
  - The small-business exemption from impact assessments doesn't cover sensitive data: update the **processing impact assessment** (and the cross-border one if the bucket or GPUs are outside Vietnam) to include voice donation, and file with A05.
- Fill the `[[…]]` placeholders: retention, storage provider and region, labelling provider, training provider.
- Decide V-1 … V-10 (§1).
- Then mark this plan **Approved**; Claude Code builds §3–§5 in one release.
