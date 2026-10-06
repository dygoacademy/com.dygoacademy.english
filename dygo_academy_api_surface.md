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
| **Live** | 39 | Exists and responds today. Verified by direct code read (not yet re-verified against a running boot — see note below) 2026-09-01. |
| **Specified** | 4 | Named verbatim in `dygo_academy_tech_spec_and_conventions.md` §3.4 or in `dygo_academy_complete_system_architecture_master.md`. The only endpoints committed to in writing. |
| **Implied** | 13 | Derived from the BRD's functional requirements. **Carries no authority** — review before treating as a plan. |

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
> **2026-09-01 note (12th pass):** `POST /api/v1/words/:id/re-enrich` was
> implemented this session — the FAILED word state's "Try again" button had
> existed since Module 2 shipped with no backend route and no `onClick`.
> Unverified against a running stack, same standing limitation as everything
> else in this document.
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
> `src/storage/storage.service.ts` uploads the clip to Cloudflare R2
> (`@aws-sdk/client-s3`) and returns the public URL.
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
> lived in `src/modules/srs/srs-algorithm.ts` as pure, unit-tested functions
> (**superseded 2026-09-25 by Phase 10's FSRS scheduler**, `fsrs-scheduler.ts`
> + `grading.ts`; the SM-2 notes below are historical)
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
>
> **2026-09-01 note (8), 19th pass:** Built the tenant-wide widening of the
> FR-8.2 mistake heatmap (`AnalyticsService.tenantHeatmap`,
> `010_tenant_word_heatmap.sql`) — the real backend-scope item the 18th
> pass's standing note named as unblocked (009 closed the RLS side) and
> deliberately left undone. New `TenantAnalyticsController` route: `GET
> /api/v1/analytics/tenant/heatmap`, tenant-admin only, no `tenantId` param
> (always the caller's own tenant). While adding it, found and fixed a
> real doc gap unrelated to the new work: the *existing* `GET
> /api/v1/groups/:id/heatmap` route (live since Module 8 shipped, 8th–18th
> passes) was never added to this file's §2 table at all — this section's
> own "36 operations" header count was stale evidence of the same miss,
> off by more than just this one gap (see the corrected count below). Both
> rows now present; see §2. Also extended `heatmap-aggregator.ts`'s
> `rankHeatmap` to be generic (`<T extends WordAttemptCounts>`) rather than
> duplicating the sort/cap logic for the tenant shape — same worst-first,
> attempts-desc-tiebreak ranking, now reused by both endpoints. 6 new
> backend unit tests (159 total, up from 153), plus 9 new cross-group
> aggregation assertions in `database/tests/rls_test.sql` §K and a new
> `describe` block in `com.dygoacademy.automationtesting`'s
> `analytics.spec.ts` covering the live route (still never actually run —
> no Docker in this sandbox, same standing limitation as sections H and J).
> `tsc --noEmit` and lint clean on both backend and frontend (frontend
> untouched this pass — no UI consumes this route yet; the wireframe turns
> 12–14 already sketch what one would look like, still unrenderable in
> this sandbox). See the nineteenth-pass entry in
> `dygo_academy_session_report_2026-09-01.md` for the full writeup.

---

## 2. Live today

> **2026-10-02 note (Phase 12 UI-8) — no API route changes; the frontend
> callers moved.** The classic UI is deleted, so every route below is called
> from the garden screens at their final URLs: groups from `/groups/**`,
> invite redeem/preview from `/join/:token` (invite links are still
> `/join/<token>`), SRS from `/review`, topics from `/topics/**`, quizzes from
> `/quiz`, profile/stats/schedules from `/me`. The push deep links the backend
> sends (`/study`, `/topics/:id`) are unchanged; the frontend middleware
> 308-redirects `/study` → `/review` (and `/garden/<x>` → `/<x>`), so no backend
> change is needed. The `app/(dashboard)/…` paths in older notes below are
> history.

**39 operations · Phase 0 + Module 1 + Module 3 + Module 5 + Module 6 complete**

One other controller is registered — `billing` — but declares no routes, so
it answers `404`, not `401`.

| Method | Path | Auth | Returns |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | public | Liveness plus a real `select 1` against Postgres. The only route exempt from the global guard. |
| `GET` | `/api/v1/topics` | bearer | Topics visible to the caller, with word counts. The SQL carries **no** tenant or membership filter — Row-Level Security does the filtering inside Postgres. |
| `POST` | `/api/v1/topics` | bearer | Creates a topic under a group. Requires WRITE on that group (`topics_insert_write`); a caller without it gets `403` from the INSERT itself. |
| `GET` | `/api/v1/topics/:id` | bearer | Topic detail plus its words, as two separately RLS-scoped queries (`topics_select`, `topic_words_select`) rather than a join. Each word also carries the **caller's own** `fsrs_state`, `mastered_at`, `is_leech`, `next_due_at` from a left join to `user_word_srs` on `user_id = caller` (all null when never studied; never another learner's rows; Phase 12 UI-5 U5-1, 2026-09-27). `404` if the topic doesn't exist or isn't visible to the caller. |
| `PATCH` | `/api/v1/topics/:id` | bearer | Rename / re-describe / toggle visibility. Requires WRITE (`topics_update_write`); `404` for both "not found" and "not WRITE" — RLS filters the UPDATE's target rows rather than raising. |
| `DELETE` | `/api/v1/topics/:id` | bearer | ADMIN only (`topics_delete_admin`) — tech spec §4.1 is explicit that WRITE cannot delete a topic. |
| `POST` | `/api/v1/topics/:id/clone` | bearer | Clones a topic that is genuinely `is_public = true` (checked explicitly, not just RLS-readable) into a new, private-by-default topic under a target group the caller has WRITE on. Copies words including their resolved `lexicon_id` (no re-enrichment); does not copy `custom_note`. Transactional via `DatabaseService.withUser`. |
| `POST` | `/api/v1/words` | bearer | Inserts a `topic_words` row (`status = ENRICHING`) and enqueues `enrichment-queue`. Returns `201`. WRITE-role enforcement is Postgres RLS (`topic_words_insert_write`), translated to `403`/`409` in `WordsService`, not re-checked in application code. |
| `POST` | `/api/v1/words/:id/re-enrich` | bearer | **New (12th pass).** The FAILED state's "Try again" button (wireframe 1l) — flags the row back to `ENRICHING` and re-enqueues `enrichment-queue`, only when it is currently `FAILED` (a plain `UPDATE ... WHERE status = 'FAILED'`, not a separate application check). `404` on zero rows — nonexistent, RLS-hidden (no WRITE), or not currently `FAILED` are all indistinguishable, same collapse `topics`/`groups` already use. Frontend wired the same pass (`useReEnrichWord`, `WordStatusRow.tsx`) — the button existed since Module 2 shipped but had no `onClick` until now. |
| `GET` | `/api/v1/groups` | bearer | Groups the caller is a `group_members` row in, with their role. Narrower than the `groups_select` RLS policy on purpose — see `GroupsService.findMine`. |
| `POST` | `/api/v1/groups` | bearer | Creates a group owned by the caller; `tenant_id` is computed from the caller's profile by Postgres, never trusted from the body. The owner is seated as `ADMIN` automatically by `trg_group_owner_membership`. **Fixed (9th pass):** every caller now always has a `tenant_id` — `handle_new_auth_user()` (`006_solo_tenant_provisioning.sql`) auto-provisions a personal, unpaid (0-seat) tenant for every signup, so this can no longer fail on a missing tenant. |
| `PATCH` | `/api/v1/groups/:id` | bearer | Rename / re-describe / toggle visibility. ADMIN only (`groups_update_admin`); same 404-for-both-cases reasoning as topic update. |
| `DELETE` | `/api/v1/groups/:id` | bearer | ADMIN only (`groups_delete_admin`). |
| `GET` | `/api/v1/groups/:id/members` | bearer | The roster. WRITE-and-above see everyone; a READ member sees only their own row — enforced by `group_members_select`, not this endpoint. **2026-09-01 (8th pass):** rows now include `email`/`display_name` from a `left join` onto `profiles` (previously `user_id`/`role`/`joined_at` only, which is why `RosterPanel` showed a shortened id). **Fixed (10th pass):** those two columns used to come back `null` for anyone seated via a redeemed invite link — their personal tenant (006) never equals the inviting teacher's, and `profiles_select_self_or_tenant` was tenant-equality-only. `008_profiles_group_visibility.sql` adds a `shares_group_with(id)` clause to that policy, so any groupmate's name/email is now visible regardless of tenant; `review_logs`/SRS visibility is untouched. |
| `PATCH` | `/api/v1/groups/:id/members/:userId` | bearer | Assign a member's role. ADMIN only (`group_members_update_admin`). |
| `DELETE` | `/api/v1/groups/:id/members/:userId` | bearer | Revoke a member's access. ADMIN only (`group_members_delete_admin`). **2026-09-01 (Phase 3 pass):** now blocks removing a group's last ADMIN (`409 Conflict`) — see `GroupsService.removeMember`'s header comment. |
| `POST` | `/api/v1/groups/:id/invites` | bearer | Mints a magic invite link. ADMIN only (`group_invites_insert_admin`). The raw token is generated in Node, returned exactly once, and never persisted — only `public.hash_invite_token`'s SHA-256 of it is. |
| `GET` | `/api/v1/groups/:id/invites` | bearer | Lists **live** invites only (not revoked, not expired, not exhausted). ADMIN only (`group_invites_select_admin`); a non-ADMIN gets `[]`, not `403`. |
| `DELETE` | `/api/v1/invites/:id` | bearer | Soft-revokes an invite (sets `revoked_at`; does not delete the row) — top-level path, not nested under a group, per the spec. ADMIN only (`group_invites_update_admin`). |
| `POST` | `/api/v1/invites/:token/redeem` | bearer | Any authenticated caller. Runs `public.redeem_group_invite`, a `SECURITY DEFINER` function (005_group_invites_redeem.sql) — the joiner isn't a member yet, so RLS can't show them the group. `404` on an unknown token, `410 Gone` on revoked/expired/exhausted. Replaying an already-redeemed token is idempotent (`already_member: true`), not an error, and does not double-count `use_count`. |
| `GET` | `/api/v1/groups/garden-counts` | bearer | **New (UI-G, GR1).** One row per group the caller is in: `member_count`, `bed_count`, `word_count` (via `public.group_garden_counts`, SECURITY DEFINER, members only, counts only, so a READ member gets the real gardener count although RLS shows them only their own roster row) and `my_due_count` (the caller's own `user_word_srs` rows, RLS). Separate from `GET /groups` so the classic list never depends on migration `20260926_group_garden.sql`. **RD-3:** each row also has `rainDay: { wordsPerGardener, gardeners, done, mine, endsAt } \| null`, the running rain day only (from `public.group_rain_day_status`, `is_current`): totals plus the caller's own count, never who (FR-1.2). |
| `GET` | `/api/v1/groups/:id/garden?tz=` | bearer | **New (UI-G, GR2).** Members only (`404` otherwise). Group totals: gardeners, beds, words, `watered_today` (gardeners who reviewed a group word since midnight in `tz`, UTC if missing/unknown), `ripe_plants` (mastered gardener×word pairs), `total_plants` (members × words), via `group_garden_counts` / `group_garden_activity` (SECURITY DEFINER, numbers only). `beds[]` carry the **caller's own** due and stage counts per shared bed (RLS). Never another learner's word-level progress (FR-1.2, plan decision 10). |
| `GET` | `/api/v1/groups/:id/tricky-patches?days=&limit=` | bearer | **New (UI-G, GR3).** ADMIN only (`403`, re-checked in `public.group_tricky_patches`). Words the group missed most in the last `days` (default 7, 1–90), top `limit` (default 5, 1–50): `source_word`, `misses`, `gardeners` (how many distinct gardeners missed it). Totals only, never who. |
| `GET` | `/api/v1/groups/:id/echo` | bearer | **New (Phase 13 SE6, 2026-10-06).** ADMIN only (`403`, re-checked in `public.group_echo_challenge`). `{ echo: { topic_word_id, word, ipa_uk, ipa_us, done_count, member_count } \| null }`: the group's most-missed word of the last 7 days that has a speaking item, how many gardeners spoke it in that time, and the member count. Totals only, never who (D-4). |
| `GET` | `/api/v1/groups/:id/rain-day` | bearer | **New (UI-G RD-2).** Members only (`403`, re-checked in `public.group_rain_day_status`). `{ current, last }`, each `null` if none: `id`, `wordsPerGardener`, `startsAt`, `endsAt` (23:59 of the starting ADMIN's local day), `gardeners` (member count), `done` (gardeners who watered ≥ `wordsPerGardener` distinct words of the group's shared beds in the window), `mine` (the caller's own count). Totals and own count only, never who (FR-1.2). |
| `DELETE` | `/api/v1/groups/:id/rain-day` | bearer | **New (UI-G RD-2).** ADMIN only (`403`). Cancels today's running rain day (`cancel_group_rain_day`), `204`; `404` if none is running. Frees the day for a new one. |
| `GET` | `/api/v1/invites/:token/preview` | bearer | **New (UI-G, GR6).** Any signed-in caller holding the token, before redeeming: group name + description, the inviter's display name (never the email), the role it grants, gardener/bed/word counts and `already_member`. Read-only (`public.group_invite_preview`, SECURITY DEFINER); no member data. `404` unknown token, `410` revoked / expired / used up, same as redeem. |
| `GET` | `/api/v1/topics/:id/cards/due` | bearer | FR-3.4, tech spec §3.4's exact route. Due `user_word_srs` rows for this topic plus never-reviewed `READY` words ("new cards"). Lives on `TopicsController`, delegates to `SrsService.findDue` — see note (5). |
| `GET` | `/api/v1/srs/due` | bearer | Same as above, not scoped to a topic (FR-3.4). |
| `GET` | `/api/v1/srs/leeches` | bearer | FR-3.3 — words with `is_leech = true` (≥ 4 failures in the trailing 7 days). Reads the stored flag, not a live aggregate. |
| `GET` | `/api/v1/srs/stats` | bearer | FR-8.1 — total/mastered/due/leech counts plus a consecutive-day streak computed from `review_logs`. UI-4 U4-2: `stage_counts: { new, learning, review, mastered }` (new = READY words with no `user_word_srs` row + `fsrs_state='New'` rows; learning = Learning+Relearning; review = Review with `mastered_at` null; mastered = `mastered_at` set; leeches stay in their stage). UI-6 U6-3: `freezes: { available, used_this_week, refills_on }` (2 a week, lazily refilled to 2 on the learner's local Monday; missed days since the last studied/frozen day are frozen automatically when the freezes left cover the whole gap — writes `streak_freeze_uses` + `profiles.streak_freezes_available`; a frozen day keeps the streak but doesn't add to it) and `best_streak_days`. |
| `POST` | `/api/v1/srs/rate` | bearer | FR-3.2 — submit `AGAIN`/`HARD`/`GOOD`/`EASY`. **Phase 10:** scheduled by FSRS-6 (`fsrs-scheduler.ts`), graded per `grading.ts`. One transaction covering the state read, the `review_logs` insert (always) and the `user_word_srs` upsert (only when `graded`). Response: `rating` (as applied), `graded`, `state`, `stability`, `difficulty`, `reps`, `lapses`, `scheduled_days`, `is_leech`, `is_mastered`, `was_correct`, `next_due_at`, `just_mastered`. `ease_factor`/`interval_days`/`repetitions` are gone. | **UI-6 U6-2:** a graded review also bumps today's daily mission in the same transaction — `LEARN_NEW` when the card was new, else `REVIEW_DUE` (also via `/srs/sync`).
| `POST` | `/api/v1/srs/sessions` | bearer | FR-4.3 — Standard/Reverse/Listening mode. Returns a due-card batch tagged with the mode; does not persist a session row (none exists in the schema). |
| `POST` | `/api/v1/srs/sync` | bearer | Architecture §1 — replays offline-queued reviews in chronological order via the same rating logic as `/srs/rate`; a bad item in the batch is reported per-item, not a batch failure. **Has a real frontend caller as of the 11th pass** — `useOfflineReviewSync` (`lib/offline-review-queue.ts`'s IndexedDB queue, drained on the browser's `online` event) — this route existed and was unit-tested since Phase 2 but nothing on the frontend called it until now. |
| `POST` | `/api/v1/quizzes/generate` | bearer | FR-5.1–5.4 — Cloze, Dictation, Matching, Contextual Choice, drawn from `READY` words the caller can read. Stateless: an item's id (`` `${topicWordId}:${type}` ``) encodes enough to grade it later without a persisted row — see note (6). |
| `GET` | `/api/v1/quizzes/leech-drill` | bearer | FR-3.3's remedial queue, built on `SrsService.findLeeches`. Prefers the richest question type each leech word's data supports. |
| `POST` | `/api/v1/quizzes/:id/answer` | bearer | **Phase 10:** also records the answer against the word's SRS schedule (`SrsService.recordQuizResult`) and returns `srs: { graded, justMastered, nextDueAt }` (omitted only if that recording failed; never fatal). FR-5.5 — grades against the item id, and only on a wrong answer asks Gemini (`GeminiEnrichmentService.explainNuance`) for a short nuance explanation. Degrades to a generic message if that call fails. **UI-5 (2026-09-27):** optional body `locale` (`en-US` / `vi-VN` / `zh-CN`, old `en` / `vi` / `zh` accepted; `en-SG` removed 2026-09-29): the explanation is written in Vietnamese or Simplified Chinese, English words kept in quotes; English or omitted = English (the classic app sends none). The explanation is always plain text (Markdown stripped server-side, `stripMarkdown`). | **UI-6 U6-2 (2026-10-01):** optional body `final: true` on the last answer of a quiz counts one finished quiz toward the QUIZ daily mission (same transaction as the SRS write).
| `GET` | `/api/v1/notifications/vapid-public-key` | bearer | FR-6.5 — the value the frontend passes as `applicationServerKey` to `pushManager.subscribe()`. Not a secret; kept behind auth anyway since only a signed-in student needs it. |
| `POST` | `/api/v1/notifications/subscribe` | bearer | FR-6.5 — registers a browser's `PushSubscriptionJSON` verbatim. `on conflict (endpoint)` — one browser is one row regardless of which account last registered it. |
| `DELETE` | `/api/v1/notifications/subscribe` | bearer | Unregisters one browser's subscription by endpoint. |
| `GET` | `/api/v1/notifications/schedules` | bearer | FR-6.1 — the caller's own daily reminder times. |
| `POST` | `/api/v1/notifications/schedules` | bearer | FR-6.1 — upsert on `(user_id, reminder_time)`, not create-only; see note (7). |
| `DELETE` | `/api/v1/notifications/schedules/:id` | bearer | Removes a reminder schedule. |
| `POST` | `/api/v1/notifications/groups/:groupId/sprint` | bearer | FR-6.2 — ADMIN-only, immediate (not tick-scheduled) push to every other group member's registered devices. `403` via an explicit `has_group_role` check — see note (7) for why this one doesn't lean on RLS like most writes here. **`429` after one call per group per 60s** (11th pass, `SprintRateLimitGuard`) — was unrated since the 5th pass, flagged as a known gap through the 10th. **UI-G RD-2:** optional `wordsPerGardener` (5/10/20, default 10); every sprint first stores today's rain day (`start_group_rain_day`) and the response adds `rainDay: { id, endsAt, wordsPerGardener }`. A second one the same local day (admin's time zone) is `409` "A rain day is already running today" and no push is sent. Backwards compatible for the classic trigger. |
| `GET` | `/api/v1/groups/:id/heatmap` | bearer | FR-8.2 — class-wide mistake heatmap. **Missing from this table since Module 8 shipped (8th–18th passes); added by the 19th pass, which found the gap while adding the row below.** ADMIN only (not WRITE, despite §4's original guess) via an explicit `has_group_role` check, re-checked inside `public.group_word_heatmap()` (007) itself. Registered on `AnalyticsController` under the `groups` path, not its own `analytics` prefix — see that controller's header comment. |
| `GET` | `/api/v1/analytics/tenant/heatmap` | bearer | **New (19th pass).** FR-8.2 "across cohorts" — the tenant-wide widening of the row above, spanning every group in the caller's own tenant rather than one. Tenant admin only (`is_tenant_admin()`, the same role 009's RLS expansion made consistent), re-checked inside `public.tenant_word_heatmap()` (010) itself. Takes no `tenantId` param — always the caller's own, resolved server-side via `current_user_tenant_id()`. Narrower than §4's original `/analytics/tenant` guess (that row envisioned a broader institution-wide retention-report persona table, FR-8.1-shaped, and the retention curve itself is still unbuilt). Path chosen as `/analytics/tenant/heatmap`, not the bare guessed `/analytics/tenant`, so the two don't collide if that broader endpoint is ever built later — see note (8) and the nineteenth-pass entry in `dygo_academy_session_report_2026-09-01.md`. |
| `PATCH` | `/api/v1/profiles/me` | bearer | **New (Phase 12 UI-L, 2026-09-26).** The caller's language settings: `uiLocale` (garden app locale: `en-US`, `vi-VN`, `zh-CN`) and `meaningLocale` (the review card's extra meaning line: `vi-VN`, `zh-CN`); full locale codes since 2026-09-26 (`20260926_profile_locales_codes.sql` converts stored `en` / `vi`). Omit a field to keep it, send `null` to clear it; an empty body is `400`, any other code is `400` (validation). Own row only — an RLS-scoped `UPDATE` (`profiles_update_self`), `404` if no row comes back. Returns `{ id, ui_locale, meaning_locale }`. Columns and check constraints: `database/migrations/20260926_profile_locales.sql`. Nothing wrote `profiles.timezone` through the API before this either; timezone stays out of this endpoint until the Phase 11 WS1 setting exists. **UI-6 U6-4 (2026-10-01):** also accepts `englishVariety` (`en-US` \| `en-GB`) and `dailyGoalMinutes` (integer 1–120); both not nullable (`null` is `400`). Returns `{ id, ui_locale, meaning_locale, english_variety, daily_goal_minutes }`. |
| `GET` | `/api/v1/profiles/me` | bearer | **New (UI-6 U6-4, 2026-10-01).** The caller's settings: `{ id, ui_locale, meaning_locale, english_variety, daily_goal_minutes }`. RLS-scoped read, `404` if no row. |
| `GET` | `/api/v1/me/keepsakes` | bearer | **New (UI-6 U6-4).** Awards keepsakes lazily (`?tz=` fallback as `/srs/stats`): `FIRST_HARVEST` (value 0, 1 mastered word), `STREAK` 7/30/100 (`best_streak_days`), `GOLDEN_BLOOMS` 10/50 (local days with all 3 missions done); inserts with `on conflict do nothing` so `earned_at` keeps the first time. Returns `{ earned: [{ kind, value, earned_at }], next: [{ kind, value, progress, target }] (one per kind not finished), golden_blooms }`. |
| `GET` | `/api/v1/missions/today` | bearer | **New (UI-6 U6-2, 2026-10-01).** Today's 3 daily missions in the learner's local day (`?tz=` fallback as `/srs/stats`), created on the first read: `{ date, missions: [{ type: REVIEW_DUE\|LEARN_NEW\|QUIZ\|SPEAK, target, progress, done }], goldenBloom }`. Targets: REVIEW_DUE = due words at the first read (min 1; 0 due → already done), LEARN_NEW 5, QUIZ 1. **Phase 13 SE1 (2026-10-06):** on odd days (days since 1970-01-01 of the local date) the 3rd mission is SPEAK (target 3: different sentences spoken that day, counted by `POST /speaking/attempts`) instead of QUIZ, when the learner has 3+ words with a speaking item. `goldenBloom` = all 3 done. |
| `GET` | `/api/v1/missions/week` | bearer | **New (UI-6 U6-2).** Trailing 7 local days, oldest first: `[{ date, done (0–3), goldenBloom }]`. Read-only (creates no rows). |
| `GET` | `/api/v1/speaking/session` | bearer | **New (Phase 13, 2026-10-04).** The Pond (`/sounds`; its Missions-tab card was removed 2026-10-06 for a redesign): `{ item_count, default_accent: UK\|US, items }`. Up to 5 of the learner's words that have a speaking item (same scope as Review's new cards: every READY word they can read; a word in several beds counts once): due first, then new (no SRS row or `New`), then by next due date. Each item `{ id, lexicon_id, topic_word_id, word, part_of_speech, cefr_level, ipa_uk, ipa_us, definition_en, meaning_locale, meaning_translation, sentence, target_index, audio_uk_url, audio_us_url, timings_uk, timings_us, is_due }` (URLs built from the stored R2 keys; an accent not generated yet is null). `item_count` = how many of their words have an item. Optional `?topic_id=` narrows to one bed (404 if not a UUID). `default_accent` from `profiles.english_variety`. |
| `GET` | `/api/v1/speaking/words?topic_word_ids=a,b,…[&tz=]` | bearer | **New (Phase 13 S11). Not called by the app since 2026-10-06** (the "Say this one?" offer was removed for a speaking entry-point redesign). "Say this one?" offers (rule T9-a): for up to 50 `topic_words` ids (a review session's cards), `[{ topic_word_id, item_id, spoken_today }]`, one row per id whose word has a speaking item. `spoken_today` = the caller has a `speaking_attempts` row for that item since local midnight (profile timezone, else `tz`, like `/missions/today`). Ids without an item, unreadable (RLS) or malformed are left out. |
| `GET` | `/api/v1/speaking/words/:topicWordId` | bearer | **New (Phase 13).** Since 2026-10-06 used by the one-word speaking flow from "Ready to harvest" (SE5) and the Echo challenge (SE6). "Say this one?" on a flashcard: `{ default_accent, item }` for the card's word (`topic_word_id` as on `DueCard`). 404 when the caller can't read the word (RLS) or it has no speaking item yet. |
| `POST` | `/api/v1/speaking/attempts` | bearer | **New (Phase 13 T2).** Body `{ item_id, accent: UK\|US, score 0–100, stage: seed\|sprout\|bloom\|fruit, word_marks: [{ index, ok, reason: stress_soft\|missing\|rushed\|slow\|unclear\|null }], user_duration_ms }` (`unclear` from the server check, S18; `heard` is never accepted or stored). Inserts one `speaking_attempts` row as the caller (`user_id` = `auth.uid()`, never from the body) and returns it with `id`, `created_at`. No audio is accepted or stored (D2). 404 for an unknown `item_id`. **2026-10-06:** optional `harvest: true` (SE5) saves the word in `speaking_harvests` when `score` ≥ 90 (once per word; never changes SRS, D-3), and the response gains `harvested: boolean`; optional `tz` (device time zone). The caller's first attempt at an item in their local day bumps the SPEAK mission (SE1; a no-op on QUIZ days). |
| `GET` | `/api/v1/speaking/harvest?topic_id=` | bearer | **New (Phase 13 SE5, 2026-10-06).** "Ready to harvest" on a bed: `[{ topic_word_id, item_id, harvested_score, harvested_at }]` for the bed's READY words that have a speaking item; `harvested_*` null until the caller harvested the word. The app keeps the ripe (Flower) ones by the bed's own stages. 404 for a malformed `topic_id`. |
| `POST` | `/api/v1/speaking/check` | bearer | **Phase 13; queued since 2026-10-06.** Multipart `audio` (as recorded: `audio/mp4`, `audio/webm`, `audio/wav`; ≤ 1 MB), `item_id`, `accent: UK\|US`. Answers at once **202** `{ check_id, status: 'queued', position, eta_s }`; the recording waits in the API's memory (never Redis, disk, the database or logs) for the `speech-check-queue` worker, which sends it to a free self-hosted scorer (`SPEECH_SCORER_URLS`). Poll the GET below. 400 no audio, 404 unknown `item_id`, 413 over 1 MB, 422 not m4a / webm / wav, 429 over 60 checks an hour, **503 busy** (the wait would pass `SPEECH_BUSY_ETA_SECONDS`, 15 s): the app shows its own quick result. |
| `GET` | `/api/v1/speaking/check/:checkId` | bearer | **New (2026-10-06).** `{ check_id, status: queued\|checking\|done\|failed, result?, reason? }`; `result` = `{ score 0–100, stage, word_marks: [{ index, ok, reason: missing\|unclear\|null, heard? }], user_duration_ms, check_ms }` (one mark per word of the sentence; `heard` = the word heard instead; stress isn't judged here). `reason` when failed: `bad_audio`, `timeout`, `unavailable`, `expired`. Only the sender can read it (404 otherwise, for unknown ids, and after 10 min). Nothing is saved: save with `POST /speaking/attempts`. |
| `POST` | `/api/v1/telemetry/media` | bearer | **New (option 2, 2026-10-04).** Audio start times from the app: `{ events: [{ kind: word\|speaking, host, outcome: played\|error, ms (0–120000), from_cache, effective_type? }] }`, 1–50 per batch. Inserted as the caller into `media_load_events` with Cloudflare `CF-IPCountry` / `CF-IPCity` (no IP, no file path). Returns `{ recorded }`. |

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

**13 operations · inferred, needs review**

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
| `GET` | `/words/:id` | READ | Phase 1 frontend polls this for `ENRICHING → READY` — **note:** the frontend actually polls `GET /topics/:id` instead (`useTopic.ts`), not a standalone per-word route; this row may be genuinely unneeded rather than merely unbuilt |
| `PATCH` | `/words/:id` | WRITE | FR-1.2 — edit custom notes |
| `DELETE` | `/words/:id` | WRITE | Module 1 permission matrix |
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

**Two of three rows below are live, under different shapes than guessed
here — see §2 and note (8):** row 1 shipped as `GET /srs/stats` (note 5),
not `/analytics/me`; row 2 shipped as `GET /groups/:id/heatmap`, ADMIN not
WRITE (`AnalyticsController`'s header comment explains the path choice).
Row 3, the broad institution-wide retention-report persona table, is
**still not built** — what the 19th pass shipped instead is a narrower
sibling, `GET /analytics/tenant/heatmap` (FR-8.2's tenant-wide widening of
row 2, not row 3's FR-8.1-shaped retention reports), listed separately in
§2 rather than replacing this row, since the two are different scope.

| Method | Path | Min role | Requirement |
| :--- | :--- | :--- | :--- |
| `GET` | `/analytics/me` | self | FR-8.1 — streaks, retention curve, leech list |
| `GET` | `/analytics/groups/:id/heatmap` | WRITE | FR-8.2 — cohort error rates. **Must return aggregates only**: RLS keeps `review_logs` owner-only, and this endpoint must not become the way around that |
| `GET` | `/analytics/tenant` | ADMIN | Persona table — institution-wide retention reports. **Still open** — see note above; the retention curve itself has no query anywhere yet |

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
> Detail and reasoning: leech bookkeeping (`LEECH_THRESHOLD`,
> `LEECH_WINDOW_DAYS`) lives in `src/modules/srs/fsrs-scheduler.ts`; the
> `recent_mistakes`/`total_mistakes` upsert is in `srs.service.ts`
> (**Phase 10** — `srs-algorithm.ts` was deleted, see `Change Log.md`).

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
