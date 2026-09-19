# 📅 Dygo Academy: Master Project Schedule & Phasing Strategy
**Document Version**: 5.19 (Phase 7 — Learning Path & Engagement — 5/7 modules code-complete; close-out found production sign-in is broken)  
**Author**: Principal Cloud & SaaS Solutions Advisory  
**Status**: Approved for Engineering & Product Execution — **production incident open, see Phase 7**  

**Changelog**
* **5.19** (2026-09-20) — Added §2's new Phase 7 (Learning Path &
  Engagement), building the parts of the "Dygo Learning Path" concept
  Phase 6 explicitly scoped out of its own remediation work. 5 of 7
  modules code-complete across 4 sessions (a 5th, close-out, found the
  real headline of this entry): a personalized arrival headline,
  per-topic mastery rings, a 5-day Home activity trail, a reward-framed
  study-session summary, and severity-scaled coloring on the personal
  leech-word list — the last one corrected mid-implementation after
  discovering `phase 3.md`'s original scoping was wrong (it claimed no
  personal focus view existed; one has since Module 8). The remaining 2
  modules and one FR stay unbuilt on purpose, gated on open product
  questions named in `phase 3.md` §7, same discipline Phase 6 used for
  its own out-of-scope items.
  
  Session 5's close-out did what Phase 6's close-out did — verify against
  the live app instead of stopping at code review — and this time found
  something worse than a deploy lag: **production sign-in is completely
  broken**. The live bundle's `NEXT_PUBLIC_SUPABASE_URL` points at
  `http://localhost:8000` instead of `env-profiles/prod.env`'s
  `https://supabase.dygoacademy.com` — a dev value baked in at build time
  by whatever produced the currently-live bundle, which didn't go through
  the documented `npm run build:prod:domain` path (or that path's
  env-sourcing silently failed). Every authenticated screen is unreachable
  for every real user right now. This also retires Phase 6's own "9 FRs
  pending deploy" status as checkable — a deploy clearly happened since
  (Phase 7's own new copy is live), it just shipped this regression
  instead of resolving that backlog. See `phase 3.md` §9 for the full
  finding, including the exact failed request and every env file checked.
* **5.18** (2026-09-19) — Added §2's new Phase 6 (UX & Trust Remediation),
  a post-launch pass this document's own Phase 0–5 never scoped, run
  across 9 sessions against 20 findings from a live-app UX audit. Full
  detail lives in `phase 2.md`/`phase 2 implementation plan.md`/
  `Claude outputs/phase 2 session schedule.md` rather than duplicated
  here — this entry is the pointer those documents' own close-out
  (`phase 2.md`'s changelog, v1.3) asked to be filed under "Phase 6" to
  avoid colliding with this file's own pre-existing Phase 2 (SRS/
  Flashcards, §2 above, unrelated). Headline finding, the reason this
  entry exists at all: Session 9's close-out did what this document has
  flagged as a standing gap since the very first pass and never actually
  done for *any* earlier phase — verified every item against the live
  app, not just code review — and caught a real deploy lag as a result.
  11 of 20 FRs are confirmed live; the other 9 are code-complete and
  test-covered (`tsc --noEmit`/`eslint`/`jest` 165/165 clean) but
  reproducibly still show pre-fix behavior in production, because
  nothing has redeployed since partway through this phase's work. Not a
  code defect — this repo has never had a deploy-on-commit pipeline
  (`.github/workflows` empty since Phase 0, noted every phase since) —
  but a real gap between "done" and "shipped" that only a live check
  caught. See `phase 2.md` §9 for the exact commit boundary and which 9
  FRs are waiting on a deploy.
* **5.17** (2026-09-01) — Nineteenth pass, still the same day, still ahead
  of tomorrow morning's UAT (2026-09-02). Full regression confirmed no
  drift from 5.16 before starting (153/153 backend jest, clean `tsc`/lint
  both sides, frontend `tsc`/`next lint` clean, both sides' `TODO`/`FIXME`
  grep empty — the thirteenth straight pass, 7th–19th, reaching that
  conclusion; `BillingController`/`BillingService` still a zero-route
  scaffold). Took the first of the 18th pass's own three "Try next"
  options — build `AnalyticsService.getHeatmap`'s tenant-wide widening,
  named as unblocked at the RLS layer since 009 — rather than either
  Module 7's Stripe integration (still deferred, same "not hours before
  UAT" reasoning as every pass since the 7th) or waiting on UAT feedback
  that doesn't exist yet (UAT is still tomorrow morning, not run yet).
  This is the first *new backend* work since the 17th pass's RLS fix —
  the 12 passes in between (7th–18th) all correctly concluded there was
  no new well-scoped gap to build, and this pass agrees that conclusion
  held right up until 009 unblocked this specific, previously-named item.

  Shipped `public.tenant_word_heatmap(p_tenant_id)`
  (`database/migrations/010_tenant_word_heatmap.sql`) — same shape as
  007's `group_word_heatmap()` (SECURITY DEFINER, re-checks its own gate,
  returns aggregates only, never a `user_id`), scoped by `g.tenant_id`
  instead of a single `group_id`, gated by `is_tenant_admin()` (009's
  already-existing tenant-wide role) instead of `has_group_role`. Two
  columns wider than 007's shape — `group_id`/`group_name` — since a
  rollup spanning multiple classes needs to say which class each mistake
  row happened in; `topic_title` alone isn't a safe attribution key since
  two teachers can legally reuse the same title in different groups.
  `AnalyticsService.tenantHeatmap` derives the tenant from the caller
  (`current_user_tenant_id()`) rather than accepting one as a request
  param — the only tenant a director rollup can mean is the caller's own,
  and there is no capability gained by accepting an id, since a caller
  who isn't `is_tenant_admin()` of it is rejected either way. New route:
  `GET /api/v1/analytics/tenant/heatmap`, on a new `TenantAnalyticsController`
  (kept separate from the group-scoped `AnalyticsController`, which is
  registered under the `groups` path and takes an `:id`). Extended
  `heatmap-aggregator.ts`'s `rankHeatmap` to a generic
  (`<T extends WordAttemptCounts>`) rather than duplicating the
  worst-first/attempts-tiebreak ranking logic for the wider shape.

  While wiring this up, found and fixed a real, unrelated doc gap in
  `dygo_academy_api_surface.md`: `GET /api/v1/groups/:id/heatmap` — live
  since Module 8 shipped in the 8th pass — had never been added to that
  file's §2 "Live today" table at all, eleven passes' worth of drift. The
  file's own header count (37, then incorrectly "36" in the section body)
  was stale evidence of the same miss. Both heatmap routes are now listed;
  live count corrected to 39.

  6 new backend unit tests (159 total, up from 153), `tsc --noEmit` and
  lint clean on both sides (frontend untouched — no UI calls the new
  route yet; wireframe turns 12–14 already sketch what one would look
  like). 9 new RLS assertions in `database/tests/rls_test.sql` §K (63
  total, up from 54) — proves the aggregate genuinely spans multiple
  groups in one tenant (inserts a second Oxford class mid-transaction,
  checks the totals actually move) rather than just re-serving one
  group's numbers under a new name, and proves a genuine tenant admin of
  a *different* tenant (Dana, Rival Academy) cannot use this function to
  read Oxford's rollup even by calling it directly with Oxford's tenant
  id — `is_tenant_admin()` checks the specific argument, not "is this
  caller a tenant admin of anything." New `describe` block in
  `com.dygoacademy.automationtesting`'s `analytics.spec.ts` covering the
  live route. None of this has run against a real Postgres in this
  Docker-less sandbox — same standing limitation as every migration since
  the first pass — so §K passing for real is itself a new UAT item
  (`dygo_academy_uat_checklist_2026-09-02.md` item 25).

  Did not touch the wireframes this pass (turns 12–14 already sketch this
  screen; the standing note from the 18th pass was explicit that another
  wireframe-only extension with no new backend behind it would start
  producing screens nobody asked for — this pass is the backend those
  turns were already assuming). Did not start Module 7's Stripe
  integration or the `subscription_status` migration — unchanged
  reasoning, now the thirteenth straight pass making that call. Did not
  wire a frontend "Director rollup" screen to the new route — flagged as
  an open UAT question (item 23) rather than guessed at, since nothing in
  the BRD specifies whether that's in scope for this release or deferred
  like Module 7. See the nineteenth pass entry in
  `dygo_academy_session_report_2026-09-01.md`.
* **5.16** (2026-09-01) — Eighteenth pass, still the same day, still ahead
  of tomorrow morning's UAT (2026-09-02). Full regression confirmed no
  drift from 5.15 (153/153 backend jest, clean `tsc`/lint both sides,
  frontend `tsc`/`next lint` clean, backend/frontend `TODO`/`FIXME` grep
  both empty, `BillingController`/`BillingService` still a zero-route
  scaffold) — the twelfth straight pass (7th–18th) reaching that same
  conclusion. Took the smallest of turn 13's three "Try next" options
  rather than either real-backend-scope one (the tenant-wide heatmap
  query, or Module 7's Stripe integration) — both still correctly
  deferred past UAT feedback, same standing reasoning as every pass
  since the 7th. Added **turn 14** (screens 14a–14b) to
  `Dygo Academy Wireframes.html`: what turn 12's export modal (12c) and
  the resulting emailed report look like when the selected range
  includes a class like 13a/13b's Saturday Beginners — &lt;7 days old,
  no retention number yet, but real mistake-heatmap data already (the
  underlying `group_word_heatmap()` query has no minimum-history gate;
  only the still-unbuilt retention curve waits on 7 days). 14a shows the
  pre-export warning; 14b shows that same "partial" signal surviving
  into the actual report row a director keeps, not just a modal warning
  they might not remember reading. Edited via the same Python
  decode/splice/re-encode procedure as turns 10–13, old length asserted
  (124,775) before writing, validated after (new length 130,466, tags
  balanced, 80 total `id=` anchors with no collisions, up from 77).
  Still unrenderable in this sandbox — five turns (10–14) now unverified
  in a real browser instead of four. Also caught and fixed a stale "47
  RLS assertions" line in `dygo_academy_uat_checklist_2026-09-02.md`'s
  own summary section — the 17th pass's `009` migration raised the real
  count to 54 but that number never propagated past that pass's own
  checklist item 24. See the eighteenth pass entry in
  `dygo_academy_session_report_2026-09-01.md`.
* **5.15** (2026-09-01) — Seventeenth pass, still the same day, still ahead
  of tomorrow morning's UAT (2026-09-02). Full regression confirmed no
  drift from 5.14 (153/153 backend jest, clean `tsc`/lint both sides,
  frontend `tsc`/`next lint` clean, backend `TODO`/`FIXME` grep still
  empty — the eleventh straight pass, 7th–17th, reaching that
  conclusion; `BillingController`/`BillingService` still a zero-route
  scaffold). While scoping turn 12's own "Try next" line (sketch the
  `tenants.director_id`-shaped migration it called out), found that the
  premise was only half right: `is_tenant_admin(tenant_id)`
  (`002_rls_policies.sql`) already exists and already grants a
  tenant-wide read — it's what `groups_select` and
  `tenant_seats_select` already use to let a user who is `ADMIN` of
  even one group in a tenant see every group and every seat in that
  tenant. The real, narrower gap: `can_read_group()` (and therefore
  `topics_select`/`topic_words_select`, which call it via
  `can_read_topic()`) and `group_members_select` never carried the same
  grant, so a tenant admin could see that a sibling class existed but
  not read its topics, words, or roster — exactly what the director
  rollup screens need. Closed with
  `database/migrations/009_tenant_admin_read_expansion.sql` — two
  `CREATE OR REPLACE FUNCTION`s and one policy swap, additive only, no
  new column or migration risk this close to UAT. Deliberately left
  `user_word_srs_all_own` untouched: FR-1.2's "no teacher exception for
  a student's own SRS state" holds for tenant admins too. Added three
  new RLS assertions (section J, `rls_test.sql`, now 54 total, up from
  47) proving the fix and proving it doesn't cross the tenant boundary,
  using a group inserted inside the test's own transaction rather than
  touching `004_seed_data.sql` (avoids perturbing any of that file's
  existing exact-count assertions elsewhere in the suite). Updated
  `database/apply-migrations.sh` to run 009 and
  `dygo_academy_database_dictionary.md`'s RLS policy/function tables to
  match. None of this has run against a real Postgres in this
  Docker-less sandbox — same standing limitation as every migration
  since the first pass — so section J passing for real is itself an
  open UAT item, added as item 24 in
  `dygo_academy_uat_checklist_2026-09-02.md`.

  Also continued the wireframe work: added **turn 13** (screens 13a–13b)
  to `Dygo Academy Wireframes.html`, picking up the other half of turn
  12's "Try next" line — what the rollup looks like for a class under 7
  days old, before there's a full week of data for a retention curve.
  13a shows the single-class view with an explicit "not enough history
  yet" empty state instead of a misleading flat/zeroed chart (the
  mistake heatmap itself has no such gate — `group_word_heatmap()` has
  no minimum-history check, only the retention curve does); 13b shows
  the same class as one row in the academy-wide overview with a "NEW"
  chip in place of a mastery bar with nothing real to fill it. The
  turn's own opening note documents the `is_tenant_admin()` correction
  above rather than silently reusing turn 12's now-outdated framing.
  Edited via the same Python decode/splice/re-encode procedure as turns
  10–13; this pass's splice was correct on the first attempt (located by
  the `"<!DOCTYPE html>` prefix, old-length asserted against the known
  117,335 before writing). Validated: the new blob re-parses as JSON,
  every tag used in the document balances open/close counts across the
  full 124,775-character decoded document, and none of the 77 total
  `id=` anchors collide (up from 74). This sandbox still cannot render
  it in a real browser — now four unrenderable turns (10–13) instead of
  three; `dygo_academy_uat_checklist_2026-09-02.md` item 23 updated
  accordingly. `next build` not re-attempted — 14-for-14 hang standing,
  not re-tried a 15th time, same token-budget judgment call as passes
  12–16. See the seventeenth pass entry in
  `dygo_academy_session_report_2026-09-01.md`.
* **5.14** (2026-09-01) — Sixteenth pass, still the same day, still
  ahead of tomorrow morning's UAT. Full regression confirmed no drift
  from 5.13 (153/153 backend jest, clean `tsc`/lint both sides). Two
  pieces of work, not one: first, found and finished a full **live-stack
  integration test package**, `com.dygoacademy.automationtesting/`
  (Jest + supertest + ts-jest, one spec per built module — groups/RBAC,
  topics, word enrichment, SRS, quizzes, analytics/heatmap,
  notifications), that existed on disk fully written but **uncommitted
  and undocumented** at the start of this pass — almost certainly
  work-in-progress from the 15th pass that ran out of token budget
  before it could commit or write up what it had built. This pass
  verified it rather than assuming it was correct: cross-checked every
  fixture id in `api/support/fixtures.ts` against
  `database/migrations/004_seed_data.sql` (exact match) and every route
  path used in the seven spec files against the real controllers
  (`groups.controller.ts`, `topics.controller.ts`, `words.controller.ts`,
  `srs.controller.ts`, `modules/quiz/quiz.controller.ts`,
  `analytics.controller.ts`, `notifications.controller.ts` — all match,
  nothing hallucinated), then typechecked it (`npx tsc --noEmit`), which
  caught and this pass fixed one real bug: `notifications.spec.ts` read
  `r.reminder_time` off a response typed as `{ id: string }` only. Added
  a new "Run the live-stack integration tests" section to `README.md`
  (with the Layout tree updated to match) since nothing previously
  documented this package existed or how to run it — it cannot run in
  this Docker-less sandbox, so this is its first-ever real execution
  target, whoever runs UAT tomorrow. Second, continued the same
  design-only wireframe work as the 14th/15th passes: added **turn 12**
  to `Dygo Academy Wireframes.html`, picking up turn 11's own "Try next"
  suggestion — the Academy-tier director rollup and cohort ROI export
  (BRD Journey 3 step 5, FR-8.2 widened tenant-wide) — over the other two
  options (the real Module 7 backend, still correctly deferred to
  post-UAT; the `subscription_status` migration, blocked on the same
  thing). Two new findings surfaced honestly in the turn's own opening
  note rather than assumed away: `AnalyticsService.getHeatmap` only
  supports one `groupId` today, so a tenant-wide rollup is new backend
  scope, not existing code with a new screen; and there is no
  tenant-level "director" role anywhere in the schema
  (`group_role` is ADMIN/WRITE/READ, scoped per group, and `tenants` has
  no owner column) — turn 12's 12a screen stands in for that with an
  ADMIN-of-every-group coincidence, which is a real open product
  question, not just an unrendered-screen risk. Edited via the same
  bundled-file Python decode/splice/re-encode procedure as turns 10-11;
  this pass's first splice attempt located the wrong line (matched the
  binary-asset manifest blob instead of the template blob) and
  overwrote it — caught immediately by asserting the decoded length
  before writing, restored the file from `git show HEAD:...` (the
  original `rm`/`mv`-can't-unlink sandbox quirk meant `git checkout --`
  itself failed; writing the git-blob bytes back over the file in place
  with Python worked), then redid the splice correctly with an assertion
  guard. Validated afterward the same three ways as turns 10-11: the new
  blob re-parses as JSON, all HTML tags balance across the full
  117,335-char decoded document, and none of the 74 total `id=` anchors
  collide. Updated `dygo_academy_uat_checklist_2026-09-02.md` with a new
  section K covering the integration-test package and folded turn 12
  into item 23 alongside turns 10-11. `next build` not re-attempted —
  14-for-14 hang standing, unchanged. See the sixteenth pass entry in
  `dygo_academy_session_report_2026-09-01.md`.
* **5.13** (2026-09-01) — Fifteenth pass, still the same day, still
  ahead of tomorrow morning's UAT (2026-09-02). Full regression confirmed
  no drift from 5.12 (153/153 backend jest, clean `tsc`/lint both sides,
  frontend `tsc`/`next lint` clean). Backend-wide `TODO`/`FIXME` grep
  again came back empty and `BillingController`/`BillingService` are
  confirmed still a zero-route scaffold — the ninth straight pass (7th
  through 15th) reaching that same conclusion, so Module 7's backend
  remains correctly untouched rather than started hours before UAT
  feedback that might redirect it. Acted on the same explicit UI/UX
  instruction as the 14th pass and on turn 10's own "Try next" line:
  added **turn 11** to `Dygo Academy Wireframes.html`, wireframing FR-7.3
  (card decline / dunning) — the ADMIN's payment-failed banner and grace
  window, the past-due billing panel, a mockup of the email Stripe itself
  sends (never Dygo), and the suspended state once the grace window
  lapses, including the one-sentence description of what a sponsored
  student sees (nothing billing-related, per FR-7.2). Design only, zero
  payment code, same non-conflicting relationship to the deferred backend
  as turn 10. One genuinely new finding surfaced while writing this
  turn's captions, not just a restatement of turn 10: `tenants` has no
  `subscription_status`-shaped column today per
  `dygo_academy_database_dictionary.md` — only `purchased_seats`/
  `active_seats_used`/`price_per_seat_cents` — so screens 11a/11b/11d
  imply a migration that doesn't exist yet; flagged in the turn's own
  opening note and folded into its "Try next" line rather than silently
  assumed. Edited via the same bundled-file `JSON.parse`d template string
  procedure as the 14th pass (Python decode/splice/re-encode); validated:
  the new blob re-parses as JSON, all HTML tags balance across the full
  108,627-char decoded document, and none of the 70 total `id=` anchors
  collide. This sandbox still cannot render it in a real browser to
  confirm visually — same standing limitation, now covering two unverified
  turns (10 and 11) instead of one; the UAT checklist's item 23 was
  updated accordingly. `next build` not re-attempted — 14-for-14 hang
  standing, unchanged. See the fifteenth pass entry in
  `dygo_academy_session_report_2026-09-01.md`.
* **5.12** (2026-09-01) — Fourteenth pass, still the day of tomorrow
  morning's UAT. Full regression confirmed no drift from 5.11 (153/153
  backend jest, clean `tsc`/lint both sides). Backend-wide `TODO`/`FIXME`
  grep again came back empty and `BillingController`/`BillingService` are
  confirmed still a zero-route scaffold — no new backend gap this pass
  either, same honest conclusion as the 13th. Acted on this pass's
  explicit UI/UX instruction and the wireframe file's own twice-repeated
  "Try next" suggestion: added **turn 10** to `Dygo Academy
  Wireframes.html`, wireframing the Module 7 seat-billing paywall's
  teacher/ADMIN side (FR-7.1's four-tier picker, the Stripe Checkout
  handoff, the ADMIN billing panel, and confirming a sponsored student
  sees no billing UI at all) — design only, zero payment code, so it
  doesn't conflict with the 7th–13th passes' correct decision to keep
  `BillingController` untouched this close to UAT. Edited via the
  bundled file's `JSON.parse`d template string (Python `json` module
  decode/splice/re-encode, not manual text surgery), then validated: the
  new blob re-parses as JSON, all HTML tags balance across the document,
  and no `id=` collides with the existing 61 anchors — this sandbox still
  cannot render it in a real browser to confirm visually. `next build`
  not re-attempted — 13-for-13 hang standing, unchanged. See the
  fourteenth pass entry in `dygo_academy_session_report_2026-09-01.md`.
* **5.11** (2026-09-01) — Thirteenth pass, the day of tomorrow morning's
  UAT. Full regression run first (153/153 backend jest, clean `tsc`/lint
  both sides) confirmed no drift from 5.10. Searched for a new small
  well-scoped gap in the style of the 10th–12th passes' picks and found
  none — a backend-wide `TODO`/`FIXME` grep came back empty and
  `BillingController` is confirmed still a zero-route scaffold; what
  remains open (Module 7, "Write it myself") is real feature scope, not a
  quick fix, so none was invented. Instead: corrected a stale wireframe
  caption (turn 1, screen 1l — "Try again"/"Write it myself" hadn't been
  updated to reflect the 12th pass shipping the former and disabling the
  latter in the real frontend), and replaced the ten scattered, serially
  "superseding" per-pass UAT checklist sections in
  `dygo_academy_session_report_2026-09-01.md` with one linear,
  deduplicated script, `dygo_academy_uat_checklist_2026-09-02.md`, that
  also states plainly up front which three things (live-Postgres
  migrations/RLS, `next build`, real-browser behavior) have never
  actually run anywhere outside this Docker-less sandbox. Module 7
  reasoning unchanged from the 7th–12th passes — still deliberately
  deferred, still the standing top item for the first pass after UAT
  feedback lands. `next build` not re-attempted — 12-for-12 hang standing,
  unchanged. See the thirteenth pass entry in
  `dygo_academy_session_report_2026-09-01.md`.
* **5.10** (2026-09-01) — Twelfth pass, same day as the eleventh, still
  ahead of tomorrow morning's UAT. Module 7 (Stripe seat billing) reasoning
  is unchanged from the 7th–11th passes — still deliberately deferred to
  after UAT feedback lands. Closed one small, well-scoped, low-risk gap
  instead: the FAILED word state's "Try again" button (wireframe 1l) had
  no backend route and no `onClick` since Module 2 shipped. New
  `POST /words/:id/re-enrich` (`WordsService.reEnrich`) flips a `FAILED`
  `topic_words` row back to `ENRICHING` and re-enqueues the existing
  `enrich-word` BullMQ job, gated by the already-existing
  `topic_words_update_write` RLS policy — no new migration needed. Frontend:
  `useReEnrichWord` + `WordStatusRow.tsx` wiring, invalidating the same
  topic-detail query `useTopic`'s existing 2.5s poll already watches. Also
  disabled (rather than left silently inert) the adjacent "Write it myself"
  button, a separate unbuilt feature. 2 new backend unit tests (153 total,
  up from 151). `dygo_academy_api_surface.md` updated: the endpoint moved
  from "implied" to "live" (37 live, 13 implied), and the `GET /words/:id`
  implied row was annotated as possibly unneeded — the frontend actually
  polls `GET /topics/:id`, not a per-word route. `next build` was not
  re-attempted this pass (11-for-11 hang standing, unchanged, not
  re-verified a 12th time — token budget judgment call). See the twelfth
  pass entry in `dygo_academy_session_report_2026-09-01.md`.
* **5.9** (2026-09-01) — Eleventh pass, same day as the tenth, still ahead
  of tomorrow morning's UAT. Module 7 (Stripe seat billing) reasoning is
  unchanged from the 7th–10th passes — still deliberately deferred to
  after UAT feedback lands, not started this pass either. Instead closed
  two standing, lower-risk known gaps that had been carried forward
  unfixed for several passes: **Module 4's offline-first sync** (open
  since Phase 2) and **FR-6.2's unrated sprint route** (flagged since the
  5th pass). Offline sync: new `lib/offline-review-queue.ts` (native
  IndexedDB, no new dependency) queues a rating when `POST /srs/rate`
  fails at the network level (not a real `ApiError` from a reachable
  server — that still surfaces as before); `useOfflineReviewSync`, mounted
  once at the app root in `QueryProvider.tsx`, drains that queue through
  the already-existing, already-unit-tested `POST /srs/sync` on the
  browser's `online` event. No backend change was needed — `SrsService.sync`
  has done the actual work since Phase 2, only nothing on the frontend ever
  called it outside a manual replay. Sprint rate limiting: new
  `SprintRateLimitGuard` (in-process, per-group 60s cooldown, no new
  dependency — `@nestjs/throttler` was considered and deliberately not
  added this close to UAT), registered as a provider in
  `NotificationsModule` and applied via `@UseGuards` on
  `POST /groups/:groupId/sprint`; documented as a single-instance-only
  limiter, not what a horizontally-scaled deployment would want. 6 new
  backend unit tests (151 total, up from 145); frontend has no test
  runner, `tsc --noEmit` and `next lint` clean on both changes. No
  wireframe change — offline sync and the rate limit are both invisible
  mechanisms, not new screens. Also cleaned up `.tmp_work/`, a stray
  scratch directory left over from a prior pass's wireframe-editing
  process that this sandbox's `rm`/`mv`-across-filesystem permission quirk
  wouldn't let this pass actually delete — same-filesystem `mv` into the
  already-gitignored `.SANDBOX_UNDELETABLE_JUNK_ignore/` worked instead
  (see the master reference memory / eleventh pass's session report entry
  for the exact commands). `next build` still hangs in this sandbox — 11th
  occurrence across 11 sessions. Nothing this pass touched has run against
  a live Postgres/Redis stack or a real browser's IndexedDB/`online`
  event — same standing sandbox limitation as every earlier pass. See the
  eleventh pass entry in `dygo_academy_session_report_2026-09-01.md`.
* **5.8** (2026-09-01) — Tenth pass, evening before UAT. Closed the standing
  "roster shows no name for an invite-redeemed member" gap, open since the
  6th pass and precisely diagnosed (but not fixed) by the 9th:
  `profiles_select_self_or_tenant` was tenant-equality-only, and a
  redeemed member's personal tenant (006) deliberately never equals the
  inviting teacher's. New `database/migrations/008_profiles_group_visibility.sql`
  adds a `shares_group_with()` SECURITY DEFINER helper and a matching OR
  clause to that policy — a teacher (or classmate) can now see any
  groupmate's name/email regardless of tenant; `review_logs`/SRS visibility
  is untouched. One new `rls_test.sql` section (I, 4 new assertions, 47
  total) proves both the fix and that isolation still holds for a
  non-groupmate. Backend 145/145 tests still pass unmodified (this pass's
  only backend change is the migration + two doc/comment updates, no
  service logic touched). Wireframe turn 3c's caption updated to describe
  the fix. Module 7 (Stripe seat billing) remains deliberately untouched —
  same standing reasoning as the 7th/8th/9th pass, this close to UAT is not
  the time to start integrating a live payment provider. `next build`
  still hangs in this sandbox — 10th occurrence across 10 sessions, treated
  as a sandbox property per the 9th pass's own note, not re-investigated
  further. Not run against a live Postgres — same standing limitation as
  every earlier pass; the new migration and RLS section are unverified
  against a real database. See the 10th pass entry in
  `dygo_academy_session_report_2026-09-01.md`.
* **5.7** (2026-09-01) — Ninth pass. Fixed a real, UAT-blocking bug: a
  freshly-registered user (anyone not one of the 5 seeded fixtures)
  couldn't create their first group at all, because `handle_new_auth_user()`
  left `profiles.tenant_id` NULL and `groups.tenant_id` is `NOT NULL` —
  `006_solo_tenant_provisioning.sql` now auto-provisions a personal,
  unpaid (0-seat) tenant for every signup inside the same trigger. Traced
  through `profiles_select_self_or_tenant` precisely enough to correct the
  8th pass's assumption that this was "the same root cause" as invite-
  redeemed members showing no name in the roster — it isn't quite; that
  gap is still open, see the migration's own header comment. Verified (not
  re-fixed) that the topic-delete button is still correctly ADMIN-gated in
  `GroupTopicsPanel.tsx`. Built Module 8 (Phase 4) end to end: wired the
  frontend to FR-8.1's already-existing `/srs/stats`/`/srs/leeches` routes,
  and built FR-8.2's class-wide mistake heatmap new from scratch
  (`AnalyticsModule`, `GET /groups/:id/heatmap`, backed by a `SECURITY
  DEFINER` function since `review_logs` RLS is owner-only with no ADMIN
  exception). Module 7 (Stripe billing) deliberately untouched — flagged
  for the next pass. Added wireframe turn 9 (student analytics + teacher
  heatmap screens). 15 new backend unit tests (145 total). See the 9th
  pass entry in `dygo_academy_session_report_2026-09-01.md`.
* **5.6** (2026-09-01) — UAT-prep pass, no new module work: closed the
  known "`GET /groups/:id/members` has no email/display-name join" gap
  flagged since the 7th pass (`RosterPanel` showed a shortened user id).
  Also corrected two stale wireframe captions (turns 3c/3d) that still said
  their endpoints were "Implied, not built" long after both shipped. See
  status notes under §2 (Phase 1) and the 8th pass entry in
  `dygo_academy_session_report_2026-09-01.md`.
* **5.5** (2026-09-01) — No new backend phase work; this pass closed the standing "no group-management frontend" gap (Phase 1's own status note below) and, more importantly, discovered and fixed that `(auth)/login`/`(auth)/register` had never been built — see status notes under §2 (Phase 1) for both.
* **5.4** (2026-09-01) — Phase 3, Module 6 (Web Push & Habit Scheduling) marked code-complete — Phase 3 as a whole is now done. See status notes under §2.
* **5.3** (2026-09-01) — Phase 3, Module 5 (Dynamic Multi-Modal Quiz Engine) marked code-complete; Module 6 (Push & Habit Scheduling) is still open. See status notes under §2. Also fixed a standing Phase 1 gap: the last-ADMIN-removal guard.
* **5.2** (2026-09-01) — Phase 2 (Modules 3 & 4) marked code-complete; see status notes under §2.
* **5.1** (2026-08-31) — Phase 0 core engineering tasks marked complete; see status notes under §2.
* **5.0** — Definitive Master Execution Plan (baseline).

---

## 1. Executive Summary & Phasing Overview

To successfully deliver **Dygo Academy** within a predictable timeline while maintaining high architectural integrity and strict SLOs (as detailed in `dygo_academy_final_master_brd.md` and `dygo_academy_complete_system_architecture_master.md`), development is organized into a **12-week, 6-sprint phased execution plan**.

The core engineering principle is **"Foundations & Asynchronous Pipelines First $\rightarrow$ Retention & Practice Loop Second $\rightarrow$ Monetization & Enterprise Tooling Third."**

```
Total MVP Timeline: 12 Weeks (6 Two-Week Sprints)
Methodology: Agile-Scrum with Milestone-Gated Releases
Target: Production-Ready Commercial MVP Launch
```

```mermaid
gantt
    title Dygo Academy 12-Week Development Roadmap
    dateFormat  YYYY-MM-DD
    section Phase 0: Foundations
    DB Schema & Supabase RLS       :2026-09-01, 7d
    NestJS Monolith & BullMQ Core   :2026-09-05, 9d
    section Phase 1: Ingestion & AI
    Groups, Topics & RBAC Matrix   :2026-09-15, 7d
    AI Enrichment & Lexicon Cache  :2026-09-18, 11d
    section Phase 2: SRS & Flashcards
    Adaptive SRS & Leech Engine    :2026-09-29, 8d
    3D Flashcard Player (Next.js)  :2026-10-03, 10d
    section Phase 3: Quizzes & Push
    Multi-Modal Dynamic Quizzes    :2026-10-13, 8d
    Timezone Web Push (VAPID)      :2026-10-17, 10d
    section Phase 4: Billing & Admin
    Stripe Seat Billing & Proration:2026-10-27, 8d
    Mistake Heatmaps & Analytics   :2026-10-31, 10d
    section Phase 5: Hardening & Go-Live
    NFR Load & Security Testing    :2026-11-10, 7d
    Production Launch & Monitoring :2026-11-17, 7d
```

---

## 2. Detailed Phase & Sprint Breakdown

### 🧱 Phase 0: Architecture Setup, Infrastructure & DB Foundations
* **Timeline**: Sprint 1 (Weeks 1 – 2)  
* **Primary Objective**: Establish the data schema, Row-Level Security (RLS) policies, API gateway, asynchronous queue cluster, and CI/CD pipelines.
* **Status**: ✅ **Complete** (2026-08-31) — core engineering tasks 1–4 below are done. Two items from the objective line are carried forward rather than closed: CI/CD pipelines were never broken into a task here and still don't exist (`.github/workflows` is empty); Cloudflare R2 is provisioned at deploy time; local dev runs against MinIO instead (see task 3).

#### Core Engineering Tasks:
1. ✅ **Database & Auth Layer (Supabase / PostgreSQL 15+)**:
   * Initialize full multi-tenant schema: `tenants`, `tenant_seats`, `profiles`, `master_lexicon`, `groups`, `group_members`, `topics`, `topic_words`, `user_word_srs`, `study_schedules`, `push_subscriptions`.
   * Implement Row-Level Security (RLS) policies ensuring students only access permitted topics and maintain isolated personal review progress.
   * Add high-performance partial index:
     ```sql
     CREATE INDEX idx_srs_due_fast ON public.user_word_srs (user_id, next_due_at)
     WHERE next_due_at <= NOW();
     ```
   * Set up monthly table partitioning for `review_logs`.
   * *Done — `database/migrations/001_initial_schema.sql`, `002_rls_policies.sql`, `003_indexes.sql`; verified by the RLS suite in `database/tests/rls_test.sql` (45 assertions as of the 9th pass — see 5.7 changelog entry).*

2. ✅ **Backend Monolith Framework (NestJS)**:
   * Scaffold Clean Architecture modules: `TopicsModule`, `WordsModule`, `SrsModule`, `SeatSubscriptionModule`, `NotificationModule`.
   * Configure Supabase JWT Guard with in-memory cryptographic verification (`<0.2ms` overhead).
   * Integrate Global `ValidationPipe` with `class-validator` DTOs.
   * Auto-generate interactive OpenAPI / Swagger docs at `/api/docs`.
   * *Done — `com.dygoacademy.backend/src/modules/*`, `common/guards/supabase-jwt.guard.ts`, `main.ts`. Route implementations inside these modules are Phase 1+ work — see `dygo_academy_api_surface.md` for what's actually live today.*

3. ✅ **Asynchronous Queues & Cloud Storage**:
   * Configure Redis cluster with BullMQ (`enrichment-queue`, `notification-cron-queue`).
   * Provision Cloudflare R2 bucket with custom domain and edge CDN ($0 egress).
   * *Done for local dev — `src/queues/queues.module.ts`, `docker-compose.yml` (`redis`, `minio` services). MinIO stands in for R2 locally; the R2 bucket itself is a production provisioning step, not something this repo does.*

4. ✅ **Frontend Scaffolding (Next.js 14/15 App Router)**:
   * Set up Tailwind CSS with shadcn/ui design tokens.
   * Implement TanStack Query and Zustand client state stores.
   * Set up Supabase Auth client session management.
   * *Done — `com.dygoacademy.frontend/` (App Router, `tailwind.config.ts` + `components/ui/`, `components/layout/QueryProvider.tsx`, `stores/useStudySessionStore.ts`, `lib/supabase.ts`). Builds and type-checks clean; domain screens are Phase 1+.*

---

### 🧠 Phase 1: Collaborative Groups & AI Lexicon Ingestion
* **Timeline**: Sprint 2 (Weeks 3 – 4)  
* **Primary Objective**: Implement **Module 1** (Multi-Tenant Groups & RBAC) and **Module 2** (Automated AI Word Enrichment Engine).
* **Status** (2026-09-01, updated): Module 1 backend is code-complete — 19
  live endpoints covering groups, roster/RBAC management, magic invites, and
  topic CRUD + clone (`dygo_academy_api_surface.md` §2). Module 2's ingestion
  endpoint (`POST /words`) and `EnrichmentProcessor` are both code-complete
  now too: dedup lookup, real Gemini 1.5 Flash calls for IPA/POS/synonyms/
  antonyms/examples, Gemini TTS for audio, R2/MinIO upload, `master_lexicon`
  upsert (see `dygo_academy_api_surface.md` note (4) for the `.wav`-not-`.mp3`
  deviation and why). Frontend task 3 below (word creation modal + polling)
  is also done. **None of this has been run against a live
  Postgres/Redis/MinIO stack** — no Docker in the sandbox this work was done
  in. Static checks only: `tsc --noEmit`, `eslint`, and 51 Jest unit tests
  (backend), `tsc`/`next lint` clean (frontend) — `next build` still hangs
  in this sandbox, reproduced a third time across three sessions, so treat
  it as a sandbox limitation rather than a code issue pending a real run.
  Verify against `/api/docs`, the RLS suite
  (`database/apply-migrations.sh --test`), and a real `POST /words` →
  enrichment → `GET /topics/:id` round-trip before treating Phase 1 as done.
  **Update (2026-09-01, 7th pass):** frontend task 3's own scope — "Build
  Topic/Group Explorer" — is now actually complete; the "Group" half was
  missing until this pass (`app/(dashboard)/groups/`,
  `app/(dashboard)/join/[token]/`: list/create groups, roster + role
  management + member removal, invite mint/list/revoke, ADMIN settings/
  delete, the Module 6 teacher-sprint trigger, and topic create/delete —
  all previously API- and wireframe-only). Separately, and more
  foundationally: `(auth)/login` and `(auth)/register` were discovered to
  still be Phase-0 stubs with no form at all, meaning no route in this
  application was reachable through an actual browser regardless of
  backend completeness — six prior passes never caught this because none
  booted a browser. Both are real now (`signInWithPassword`/`signUp`), and
  `database/migrations/004_seed_data.sql` was fixed to give the seeded
  fixtures a real GoTrue password (`dygo-dev-2026`) so UAT can sign in
  through the browser, not only via `scripts/dev-token.js` + curl/Swagger.
  **Neither the roster/invite screens nor the login form have run against
  a live Postgres/GoTrue stack** — same standing sandbox limitation as
  everything else in this document; verify a real sign-in and a real
  invite-link round-trip before treating this as done.
  **Update (2026-09-01, 8th pass):** the roster's own known gap — no email
  or display name, only a shortened user id — is fixed. `GroupsService.findMembers`
  now `left join`s `profiles` for `email`/`display_name`; `RosterPanel` shows
  `display_name`, falling back to `email`, falling back to the shortened id
  only when both are null. A `left` (not `inner`) join is the deliberate
  choice: an inner join would have silently dropped from the roster any
  member whose profile `profiles_select_self_or_tenant` hides from the
  caller — real today for anyone seated via a redeemed invite link, since
  `redeem_group_invite()` seats them in `group_members` but never sets
  `profiles.tenant_id` (same root cause as the standing "no solo-user
  tenant provisioning" gap, not a new one). 1 new backend unit test (130
  total, up from 129); `tsc`/lint clean both sides. Two wireframe captions
  (3c, 3d) that still read "Implied, not built" — stale since as early as
  the 2nd/3rd pass — were also corrected to reflect current reality.

#### Core Engineering Tasks:
1. **Module 1: Groups, Topics & Granular RBAC**:
   * Public vs. Private Topic scoping and discovery endpoints.
   * Granular permission validation: `ADMIN` (Full Control), `WRITE` (Add/Edit Words), `READ` (Study & Quiz Only).
   * One-click Magic Invitation link generation with secure cryptographic join tokens.

2. **Module 2: Automated AI Enrichment Pipeline**:
   * Build `POST /words` ingestion endpoint returning `201 Created` with status `ENRICHING` in $<50\text{ms}$.
   * BullMQ `EnrichmentProcessor` integrating Google Gemini 1.5 Flash:
     * Dual-accent IPA phonetics (US `/rɪˈzɪl.jənt/` & UK `/rɪˈzɪl.i.ənt/`).
     * Part of Speech (POS), CEFR-graded synonyms (5) and antonyms (5).
     * Level-adapted contextual example sentences (A2–C1).
   * Integrate Neural TTS engine $\rightarrow$ Stream `.mp3` directly to Cloudflare R2.
   * **Global Lexical Deduplication**: Query `master_lexicon` before invoking Gemini/TTS to reuse cached linguistic assets and reduce API costs by $>85\%$.

3. **Frontend Integration**:
   * Build Topic/Group Explorer, Word creation modal, and real-time enrichment status polling via TanStack Query.

---

### 📈 Phase 2: Error-Adaptive SRS Engine & 3D Flashcards
* **Timeline**: Sprint 3 (Weeks 5 – 6)  
* **Primary Objective**: Implement **Module 3** (Mistake-Penalized SRS) and **Module 4** (3D Flashcard Player).
* **Status** (2026-09-01): Both modules are code-complete. Module 3 —
  `SrsService`/`SrsController` (`GET /srs/due`, `/leeches`, `/stats`, `POST
  /rate`, `/sessions`, `/sync`) plus `GET /topics/:id/cards/due` — implements
  the full FR-3.1 mistake-weighted formula, all four FR-3.2 rating actions,
  and FR-3.3's leech flag; the scoring math is isolated in
  `src/modules/srs/srs-algorithm.ts` as pure, unit-tested functions (24 new
  tests, 75 total). This also **settles the `recent_mistakes` decay question**
  flagged in `dygo_academy_api_surface.md` §5.4 — recomputed from
  `review_logs` on every rating, not decayed on a schedule. Module 4 wires
  the Phase 0 flashcard scaffold (`components/flashcard/Flashcard.tsx`,
  `RatingButtons.tsx`) to real data via two new hooks
  (`useStudySession`/`useRateWord`), adds the FR-4.2 progressive clue ladder
  (`ProgressiveClues.tsx`) and FR-2.4's audio speed toggle (`AudioButton.tsx`),
  and implements all three FR-4.3 modes (Standard/Reverse/Listening) in
  `/study`. Offline-first sync (Module 4's "local SQLite/IndexedDB cache")
  was **not** implemented as of this pass — `POST /srs/sync` existed on the
  backend and was unit-tested, but nothing on the frontend queued reviews
  offline. **Update (2026-09-01, 11th pass): closed.** `lib/offline-review-queue.ts`
  (native IndexedDB) queues a rating when `POST /srs/rate` fails at the
  network level; `useOfflineReviewSync`, mounted at the app root, drains
  the queue through the existing `POST /srs/sync` on the browser's
  `online` event. See the 11th pass's session report entry for the full
  design and its deliberate scope limits (no client-side ease-factor
  computation, no retry of server-rejected items). **None of this has been
  run against a live Postgres/Redis stack, or a real browser's
  IndexedDB/`online` event** — same standing sandbox limitation as Phase 1;
  verify a real `POST /srs/rate` round-trip and the `p95 < 15ms` due-card
  query before treating Phase 2 as done. `tsc`/lint clean on both sides;
  frontend `next build` still hangs in this sandbox (4th occurrence across
  4 sessions as of this pass, 11th as of the 11th pass overall).

#### Core Engineering Tasks:
1. **Module 3: Error-Adaptive Spaced Repetition System**:
   * Implement mistake-weighted retention formula:
     $$EF' = EF + \Big(0.1 - (5 - q) \cdot (0.08 + (5 - q) \cdot 0.02)\Big) - (\lambda \cdot M_{\text{recent}})$$
   * Build 4 standard rating handlers: `[Again]` (reset, +1 mistake), `[Hard]` ($\times 1.2$), `[Good]` (standard intervals), `[Easy]` ($\times 1.3$).
   * Implement **Leech Word Diagnostic Detection**: Auto-flag words with $\ge 4$ failures in 7 days.
   * Build sub-15ms daily due card retrieval using Redis session caching + PostgreSQL partial indexes.

2. **Module 4: Interactive 3D SRS Flashcard Player**:
   * Responsive 3D flip card component with smooth CSS perspective transforms.
   * **Progressive Clue Engine**: Step-by-step hint reveals (First-Letter $\rightarrow$ IPA Hint $\rightarrow$ Audio $\rightarrow$ Context Sentence).
   * Multiple study session modes: Standard Mode, Reverse Context Mode, and Audio-Only Listening Mode.
   * Offline-first sync capability using local SQLite / IndexedDB cache.

---

### ✍️ Phase 3: Dynamic Quiz Engine & Habit Push Scheduling
* **Timeline**: Sprint 4 (Weeks 7 – 8)  
* **Primary Objective**: Implement **Module 5** (Multi-Modal Quizzes) and **Module 6** (Web Push & Habit Reminders).
* **Status** (2026-09-01): Module 5 is code-complete —
  `QuizService`/`QuizController` (`POST /quizzes/generate`, `POST
  /quizzes/:id/answer`, `GET /quizzes/leech-drill`) implement FR-5.1–5.5;
  the generation/grading logic is isolated in `src/modules/quiz/quiz-
  generator.ts` as pure, unit-tested functions (32 new tests, 107 total).
  Biggest design call: **no persisted quiz/session/attempt row** — a quiz
  item's id is deterministic and its correct answer always derived the same
  way, so grading needs no database memory of what was generated (see
  `dygo_academy_api_surface.md` note (6) for the full reasoning). FR-5.3
  ("drag-and-drop semantic pairing") is implemented as one-word-at-a-time
  multiple choice rather than a literal drag-and-drop board — flagged as a
  deliberate simplification, not a silent scope cut. The frontend's `/quiz`
  page (mirroring `/study`'s Suspense-split structure) covers all four quiz
  types plus FR-5.5's AI nuance feedback on a wrong answer, and the topic
  detail page's new "Quiz" button and the home screen's leech nudge both
  route into it. This pass also fixed a standing Phase 1 gap unrelated to
  Module 5: `DELETE /groups/:id/members/:userId` now blocks removing a
  group's last ADMIN (`409 Conflict`) instead of silently permitting it.
  **Module 6 (Web Push & Habit Scheduling) is code-complete as of a later
  pass the same day** — `NotificationsService`/`NotificationsController`
  (`GET /notifications/vapid-public-key`, `POST`/`DELETE
  /notifications/subscribe`, `GET`/`POST /notifications/schedules`, `DELETE
  /notifications/schedules/:id`, `POST
  /notifications/groups/:groupId/sprint`) implement FR-6.1–6.5; a shared
  `PushDispatchService` owns the actual VAPID `web-push` send and
  dead-subscription cleanup, used by both `NotificationProcessor`'s
  15-minute tick and the sprint route's immediate dispatch. FR-6.1/6.3/6.4
  are merged into one priority-ordered decision per matched schedule
  (`notification-message.ts`'s `buildReminderPayload`: leech drill outranks
  streak protection outranks a plain habit nudge) rather than three
  independent triggers, since no `notification_log` table exists to track
  "already notified today" — same "don't persist what's derivable" instinct
  Module 5 used for its stateless quiz items. The tick matches each user's
  own local reminder time via `width_bucket` bucketing rather than a UTC
  offset comparison, so half- and quarter-hour zones (`Asia/Kathmandu`,
  UTC+5:45) still land in the right 15-minute window despite the tick
  itself running on UTC quarter-hours. FR-6.2's teacher sprint is
  ADMIN-gated by an explicit `has_group_role` check rather than RLS (there
  is no table row being written for RLS to gate) and is API- and
  wireframe-only for now — there is no group-management frontend at all yet
  for a teacher to trigger it from, flagged in wireframe turn 8g's caption
  rather than silently built unreachable. Settings ("You" tab), a
  "Coming in a later phase" stub since turn 1, is real now: push
  on/off, add/remove a daily reminder time. 22 new backend unit tests (129
  total). **Phase 3 is now fully code-complete — both Module 5 and Module 6.**
  **Neither module has run against a live Postgres/Redis stack, and Module
  6's VAPID sends have never hit a real browser push service** — same
  standing sandbox limitation as Phases 1 and 2; verify a real
  `POST /quizzes/generate` → `POST /quizzes/:id/answer` round-trip
  (including a real Gemini nuance-explanation call) and a real
  `POST /notifications/subscribe` → wait for a matching tick → browser
  receives the push round-trip before treating Phase 3 as done. `tsc`/lint
  clean on both sides; frontend `next build` still hangs in this sandbox
  (6th occurrence across 6 sessions).

#### Core Engineering Tasks:
1. **Module 5: Dynamic Multi-Modal Exercise Engine**:
   * Dynamic Cloze (fill-in-the-blank) generation from AI contextual sentences.
   * Audio Dictation & Spelling verification engine with audio playback speed controls ($0.75\times / 1.0\times$).
   * Synonym & Antonym drag-and-drop semantic pairing.
   * AI Nuance Explanations: Real-time contextual feedback on incorrect quiz answers.
   * Dedicated Leech Word Remedial Practice Queue.

2. **Module 6: Pure Push Notifications & Scheduling**:
   * VAPID Web Push client registration (`POST /notifications/subscribe`).
   * BullMQ 15-minute cron heartbeat evaluating user-configured local times (e.g., 8:00 PM in user's timezone).
   * Automated alert triggers: Daily Habit reminder, Teacher Class Sprints, Streak Protection, and Leech word drills.
   * Actionable 1-tap notification deep links routing directly into `/study`.

---

### 🎟️ Phase 4: Tiered Seat Billing & Analytics Heatmaps
* **Timeline**: Sprint 5 (Weeks 9 – 10)  
* **Primary Objective**: Implement **Module 7** (Stripe Seat Monetization) and **Module 8** (Teacher Heatmaps).
* **Status** (2026-09-01, 9th pass): Module 8 is code-complete. FR-8.1
  (student streak/mastery/leech list) was already served by `GET
  /srs/stats`/`/srs/leeches` since Phase 2 — this pass wired the frontend
  (`useSrsStats`, `useLeeches`, `(dashboard)/analytics/page.tsx`, previously
  the literal "Coming in a later phase" stub since turn 1). FR-8.2 (the
  class-wide mistake heatmap) is new end-to-end: `GET /groups/:id/heatmap`
  (new `AnalyticsModule`), ADMIN-gated the same `has_group_role` way the
  Module 6 teacher-sprint route is, backed by `public.group_word_heatmap()`
  (`007_group_word_heatmap.sql`) — a narrowly-scoped `SECURITY DEFINER`
  function, required because `review_logs_select_own` is owner-only RLS
  with no ADMIN exception (confirmed by `rls_test.sql`'s own "even the
  group ADMIN cannot read a student's review history" assertion); the
  function returns only per-word aggregate counts, never a raw row or a
  `user_id`. Ranking (failure-rate computation, worst-first sort, top-20
  cap) is isolated in `heatmap-aggregator.ts` as a pure, unit-tested
  function, matching the `srs-algorithm.ts`/`quiz-generator.ts` precedent.
  15 new backend unit tests. **Module 7 (Stripe seat billing) is
  untouched and still fully open** — `billing/*` is still the literal
  empty scaffold stub; deliberately not started this pass (the day before
  UAT is not the time to start integrating a live payment provider) —
  flagged as the top item for the next pass. **Not run against a live
  Postgres/Redis stack** — same standing sandbox limitation as every
  earlier phase.

#### Core Engineering Tasks:
1. **Module 7: Unified Seat-Based Monetization**:
   * Stripe Checkout integration supporting tiered volume discounts:
     * Solo Learner (1 Seat): **\$7.99 / mo**
     * Online Tutor (5 – 30 Seats): **\$3.99 / seat / mo** (50% discount)
     * Language Academy (31 – 150 Seats): **\$2.49 / seat / mo** (68% discount)
     * School District (151+ Seats): **\$1.49 / seat / mo** (80% bulk discount)
   * Stripe Webhook processing (`customer.subscription.created`, `invoice.payment_succeeded`, `customer.subscription.updated`).
   * Automated mid-cycle seat additions and prorations.
   * **Frictionless Student Onboarding**: Students joining via teacher invite links access the platform **100% FREE** with zero payment screens.

2. **Module 8: Analytics & Cohort Heatmaps**:
   * Student analytics: Active study streaks, mastery projections, and leech lists.
   * Teacher / Academy Heatmap: Cohort-level error analysis identifying words with the highest failure rates.

---

### 🚀 Phase 5: Hardening, NFR Verification & Production Launch
* **Timeline**: Sprint 6 (Weeks 11 – 12)  
* **Primary Objective**: Rigorous NFR load testing, security audits, SEO optimization, and production deployment.

#### Core Engineering Tasks:
1. **Performance & SLO Verification**:
   * Verify word ingestion API $\text{p95} < 50\text{ms}$.
   * Verify daily SRS review queue fetch $\text{p95} < 15\text{ms}$.
   * Verify audio streaming latency $\text{p95} < 80\text{ms}$ across global edge nodes.
   * Validate $>85\%$ hit rate on `master_lexicon` cache.

2. **Security & Multi-Tenant Audit**:
   * Complete penetration testing of PostgreSQL RLS policies across tenants.
   * Validate Stripe webhook signature verification and idempotency.

3. **SEO, Deployment & Go-Live**:
   * Enable Server-Side Rendering (SSR) for public topic libraries to maximize search indexing.
   * Set up health check endpoints, automated container auto-healing, and alerting.
   * Production release and official onboarding of pilot tutors and language academies.

---

### 🩹 Phase 6: UX & Trust Remediation
* **Timeline**: Unscheduled — a post-launch pass, not part of the original 12-week/6-sprint plan above.
* **Primary Objective**: Close 20 findings from a screen-by-screen UX audit of the live app (2026-09-19) — data-integrity bugs in the retention loop (streak/due-count/leech-nudge disagreeing across screens), unconfirmed destructive actions, quiz/study UX gaps, and internal engineering language that had leaked into production copy. Full requirements, root-cause analysis, and a developer implementation plan live in three documents this phase produced, kept outside this file rather than duplicated into it: `phase 2.md` (the 20 FRs — what and why, called "Phase 2" in its own title since that's what it was asked to be named before this section existed to disambiguate it from *this* file's own Phase 2 — see its own naming note), `phase 2 implementation plan.md` (file-by-file developer handoff), and `Claude outputs/phase 2 session schedule.md` (9 token-budgeted sessions this was executed across).
* **Status** (2026-09-19): **All 20 FRs code-complete** (`tsc --noEmit`, `eslint`, `jest` 165/165 backend clean on every commit) as of `e6750a1`. Session 9's close-out pass did what every earlier phase in this document flagged as a standing gap and never actually did — walked every FR against the live app instead of stopping at code review — and it caught something no amount of code review would have: **a real deploy lag**. Only the first 11 FRs (everything through commit `20dab8e`) are live; the remaining 9 (FR-10.1, FR-10.3, FR-12.1, FR-12.2, FR-12.3, FR-13.1, FR-14.1, FR-15.5, FR-16.3 — commit `88de075` onward) are fully built and tested but still showing pre-fix behavior in production, confirmed by directly reproducing the old behavior live (e.g. clicking "Delete this topic" still does nothing — no dialog — because the pre-fix build is what's actually deployed). This repo's `.github/workflows` has been empty since Phase 0, so there's no deploy-on-commit pipeline to have caught this automatically. **Action needed from whoever owns deploys**: push a new build. Full detail, including exactly which commit is the live/not-live boundary, is in `phase 2.md` §9.
  * **Update (2026-09-20)**: superseded by Phase 7's finding below — a deploy did eventually happen, but broke production auth in the process. This phase's own 9-FR live/not-live boundary is now moot, since nothing authenticated is checkable until that's fixed. See Phase 7's status.

---

### 🚨 Phase 7: Learning Path & Engagement (Phase 3 planning), and a production incident found while closing it out
* **Timeline**: Unscheduled — a second post-launch pass, following directly after Phase 6.
* **Primary Objective**: Build the parts of the "Dygo Learning Path" concept (a reimagined, more game-like customer journey — see that artifact, published 2026-09-19) that Phase 6/`phase 2.md` explicitly left out of its own remediation scope. Full requirements and the developer handoff live in `phase 3.md` (named "Phase 3" in its own title for the same reason `phase 2.md` was — file it as **Phase 7** here to avoid colliding with this document's own Phase 2 and Phase 3, both unrelated), `phase 3 implementation plan.md`, and `Claude outputs/phase 3 session schedule.md` (5 sessions).
* **Status** (2026-09-20): **5 of 7 modules code-complete** as of `8ddff7f` — a personalized arrival headline, per-topic mastery rings, a 5-day Home activity trail (new backend endpoint + frontend component), a reward-framed study-session summary, and severity-scaled coloring on the personal leech-word list (this last one corrected mid-implementation: `phase 3.md` originally scoped it as a net-new list, but the list already existed since Phase 1/Module 8 — only its flat coloring was the real gap). The remaining 2 modules (an estimated IELTS band score, opt-in cohort momentum) plus one FR (a personalized diagnostic starter deck) are deliberately unbuilt — each has an open product question named in `phase 3.md` §7, not an engineering gap.
  * **Session 5's close-out found something bigger than a deploy check**: attempting to live-verify this phase's work (and re-verify Phase 6's still-pending 9 FRs) surfaced that **production sign-in is completely broken** on `dygoacademy.com` right now. The live JS bundle calls `http://localhost:8000/auth/v1/token` for Supabase auth instead of `https://supabase.dygoacademy.com` (`env-profiles/prod.env`'s correct value) — a dev-only `NEXT_PUBLIC_SUPABASE_URL` baked in at build time by a production build that didn't source `env-profiles/prod.env` (the documented `npm run build:prod:domain` path does; whatever built the currently-live bundle apparently didn't). Every authenticated screen — Home, Topics, Study, Progress, Groups — is unreachable for every real user until this is fixed. Full detail, including the exact failed network request and every env file checked to confirm the correct value, is in `phase 3.md` §9.
  * **This also means Phase 6's own remaining "9 FRs pending deploy" status (above) can no longer be re-checked either** — whatever deploy shipped Phase 7's Session 1 work (confirmed live: `/search`'s new headline) also introduced this auth regression, so a deploy clearly *did* happen since Phase 6's close-out, just one with a new, more severe problem than the one it may have fixed.
  * **Action needed, before anything else in either phase**: rebuild and redeploy via `npm run build:prod:domain` (not a bare `next build`), and add a pre-deploy check that fails loudly on a `localhost` value in any `NEXT_PUBLIC_*` var for a production build — this failure mode is otherwise silent, surfacing only as "Failed to fetch" in a user's browser console, not a build error.

---

## 3. Milestone Deliverables Summary Table

| Milestone | Target Window | Key Engineering Deliverables | Acceptance & Success Criteria |
| :--- | :---: | :--- | :--- |
| **M0: Core Foundation** | End of Week 2 | PostgreSQL schema, RLS policies, NestJS API Gateway, Redis & BullMQ | Verified JWT auth, DB migrations executed, BullMQ passing test jobs. |
| **M1: Ingestion & AI** | End of Week 4 | Collaborative Topics, RBAC & Gemini 1.5 Flash Worker | Word ingestion $<50\text{ms}$, AI & audio enriched asynchronously, Lexicon deduplication working. |
| **M2: Learning Engine** | End of Week 6 | Error-Adaptive SRS & 3D Flashcard Player | Review queue $<15\text{ms}$, 3D flip card functioning with progressive hint engine. |
| **M3: Retention Loop** | End of Week 8 | Multi-Modal Quizzes & Timezone Push Alerts | Cloze/audio drills active, VAPID push fired on local user schedule with 1-tap links. |
| **M4: Monetization** | End of Week 10 | Stripe Tiered Billing & Teacher Heatmaps | Seat license checkout, webhook sync, and student \$0-cost join flow verified. |
| **M5: Launch Ready** | End of Week 12 | Security Audit, Load Testing & Production Deployment | Meets all NFR SLOs (p95 $<50\text{ms}$ ingestion, 99.95% uptime ready). |

---

## 4. Responsibility Assignment Matrix (RACI)

| Functional Area | Tech Lead / Backend | Frontend Lead | QA & DevOps | Product Owner |
| :--- | :---: | :---: | :---: | :---: |
| **Database Schema & RLS** | **A / R** | C | C | I |
| **NestJS API & BullMQ** | **A / R** | C | C | I |
| **Gemini AI & Audio Ingestion** | **A / R** | C | C | C |
| **Next.js 3D Flashcards & UI** | C | **A / R** | C | C |
| **SRS Algorithm & Redis Cache** | **A / R** | C | C | I |
| **Push Notification Subsystem** | **R** | **R** | C | I |
| **Stripe Tiered Seat Billing** | **A / R** | C | C | C |
| **NFR Load & Security Audit** | C | C | **A / R** | I |

*Legend: **A** = Accountable, **R** = Responsible, **C** = Consulted, **I** = Informed.*

---

## 5. Key Project Risks & Mitigation Strategy

| Risk Domain | Potential Impact | Pre-Emptive Mitigation Strategy |
| :--- | :--- | :--- |
| **AI Ingestion Cost / Latency Spikes** | High token usage and external API delays impacting user UX. | `master_lexicon` deduplication cache intercepts $85\%+$ redundant lookups; BullMQ ensures the user receives a response in $<50\text{ms}$ while enrichment runs in the background. |
| **Multi-Tenant Data Leakage** | Students viewing private classroom sets without authorization. | PostgreSQL Row-Level Security (RLS) enforces access control directly at the database engine level, independent of application code. |
| **Timezone Notification Drift** | Push reminders arriving at incorrect hours across global timezones. | Timezones stored explicitly as standard IANA strings; BullMQ cron runs every 15 minutes calculating matching local user times. |
| **Mid-Cycle Seat Proration Errors** | Inaccurate billing when academy owners scale seats mid-month. | Use Stripe's native tiered volume subscription items with automated proration webhooks. |

---

## 6. Pre-Development Checklist (Definition of Ready)

Before initiating Day 1 of Sprint 1, ensure the following infrastructure and configuration prerequisites are satisfied:

- [ ] **Supabase Organization**: Project provisioned with PostgreSQL 15+ and Auth enabled.
- [ ] **Google Gemini API**: API credentials active with Gemini 1.5 Flash rate limits allocated.
- [ ] **Cloudflare R2**: Bucket created with public read CDN and CORS access for audio streaming.
- [ ] **Stripe Developer Account**: Sandbox configured with Tiered Seat Subscription Products.
- [ ] **VAPID Keys**: Web Push public and private keys generated for browser notifications.
- [ ] **Repository Setup**: Monorepo/Multi-repo initialized with NestJS backend, Next.js frontend, and GitHub Actions CI/CD workflows.
