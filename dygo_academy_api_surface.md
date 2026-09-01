# 🔌 Dygo Academy: Backend API Surface
**Document Version**: 1.0
**Status**: Living document — regenerate when endpoints change
**Live surface read from**: the running application's OpenAPI document, 30 August 2026

---

## 1. How to read this document

Endpoints are split into three tiers because they carry very different weight.
Conflating them is how a roadmap quietly turns into a status report.

| Tier | Count | Meaning |
| :--- | :---: | :--- |
| **Live** | 36 | Exists and responds today. Verified by direct code read (not yet re-verified against a running boot — see note below) 2026-09-01. |
| **Specified** | 4 | Named verbatim in `dygo_academy_tech_spec_and_conventions.md` §3.4 or in `dygo_academy_complete_system_architecture_master.md`. The only endpoints committed to in writing. |
| **Implied** | 14 | Derived from the BRD's functional requirements. **Carries no authority** — review before treating as a plan. |

> **The live API is the authority, not this file.** Swagger is generated from the
> code at boot and cannot go stale: **http://localhost:3001/api/docs**. This
> document exists for the part Swagger cannot show — what is coming, and on what
> evidence. It *will* drift the moment a route is added.
>
> **2026-09-01 note:** `POST /api/v1/words` was implemented this session
> (`words.controller.ts` / `words.service.ts` + unit tests) but has not yet
> been exercised against a running Postgres/Redis stack (no Docker in this
> environment) — verify against `/api/docs` before relying on it for UAT.
>
> **2026-09-01 note (2):** `GET /api/v1/groups` and `POST /api/v1/groups` were
> implemented this session (`groups.controller.ts` / `groups.service.ts` + unit
> tests) — the first slice of Module 1. Building `POST /groups` surfaced a real
> RLS deadlock: `groups_insert` only required `owner_id = auth.uid()`, but
> `group_members_insert_admin` required already holding ADMIN on the group,
> so no authenticated user could ever seat themselves as the first member of
> a group they'd just created. Fixed with a `security definer` trigger,
> `trg_group_owner_membership` (`database/migrations/001_initial_schema.sql`),
> that seats the owner as ADMIN inside the same insert. `004_seed_data.sql`'s
> membership insert and `database/tests/rls_test.sql` (§E) were updated
> accordingly. Like everything else in this note, unverified against a running
> stack — no Docker in this environment.
>
> **2026-09-01 note (3):** A second pass this session completed the rest of
> Module 1's implied table — 14 endpoints, all in §2 now: group detail
> (`PATCH`/`DELETE /groups/:id`), roster management (`GET`/`PATCH`/`DELETE
> .../members[/:userId]`), magic invites (`POST`/`GET .../invites`, `DELETE
> /invites/:id`, `POST /invites/:token/redeem`), and topic CRUD + clone
> (`POST /topics`, `GET`/`PATCH`/`DELETE /topics/:id`, `POST
> /topics/:id/clone`). Invite redemption required a new migration,
> `005_group_invites_redeem.sql` — `public.redeem_group_invite`, a
> `SECURITY DEFINER` function, not the `DATABASE_ADMIN_URL` superuser
> connection PartitionService uses, because the joiner is by definition not
> a member yet and cannot see the group under RLS; see that migration's
> header comment for why a scoped function was chosen over a broader
> service-role connection. `database/tests/rls_test.sql` gained §F covering
> redeem success, replay-is-idempotent, unknown/revoked/expired tokens.
> `database/apply-migrations.sh` now runs 005 after 003. 25 new backend
> unit tests (45 total), `tsc --noEmit` clean, `npm run lint` clean. None of
> this has been exercised against a running Postgres — no Docker in this
> environment, same limitation as note (2).
>
> **2026-09-01 note (4):** `EnrichmentProcessor`'s Gemini/TTS stub (note 2's
> era) is real now — `src/ai/gemini-enrichment.service.ts` calls Gemini 1.5
> Flash for the linguistic fields (structured JSON output, schema matches
> tech spec §4.2 exactly) and Gemini's own TTS model for audio;
> `src/storage/storage.service.ts` uploads the clip to R2/MinIO
> (`@aws-sdk/client-s3`, both are S3-compatible) and returns the public URL.
> One deliberate deviation: audio is stored as `.wav`, not the `.mp3` §4.2
> names — no MP3 encoder (ffmpeg/lame) is available in this sandbox, and WAV
> needs zero dependencies while playing natively in every `<audio>` tag;
> swapping to real MP3 later is a one-function change
> (`GeminiEnrichmentService.pcmToWav`) plus the R2 key extension. TTS/upload
> failures no longer fail the whole word — Gemini's text fields still land
> and `audio_url` stays null, since `topic_words_ready_requires_lexicon`
> only requires a `lexicon_id`, not audio. `master_lexicon` writes use `ON
> CONFLICT ... DO UPDATE` (two concurrent enrichments of the same word can
> both miss the dedup check before either finishes). `GET /topics/:id` also
> now returns `failure_reason` per word (was selected by nothing before,
> so the frontend's FAILED state could only show static copy). Frontend:
> the topic detail page's word list is real data now (`useTopic`, polls
> every 2.5s while any word is `ENRICHING`), and "+ Add a word" opens a
> working modal (`AddWordModal` + `useCreateWord`) instead of a disabled
> Phase-0 button. 6 new backend unit tests (51 total; the Gemini SDK calls
> themselves aren't covered — no network-mocking harness in this pass, and
> hitting the live API would cost real quota). `tsc --noEmit` and lint clean
> on both backend and frontend. **Still unverified against a running
> Postgres/Redis/MinIO stack** — no Docker in this environment; verify the
> full round-trip (`POST /words` → BullMQ → Gemini/TTS/R2 → `GET
> /topics/:id` shows `READY` with real IPA/audio) before UAT depends on it.
>
> **2026-09-01 note (5):** Module 3 (Error-Adaptive SRS, Phase 2) is
> code-complete — `SrsService`/`SrsController` plus `GET
> /topics/:id/cards/due` on `TopicsController` (tech spec §3.4's exact route
> shape; `TopicsModule` now imports `SrsModule` for it). The scoring math
> lives in `src/modules/srs/srs-algorithm.ts` as pure, unit-tested functions
> — it also **settles §5.4's "Open question for Phase 2"** below:
> `recent_mistakes` is recomputed from `review_logs` inside the same
> transaction as `POST /srs/rate`, not decayed on a schedule, so no third
> repeating job was needed. Two other assumptions worth flagging since
> nothing in the BRD pins them: the AGAIN/HARD/GOOD/EASY → SM-2 `q` mapping
> (0/3/4/5), and λ = 0.05 in the FR-3.1 formula — both documented, and both
> easy to retune, in that file's header comment. `POST /srs/sessions` does
> not persist a session row (no such table exists — see
> `StartSessionDto`'s comment); it just returns a tagged batch of due cards.
> 24 new backend unit tests (75 total), `tsc --noEmit` and lint clean.
> **Still unverified against a running Postgres** — same standing caveat as
> notes (1)–(4); the p95 < 15ms budget on the due-card read path in
> particular has not been measured anywhere real.
>
> **2026-09-01 note (6):** Module 5 (Dynamic Multi-Modal Quiz Engine, Phase
> 3) is code-complete — `QuizService`/`QuizController` (`POST
> /quizzes/generate`, `POST /quizzes/:id/answer`, `GET
> /quizzes/leech-drill`), all three named in this doc's own §4 table as
> "implied," now moved to §2. The generation/grading math lives in
> `src/modules/quiz/quiz-generator.ts` as pure, unit-tested functions — same
> split as `srs-algorithm.ts`. Biggest design call, made because nothing in
> the schema backs it: **no persisted quiz/session/attempt row.** A quiz
> item's id is deterministic (`` `${topicWordId}:${type}` ``) and its correct
> answer is always derived the same way (first example sentence, first
> synonym, etc.), so `POST /quizzes/:id/answer` can re-derive and grade the
> exact question `POST /quizzes/generate` handed out earlier without a
> database row remembering it — only the wrong-answer distractor options
> differ run to run, and grading never looks at those. FR-5.3 ("Synonym &
> Antonym Matching... drag-and-drop semantic pairing") is implemented as
> one-word-at-a-time multiple choice, not a multi-pair board — flagged as a
> deliberate simplification in `quiz-generator.ts`'s header comment, same
> spirit as the Module 4 clue-ladder disagreement already flagged above.
> FR-5.5's AI nuance explanation only calls Gemini
> (`GeminiEnrichmentService.explainNuance`, new this pass) on a **wrong**
> answer, and degrades to a generic message if that call itself fails —
> never a 500. `GET /quizzes/leech-drill` builds on `SrsService.findLeeches`
> rather than a second leech query, and is the destination note (5)'s own
> Phase 2 gap ("no dedicated leech-drill queue screen exists yet") pointed
> at; the frontend's leech nudge now links there instead of being a dead
> end. Separately, this pass also fixed a real gap flagged since the second
> pass: `DELETE /groups/:id/members/:userId` now blocks removing a group's
> last ADMIN (`409 Conflict`) rather than silently leaving a group no one
> can manage — see §2's entry for that route. 32 new backend unit tests (107
> total, up from 75: 28 for quiz-generator/QuizService, 4 replacing the old
> single-case `removeMember` test with real last-ADMIN coverage).
> `tsc --noEmit` and lint clean on both sides. **Still unverified against a
> running Postgres/Redis stack** — same standing sandbox limitation as every
> note above.
>
> **2026-09-01 note (7):** Module 6 (Web Push & Habit Scheduling, Phase 3) is
> code-complete — `NotificationsService`/`NotificationsController`
> (`GET /notifications/vapid-public-key`, `POST`/`DELETE
> /notifications/subscribe`, `GET`/`POST /notifications/schedules`, `DELETE
> /notifications/schedules/:id`, `POST
> /notifications/groups/:groupId/sprint`) plus a real `NotificationProcessor`
> — this doc's §4 Module 6 table is now empty and marked complete, same
> treatment as Modules 1/3/5. Two deliberate deviations from that table's
> guessed shape: schedules are `POST`-upserted (`on conflict (user_id,
> reminder_time)`) rather than `PATCH`ed by id — the frontend's settings
> screen has no separate "edit" affordance, so a second `POST` for the same
> clock time is the edit — and the sprint route lives under
> `/notifications/groups/:groupId/sprint` (singular, plural resource) rather
> than `/groups/:id/sprints`, keeping every push-sending route in one
> controller. New shared `PushDispatchService` (send + dead-subscription
> cleanup on a 404/410, used by both the tick and the sprint route) and a
> pure `notification-message.ts` (`buildReminderPayload`) deciding **one**
> message per matched `study_schedules` row: FR-6.4 (leech drill) outranks
> FR-6.3 (streak protection) outranks FR-6.1 (plain habit nudge), since no
> `notification_log` table exists to track "already notified today" — same
> "don't persist what's derivable" instinct as Module 5's stateless quiz
> items. Bucket-matches each tick against a user's *own* local day via
> `width_bucket` over seconds-of-day (96 buckets of 15 minutes), which is
> what makes half-hour and 45-minute-offset zones (`Asia/Kathmandu`,
> UTC+5:45) land correctly despite the tick itself running on UTC
> quarter-hours. FR-6.2's sprint route is `has_group_role`-gated explicitly
> in application code rather than via RLS's `with check` (the codebase's
> usual pattern — see `GroupsService.createInvite`'s header comment) because
> there is no table row being written here for RLS to gate. FR-5.3's
> counterpart for FR-6.2: no teacher-facing trigger screen exists on the
> frontend — there is no group-management frontend at all yet (roster/invite
> screens are still wireframe-only since turn 3) — so this route is API- and
> wireframe-only for now; flagged in the wireframe's turn 8g caption rather
> than silently built with no way to reach it. 22 new backend unit tests
> (129 total, up from 107). `tsc --noEmit` and lint clean on both sides.
> **Still unverified against a running Postgres/Redis stack** — same
> standing sandbox limitation as every note above; in particular the
> `width_bucket` bucket-matching SQL and the VAPID `web-push` calls have
> only been exercised through mocks, never against real Postgres or a real
> browser push service.
>
> **2026-09-01 note (7th pass) — no new backend routes, but the standing
> "no group-management frontend" gap this doc has flagged since Module 6
> (§ above) is closed.** Every Module 1 route already listed as Live below
> now has a real caller: `app/(dashboard)/groups/` (list, create, roster
> with role management and member removal, invite mint/list/revoke,
> settings/delete) and `app/(dashboard)/join/[token]/` (redeem). The
> teacher-sprint route (`POST /notifications/groups/:groupId/sprint`,
> Module 6) has its own trigger button on the group detail page too — the
> "API- and wireframe-only for now" line above no longer applies. Also
> closed in passing, not part of Module 1/6: `POST /topics` finally has a
> frontend caller (the topics/browse "+ New Topic" tile read "· Phase 1"
> since turn 1f), and `DELETE /topics/:id` has its first-ever frontend
> caller (checked during the fifth pass's own last-ADMIN work — "no
> delete-topic button exists anywhere in the running frontend yet," only in
> the wireframe; it does now, ADMIN-gated in the UI to match
> `topics_delete_admin`).
>
> **A bigger, previously-undiscovered gap closed the same pass: `(auth)/login`
> and `(auth)/register` were still the literal Phase-0 "Coming in Phase 1"
> stubs** — no form, no `supabase.auth` call, nothing. This meant no route in
> this application was reachable through a real browser at all, independent
> of how much of the rest of the stack existed; six prior session reports
> never caught it because none of them could boot a browser to notice. Real
> `signInWithPassword`/`signUp` forms now exist. That surfaced a second,
> older gap: `database/migrations/004_seed_data.sql`'s `auth.users` insert
> only ever set `id`/`email` — enough for `scripts/dev-token.js` (which
> signs its own JWT and never touches GoTrue) but not enough to sign in
> through the real `supabase-auth` container the new login form actually
> calls. Fixed by setting `encrypted_password`/`email_confirmed_at` on all
> five fixtures (shared dev password `dygo-dev-2026`) — **unverified against
> a real GoTrue container in this sandbox**, same standing caveat as
> everything else on this page; confirm one real sign-in before trusting it
> for UAT.

---

## 2. Live today

**36 operations · Phase 0 + Module 1 + Module 3 + Module 5 + Module 6 complete**

One other controller is registered — `billing` — but declares no routes, so
it answers `404`, not `401`.

| Method | Path | Auth | Returns |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | public | Liveness plus a real `select 1` against Postgres. The only route exempt from the global guard. |
| `GET` | `/api/v1/topics` | bearer | Topics visible to the caller, with word counts. The SQL carries **no** tenant or membership filter — Row-Level Security does the filtering inside Postgres. |
| `POST` | `/api/v1/topics` | bearer | Creates a topic under a group. Requires WRITE on that group (`topics_insert_write`); a caller without it gets `403` from the INSERT itself. |
| `GET` | `/api/v1/topics/:id` | bearer | Topic detail plus its words, as two separately RLS-scoped queries (`topics_select`, `topic_words_select`) rather than a join. `404` if the topic doesn't exist or isn't visible to the caller. |
| `PATCH` | `/api/v1/topics/:id` | bearer | Rename / re-describe / toggle visibility. Requires WRITE (`topics_update_write`); `404` for both "not found" and "not WRITE" — RLS filters the UPDATE's target rows rather than raising. |
| `DELETE` | `/api/v1/topics/:id` | bearer | ADMIN only (`topics_delete_admin`) — tech spec §4.1 is explicit that WRITE cannot delete a topic. |
| `POST` | `/api/v1/topics/:id/clone` | bearer | Clones a topic that is genuinely `is_public = true` (checked explicitly, not just RLS-readable) into a new, private-by-default topic under a target group the caller has WRITE on. Copies words including their resolved `lexicon_id` (no re-enrichment); does not copy `custom_note`. Transactional via `DatabaseService.withUser`. |
| `POST` | `/api/v1/words` | bearer | Inserts a `topic_words` row (`status = ENRICHING`) and enqueues `enrichment-queue`. Returns `201`. WRITE-role enforcement is Postgres RLS (`topic_words_insert_write`), translated to `403`/`409` in `WordsService`, not re-checked in application code. |
| `GET` | `/api/v1/groups` | bearer | Groups the caller is a `group_members` row in, with their role. Narrower than the `groups_select` RLS policy on purpose — see `GroupsService.findMine`. |
| `POST` | `/api/v1/groups` | bearer | Creates a group owned by the caller; `tenant_id` is computed from the caller's profile by Postgres, never trusted from the body. The owner is seated as `ADMIN` automatically by `trg_group_owner_membership`. Fails if the caller's profile has no `tenant_id` yet — solo-user tenant provisioning is unspecified (see note above). |
| `PATCH` | `/api/v1/groups/:id` | bearer | Rename / re-describe / toggle visibility. ADMIN only (`groups_update_admin`); same 404-for-both-cases reasoning as topic update. |
| `DELETE` | `/api/v1/groups/:id` | bearer | ADMIN only (`groups_delete_admin`). |
| `GET` | `/api/v1/groups/:id/members` | bearer | The roster. WRITE-and-above see everyone; a READ member sees only their own row — enforced by `group_members_select`, not this endpoint. |
| `PATCH` | `/api/v1/groups/:id/members/:userId` | bearer | Assign a member's role. ADMIN only (`group_members_update_admin`). |
| `DELETE` | `/api/v1/groups/:id/members/:userId` | bearer | Revoke a member's access. ADMIN only (`group_members_delete_admin`). **2026-09-01 (Phase 3 pass):** now blocks removing a group's last ADMIN (`409 Conflict`) — see `GroupsService.removeMember`'s header comment. |
| `POST` | `/api/v1/groups/:id/invites` | bearer | Mints a magic invite link. ADMIN only (`group_invites_insert_admin`). The raw token is generated in Node, returned exactly once, and never persisted — only `public.hash_invite_token`'s SHA-256 of it is. |
| `GET` | `/api/v1/groups/:id/invites` | bearer | Lists **live** invites only (not revoked, not expired, not exhausted). ADMIN only (`group_invites_select_admin`); a non-ADMIN gets `[]`, not `403`. |
| `DELETE` | `/api/v1/invites/:id` | bearer | Soft-revokes an invite (sets `revoked_at`; does not delete the row) — top-level path, not nested under a group, per the spec. ADMIN only (`group_invites_update_admin`). |
| `POST` | `/api/v1/invites/:token/redeem` | bearer | Any authenticated caller. Runs `public.redeem_group_invite`, a `SECURITY DEFINER` function (005_group_invites_redeem.sql) — the joiner isn't a member yet, so RLS can't show them the group. `404` on an unknown token, `410 Gone` on revoked/expired/exhausted. Replaying an already-redeemed token is idempotent (`already_member: true`), not an error, and does not double-count `use_count`. |
| `GET` | `/api/v1/topics/:id/cards/due` | bearer | FR-3.4, tech spec §3.4's exact route. Due `user_word_srs` rows for this topic plus never-reviewed `READY` words ("new cards"). Lives on `TopicsController`, delegates to `SrsService.findDue` — see note (5). |
| `GET` | `/api/v1/srs/due` | bearer | Same as above, not scoped to a topic (FR-3.4). |
| `GET` | `/api/v1/srs/leeches` | bearer | FR-3.3 — words with `is_leech = true` (≥ 4 failures in the trailing 7 days). Reads the stored flag, not a live aggregate. |
| `GET` | `/api/v1/srs/stats` | bearer | FR-8.1 — total/mastered/due/leech counts plus a consecutive-day streak computed from `review_logs`. |
| `POST` | `/api/v1/srs/rate` | bearer | FR-3.2 — submit `AGAIN`/`HARD`/`GOOD`/`EASY`. Updates ease factor, interval, and leech status per the FR-3.1 formula (`srs-algorithm.ts`); one transaction covering the state read, the `review_logs` insert, and the `user_word_srs` upsert. |
| `POST` | `/api/v1/srs/sessions` | bearer | FR-4.3 — Standard/Reverse/Listening mode. Returns a due-card batch tagged with the mode; does not persist a session row (none exists in the schema). |
| `POST` | `/api/v1/srs/sync` | bearer | Architecture §1 — replays offline-queued reviews in chronological order via the same rating logic as `/srs/rate`; a bad item in the batch is reported per-item, not a batch failure. |
| `POST` | `/api/v1/quizzes/generate` | bearer | FR-5.1–5.4 — Cloze, Dictation, Matching, Contextual Choice, drawn from `READY` words the caller can read. Stateless: an item's id (`` `${topicWordId}:${type}` ``) encodes enough to grade it later without a persisted row — see note (6). |
| `GET` | `/api/v1/quizzes/leech-drill` | bearer | FR-3.3's remedial queue, built on `SrsService.findLeeches`. Prefers the richest question type each leech word's data supports. |
| `POST` | `/api/v1/quizzes/:id/answer` | bearer | FR-5.5 — grades against the item id, and only on a wrong answer asks Gemini (`GeminiEnrichmentService.explainNuance`) for a short nuance explanation. Degrades to a generic message if that call fails. |
| `GET` | `/api/v1/notifications/vapid-public-key` | bearer | FR-6.5 — the value the frontend passes as `applicationServerKey` to `pushManager.subscribe()`. Not a secret; kept behind auth anyway since only a signed-in student needs it. |
| `POST` | `/api/v1/notifications/subscribe` | bearer | FR-6.5 — registers a browser's `PushSubscriptionJSON` verbatim. `on conflict (endpoint)` — one browser is one row regardless of which account last registered it. |
| `DELETE` | `/api/v1/notifications/subscribe` | bearer | Unregisters one browser's subscription by endpoint. |
| `GET` | `/api/v1/notifications/schedules` | bearer | FR-6.1 — the caller's own daily reminder times. |
| `POST` | `/api/v1/notifications/schedules` | bearer | FR-6.1 — upsert on `(user_id, reminder_time)`, not create-only; see note (7). |
| `DELETE` | `/api/v1/notifications/schedules/:id` | bearer | Removes a reminder schedule. |
| `POST` | `/api/v1/notifications/groups/:groupId/sprint` | bearer | FR-6.2 — ADMIN-only, immediate (not tick-scheduled) push to every other group member's registered devices. `403` via an explicit `has_group_role` check — see note (7) for why this one doesn't lean on RLS like most writes here. |

---

## 3. Named in the specification

**4 operations · quoted, not inferred**

| Method | Path | Status | Source & purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/words` | **live** | Tech spec §3.4 — ingest a word. Must return `201` with status `ENRICHING` in **< 50 ms**. Built 2026-09-01; the <50ms budget itself has not been load-tested (no running stack in this environment). |
| `GET` | `/api/v1/topics` | **live** | Tech spec §3.4 — list public and private topics. Built. |
| `GET` | `/api/v1/topics/:topicId/cards/due` | **live** | Tech spec §3.4 — the SRS review queue. Carries the **p95 < 15 ms** SLO, unmeasured — see note (5). Built 2026-09-01. |
| `POST` | `/api/v1/srs/rate` | **live** | Tech spec §3.4 — submit a review rating (`AGAIN` / `HARD` / `GOOD` / `EASY`). Built 2026-09-01. |
| `POST` | `/api/v1/billing/checkout` | spec | Tech spec §3.4 — create a Stripe checkout session. See the conflict below. |
| `POST` | `/api/v1/notifications/subscribe` | **live** | Architecture §4 sequence diagram — register a VAPID endpoint with `p256dh` and `auth` keys. Built 2026-09-01; see note (7) and §2. |

### ⚠️ Two documents disagree

The billing checkout endpoint is named differently in each source:

- `POST /billing/checkout` — **Tech Spec & Conventions** §3.4
- `POST /billing/create-checkout-session` — **System Architecture** §6

Worth settling before Phase 4 rather than during it. The tech spec's shorter
form matches its own stated convention of plural nouns and kebab-case, so it is
the better candidate — but the decision is yours, and whichever wins, the other
document should be corrected.

---

## 4. Implied by the requirements

**14 operations · inferred, needs review**

No document names these. Each is derived from a functional requirement that
cannot be satisfied without it — a teacher who can invite students needs
somewhere to create the invite. **Treat this as a proposal to argue with, not a
plan of record.**

Paths below omit the `/api/v1` prefix for readability.

### Module 1 — Groups, topics & RBAC · Phase 1

**Complete** — every endpoint this table used to list is now live; see §2.
Kept as a heading rather than deleted so a reader scanning by module can
still tell Module 1's implied-endpoint work is done, not merely absent.

### Module 2 — Word ingestion & AI enrichment · Phase 1

| Method | Path | Min role | Requirement |
| :--- | :--- | :--- | :--- |
| `GET` | `/topics/:topicId/words` | READ | FR-2.1 — list with enrichment status |
| `GET` | `/words/:id` | READ | Phase 1 frontend polls this for `ENRICHING → READY` |
| `PATCH` | `/words/:id` | WRITE | FR-1.2 — edit custom notes |
| `DELETE` | `/words/:id` | WRITE | Module 1 permission matrix |
| `POST` | `/words/:id/re-enrich` | WRITE | Tech spec §4.1 — WRITE may "trigger re-enrichment" |
| `GET` | `/lexicon/search` | any | FR-2.2 — backed by the trigram index on `master_lexicon` |

### Module 3 — SRS engine · Phase 2

**Complete** — `due`, `leeches`, `stats`, `sessions`, and `sync` are all live;
see §2. Module 4 (the 3D flashcard player) is frontend-only and has no API
surface of its own — it consumes these same endpoints.

### Module 5 — Dynamic quizzes · Phase 3

**Complete** — all three endpoints this table used to list are now live; see
§2 and note (6). Kept as a heading for the same reason Module 1's and
Module 3's are: so a reader scanning by module can tell this one's implied
work is done, not merely absent.

### Module 6 — Push & habit scheduling · Phase 3

**Complete** — every endpoint this table used to list is now live, under
`/notifications/...` rather than the bare paths guessed here; see §2 and
note (7) for the two deliberate shape deviations (upsert instead of
`PATCH`, and the sprint route's exact path/role). Kept as a heading for the
same reason Modules 1/3/5 are.

### Module 7 — Seat billing · Phase 4

| Method | Path | Min role | Requirement |
| :--- | :--- | :--- | :--- |
| `POST` | `/billing/webhook` | signature | FR-7.3 — Stripe events. Signature-verified and idempotent; **never** behind the JWT guard |
| `GET` | `/billing/subscription` | ADMIN | FR-7.1 — current tier, seats, period end |
| `PATCH` | `/billing/seats` | ADMIN | FR-7.4 — mid-cycle seat change with proration |
| `GET` | `/billing/portal` | ADMIN | FR-7.3 — Stripe customer portal link |
| `GET` | `/billing/invoices` | ADMIN | FR-7.3 — invoices recorded in Postgres |

### Module 8 — Analytics & heatmaps · Phase 4

| Method | Path | Min role | Requirement |
| :--- | :--- | :--- | :--- |
| `GET` | `/analytics/me` | self | FR-8.1 — streaks, retention curve, leech list |
| `GET` | `/analytics/groups/:id/heatmap` | WRITE | FR-8.2 — cohort error rates. **Must return aggregates only**: RLS keeps `review_logs` owner-only, and this endpoint must not become the way around that |
| `GET` | `/analytics/tenant` | ADMIN | Persona table — institution-wide retention reports |

---

## 5. Not endpoints — background workers

Three BullMQ processors are registered and running. They have no HTTP surface
and never will — they are what lets `POST /words` answer in under 50 ms while
the expensive work happens elsewhere.

### 5.1 Consumers (processors)

| Processor | Queue | State | Behaviour |
| :--- | :--- | :--- | :--- |
| `EnrichmentProcessor` | `enrichment-queue` | **working** | Dedup lookup (FR-2.2) returns early on a `master_lexicon` hit — no Gemini call for a word already cached. On a miss: Gemini 1.5 Flash for linguistic fields, Gemini TTS for audio, upload to R2/MinIO, upsert `master_lexicon`, mark the `topic_word` `READY`. A terminal failure (last BullMQ attempt) marks it `FAILED` with a reason instead of retrying forever or leaving it stuck `ENRICHING`. See note (4) above for the `.wav`-not-`.mp3` deviation. |
| `NotificationProcessor` | `notification-queue` | **working** | Every 15-minute tick, bucket-matches `study_schedules` against each user's own local time (`width_bucket`, see note (7)), decides one message per matched user (`notification-message.ts`), and dispatches via `PushDispatchService` — real VAPID `web-push` calls, not a log line. |
| `MaintenanceProcessor` | `maintenance-queue` | **working** | Provisions `review_logs` partitions 6 months ahead and warns if rows land in the DEFAULT partition. |

### 5.2 Producers (repeating jobs)

> **A processor is only a consumer.** Registering `@Processor(QUEUE)` makes the
> app *able* to handle a job; it does not make one appear. Until 2026-08-30 the
> notification queue had a consumer and no producer, so it never ticked — and
> nothing errored, because an empty queue is a valid state. The failure mode was
> silence. Repeating jobs now live in `src/queues/job-scheduler.service.ts`.

| Scheduler id | Pattern | Queue | Purpose |
| :--- | :--- | :--- | :--- |
| `notification-tick-every-15m` | `*/15 * * * *` | `notification-queue` | FR-6.1 — the habit-reminder heartbeat. Runs on UTC quarter-hours; the per-user local-time match happens in the processor against each user's IANA zone, so DST is handled by the database rather than by the schedule. |
| `partition-maintenance-daily` | `15 3 * * *` | `maintenance-queue` | Keeps `review_logs` partitions ahead of the calendar. Off the hour deliberately, so it does not contend with every other cron at `:00`. |
| *(bootstrap)* | every boot | `maintenance-queue` | One-off partition pass at startup, so a deploy on the 31st does not wait until 03:15 tomorrow to create next month's partition. |

Registration uses `queue.upsertJobScheduler(stableId, pattern, template)`, keyed
on the scheduler id above. Restarting the app — or running several instances —
updates one schedule rather than stacking duplicates (verified: three boots,
still one scheduler per queue). Changing a pattern takes effect on next boot.

**Add repeating jobs there, never with a bare `queue.add({ repeat })`** — that
form is keyed on the job's options rather than a stable id, so every restart
creates another schedule and the job fires N times per tick.

### 5.3 Why partition maintenance is not optional

`review_logs` is RANGE-partitioned by `reviewed_at`. An `INSERT` with no
matching partition does not fall back — it **fails outright**. `001_initial_schema.sql`
created partitions through 2027-01 by hand; without something extending that
window, every review submitted from 1 February 2027 would error, with no warning
beforehand.

A `DEFAULT` partition exists as a backstop so nothing is ever lost, but rows
landing there mean provisioning fell behind — and relocating them later requires
an exclusive lock on the whole table, which is why the processor warns rather
than staying quiet about it.

`PartitionService` runs on a short-lived connection using `DATABASE_ADMIN_URL`,
**not** the pooled `authenticator` role the API uses. That role deliberately has
no privilege to `CREATE TABLE`. If `DATABASE_ADMIN_URL` is unset, partition
maintenance fails while the rest of the API carries on working normally.

### 5.4 Not scheduled — and deliberately so

The SRS due-card queue is **not** a scheduled job. `next_due_at <= now()` is
evaluated when a student opens a review session: a query, not a cron. Nothing
needs to wake up and mark cards due, which is why the p95 &lt; 15 ms SLO applies
to a read path rather than to a worker.

> **Resolved (2026-09-01, see note (5) above).** `user_word_srs.recent_mistakes`
> is recomputed from `review_logs` inside the same transaction as `POST
> /srs/rate` — not decayed on a schedule. No third repeating job was added.
> Detail and reasoning: `src/modules/srs/srs-algorithm.ts`'s header comment.

---

## 6. Conventions every endpoint inherits

Wired globally in `app.module.ts` and `main.ts`, so a controller written next
month gets them without doing anything.

| Convention | Behaviour |
| :--- | :--- |
| **Versioned prefix** | Global prefix `api` plus URI versioning, default `1`. A controller declaring `path: 'topics'` answers at `/api/v1/topics`. |
| **Auth is opt-out** | The JWT guard is an `APP_GUARD`. Everything requires a bearer token unless marked `@Public()`. Forgetting the decorator makes a route too strict — never too open. |
| **RLS reaches the API** | Queries run as `authenticator` with the caller's claims set per transaction. Service methods add **no** tenant filters; Postgres does it. |
| **Strict input validation** | `forbidNonWhitelisted` is on. An unknown property is a `400`, not a silently dropped field. |

### Response envelope

```json
{
  "success": true,
  "data": { },
  "meta": { "timestamp": "2026-08-30T13:48:26.454Z" }
}
```

### Error envelope

```json
{
  "success": false,
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Missing bearer token",
  "timestamp": "2026-08-30T13:53:24.053Z",
  "path": "/api/v1/topics"
}
```

---

## 7. Provenance

- **Live surface** — read from the running application's OpenAPI document
  (`/api/docs-json`) on 30 August 2026, not from reading source.
- **Specified endpoints** — quoted from `dygo_academy_tech_spec_and_conventions.md` §3.4
  and `dygo_academy_complete_system_architecture_master.md` §§4 and 6.
- **Implied endpoints** — inference from the functional requirements in
  `dygo_academy_final_master_brd.md`. These carry no authority; review them
  before they become a plan.
