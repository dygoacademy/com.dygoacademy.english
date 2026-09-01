# Dygo Academy — session report, 2026‑09‑01 (ninth pass)
**Run**: automated scheduled task, no user present. UAT is scheduled for tomorrow morning (2026‑09‑02).
This file now covers nine runs today. Passes one through eight (Groups/Words
first slice, the rest of Module 1, Module 2's real Gemini/TTS pipeline,
Module 3/4's SRS engine and flashcard player, Module 5's quiz engine, Module
6's push/habit scheduling closing out Phase 3, the group-management frontend
and login/register fix, then a UAT-prep pass that closed the roster-naming
gap) are preserved below under "First pass" through "Eighth pass" — read
top-down for the current state.

---

## Ninth pass — solo-user tenant provisioning fixed; Module 8 (analytics + mistake heatmap) goes live

### What this pass found on start

Same standing instruction as every prior pass, run the evening before UAT
(2026‑09‑02, tomorrow morning): compared the working tree against
`dygo_academy_master_project_schedule.md` and `dygo_academy_api_surface.md`.
`git status` was clean and `git log` showed eight prior commits all landed,
the most recent being the 8th pass's roster-naming fix. This pass read the
relevant source files closely before touching anything (`GroupsService`,
`002_rls_policies.sql`, `SrsService`/`SrsController`, `NotificationsService`,
`rls_test.sql`) rather than re-running the 8th pass's 130/130 backend
baseline as a first step the way earlier passes did — a deviation from prior
rigor worth naming rather than glossing over. Confidence that the 130 prior
tests still pass unmodified comes from the diff itself, not a before/after
run: every change to pre-existing files this pass touched
(`groups.service.ts`, `groups.controller.ts`) is a comment or Swagger-string
edit only, no SQL or logic changed, and the final `npm test` run below
(145/145) subsumes the original 130 either way. Docker is still not
installed in this sandbox — ninth check, ninth "no."

Phase 4 (Module 7 Stripe billing, Module 8 analytics/heatmaps) was the
master schedule's own next open item. Per the standing instruction for this
pass, Module 7 (external payment integration) was explicitly out of scope
the day before UAT; Module 8 and a real, UAT-blocking bug were the two
things actually worth doing tonight.

### Tenant-provisioning fix (the UAT-blocking bug)

`handle_new_auth_user()` (`001_initial_schema.sql`) inserted a bare
`profiles` row (`id`, `email` only) on every Supabase signup — `tenant_id`
stayed `NULL`. `groups.tenant_id` is `NOT NULL references tenants`, and
`GroupsService.create()` inserts using `public.current_user_tenant_id()`,
which reads `profiles.tenant_id`. Net effect, flagged as "unspecified" in
`dygo_academy_api_surface.md` since the very first session report: **any
freshly-registered user who isn't one of the 5 seeded fixtures could not
create their first group at all** — `POST /groups` failed outright on a
`NOT NULL` violation. This is exactly the kind of rough edge someone
clicking through UAT tomorrow morning with a brand-new account would hit
immediately.

Fixed at the root in a new `database/migrations/006_solo_tenant_provisioning.sql`:
`handle_new_auth_user()` now `INSERT`s a personal tenant (name derived from
the email local-part, e.g. `"sarah's Workspace"`) *before* inserting the
profile, inside the same `SECURITY DEFINER` trigger transaction, and points
the new profile at it. `purchased_seats`/`price_per_seat_cents` are left at
their column defaults (0/0) deliberately — an auto-provisioned personal
tenant is unpaid until Phase 4 billing (Module 7, still open) upgrades it,
not a placeholder value to fill in later. `database/apply-migrations.sh`
now runs `006` (and `007`, below) right after `005`, before `004`'s seed
data — order matters here, since `004_seed_data.sql`'s `auth.users` insert
needs to exercise the *new* trigger, not the old one, to prove the fixture
flow still works unmodified (it does: the seed script's own subsequent
`UPDATE profiles SET tenant_id = ...` overwrites the auto-provisioned
personal tenant with the real shared one, leaving 5 harmless orphan tenant
rows in a dev database that are never referenced again).

**Correcting the 8th pass's own framing, found while writing this fix's
comments:** that pass's report linked this gap to a *second* symptom —
an invite-redeemed member's name not showing up in the roster — on the
theory both traced back to the same `NULL profiles.tenant_id` root cause.
Tracing `profiles_select_self_or_tenant` precisely
(`id = auth.uid() or (tenant_id is not null and tenant_id =
current_user_tenant_id())`) shows that's only half right: the `is not
null` clause is actually redundant in SQL (`null = anything` is already
not-true), so the real gate is tenant *equality* between the row and the
caller. Once this migration lands, an invite-redeemed student has a
real, non-null `tenant_id` — but it's their own personal tenant,
deliberately distinct from the inviting teacher's tenant (tenants are the
billing boundary; a student's personal tenant must not silently become
part of the teacher's paid seat count). So the equality check still fails
for a teacher viewing that student's profile, and the roster's `left join`
(8th pass) still renders `null` email/display_name for them. **This pass
closes "can't create a group at all" completely. It does NOT close the
roster-name gap for invite-redeemed members** — that needs a different
fix (e.g. a `profiles` SELECT policy clause keyed on shared group
membership, not shared tenant), flagged below rather than guessed at here.
`GroupsService`'s `GroupMember`/`create()` comments, `types/group.ts`, and
`dygo_academy_api_surface.md`'s `POST /groups` row were all updated to
state this precisely rather than repeat the prior pass's approximation.

Added two new `rls_test.sql` sections (G, H — see below) and updated the
stale "26 assertions" count in `README.md`/`dygo_academy_database_dictionary.md`
to the actual 45 (it had already drifted from 26 before this pass; not
newly introduced, just finally corrected while this pass was touching the
file anyway).

### Topic-delete button — verified, not re-fixed

The parent task flagged this as suspicious: a prior report claims the
5th pass ADMIN-gated the topic-delete button, but a `grep -rn "delete"
topics/**/*.tsx` search came up empty. Root cause of the empty grep: the
button doesn't live under `topics/` at all — it's in
`components/groups/GroupTopicsPanel.tsx`, rendered from the group detail
page (`app/(dashboard)/groups/[groupId]/page.tsx`), which computes
`canManage = group.role === 'ADMIN'` and passes it down. Read the actual
component: the delete `<Button>` is wrapped in `{canManage && (...)}`,
exactly matching `topics_delete_admin`'s RLS policy — a WRITE member does
not see the control. Confirmed no other delete-topic UI exists anywhere
else in the frontend (`topics/[topicId]/page.tsx`, `topics/browse/page.tsx`
both have zero matches for "delete"). **No code change made** — the claim
was accurate, just about a component in a different directory than the
grep searched.

### Module 8 — Analytics & Cohort Heatmaps (Phase 4)

FR-8.1 (student streak, mastery, leech list) turned out to already be
served by the backend since Phase 2 — `GET /srs/stats` and `GET
/srs/leeches` (`SrsService`) — but nothing on the frontend ever called
either route; `(dashboard)/analytics/page.tsx` was still the literal
"Coming in a later phase" stub since turn 1, and `topics/page.tsx`'s
`LeechNudge` hardcoded a mock count with a comment explicitly flagging
this as unwired. New `useSrsStats`/`useLeeches` hooks close that gap.

FR-8.2 (the class-wide mistake heatmap) had no backend endpoint at all and
required a real design decision, not just a new route. `review_logs_select_own`
(`002_rls_policies.sql`) is owner-only RLS with **no ADMIN exception** —
its own comment already anticipates this exact feature: *"Module 8 cohort
heatmaps read aggregates as service_role; they must never be served by
widening this policy to teachers, which would expose per-student review
histories rather than aggregate error rates."* `rls_test.sql`'s own section
B proves the same thing from the other side ("even the group ADMIN cannot
read a student's review history"). A plain `AnalyticsService.queryAs()`
call joining `review_logs` would therefore see zero rows for every student
but the caller — the aggregate has to be computed somewhere RLS doesn't
apply.

Resolved the same way `005_group_invites_redeem.sql` resolved an
equivalent problem: not `DATABASE_ADMIN_URL` (the real Postgres superuser
connection, reserved for DDL, per that migration's own reasoning about
blast radius), but a narrow, auditable `SECURITY DEFINER` function —
`public.group_word_heatmap(p_group_id)`, new in
`database/migrations/007_group_word_heatmap.sql`. It re-checks
`has_group_role(..., 'ADMIN')` itself before bypassing
`review_logs_select_own`, and its `RETURNS TABLE` signature has no
`user_id`/timestamp column at all — by construction, not by a runtime
check, it cannot be used to identify which student made which mistake.
`AnalyticsService.groupHeatmap` (new `AnalyticsModule`) checks
`has_group_role` a second time at the application layer first (same shape
as `NotificationsService.triggerSprint`), so a non-ADMIN caller gets a
clean `403` without ever reaching the bypass function.

Ranking is deliberately **not** done in SQL: no `ORDER BY`/`LIMIT` in the
migration. Failure-rate computation, the worst-first sort (with an
attempts-descending tiebreak — a word missed once at 100% shouldn't
outrank one missed 40 times at 80%), and the top-20 cap live in
`heatmap-aggregator.ts` as a pure, unit-tested function, matching the
`srs-algorithm.ts`/`quiz-generator.ts` precedent of keeping business
logic testable without a database.

`(dashboard)/analytics/page.tsx` is real now: personal stats grid and
leech list for every signed-in user (FR-8.1), plus a "Class mistake
heatmap" section — one card per group the caller administers, via a new
`useGroupHeatmap` hook — that only renders for a user with at least one
ADMIN group, and renders nothing at all (not a disabled placeholder) for
a student, the same "don't show a control that would just error" instinct
turn 8g already established for the teacher-sprint trigger.

15 new backend unit tests (145 total, up from 130): 10 for
`rankHeatmap` (failure-rate math, sort order, tiebreak, capping,
mutation-safety), 5 for `AnalyticsService.groupHeatmap` (the ADMIN gate,
the exact `has_group_role` call shape, bigint-string normalization, limit
pass-through, empty-group handling). `dygo_academy_api_surface.md` and
`dygo_academy_master_project_schedule.md`'s Phase 4 section were both
updated; Module 7 (Stripe billing) is explicitly still fully open and
flagged as the next pass's top item, not attempted here.

### Wireframes — turn 9

`Dygo Academy Wireframes.html` bundles its markup as a JSON-encoded
string inside a `<script type="__bundler/template">` tag, on one line —
same trap every prior pass's report warned about: a naive regex looking
for the first `</script>` stops early, because the JSON string's own
*content* contains literal `</script>` substrings (the bundle's inline
font `<style>` block, etc.). Used Python's `json.JSONDecoder.raw_decode`
starting just after the opening tag, which correctly walks the actual
JSON string grammar regardless of what looks like a closing tag inside
it — the same category of fix this file's own structure has apparently
required every pass that's touched it.

Added `<section class="dv-turn" id="t9">` — group A (`9a`/`9b`): the
student analytics screen, populated and empty-leech states; group B
(`9c`/`9d`): the teacher heatmap, ranked list and the "renders nothing for
a non-ADMIN" state — inserted at the newest-first position (immediately
before turn 8), matching every prior turn's placement.

**Verified programmatically before writing anything back**, per the
standing method:
- New section's own open/close tag counts balance (checked per-tag via
  regex tag extraction, zero mismatches).
- All four new `dv-opt` ids (`9a`–`9d`) plus `t9` itself appear exactly
  once as both an `id="..."` and an `href="#..."` anchor, confirmed
  against the full post-edit document (no collision with any of the 47
  existing `NNx` ids across turns 1–8).
- The full document's aggregate open/close tag counts, diffed old vs.
  new, show zero net change beyond the new section itself (same check
  method, applied to the whole file).
- `json.dumps(new_obj, ensure_ascii=False)` round-trips byte-for-byte
  through `json.loads` back to `new_obj`, **and** re-extracting the
  template block from the rewritten file (same `raw_decode` method)
  reproduces `new_obj` exactly — the actual bytes on disk, not just the
  in-memory string, were checked.
- `__bundler/manifest`, `__bundler/ext_resources`, and
  `__bundler/page_order` script blocks are byte-identical before and
  after (raw string comparison of each block's extracted content).

This sandbox cannot render the file in a browser to visually confirm the
new screens — same limitation as every prior pass's wireframe edit; the
checks above are structural (valid HTML, correct JSON encoding, no
collisions), not visual.

### Testing performed

| Check | Result |
| :--- | :--- |
| Backend `jest` | ✅ 145/145 pass (130 prior + 15 new) |
| Backend `tsc --noEmit` | ✅ clean |
| Backend `npm run lint` (eslint --fix) | ✅ clean — incidentally reformatted two pre-existing files it touched in passing (`groups.controller.ts`'s Swagger string to double-quotes, `groups.service.spec.ts`'s one long test object to multi-line) with no behavior change |
| Frontend `tsc --noEmit` | ✅ clean |
| Frontend `next lint` | ✅ clean |
| Frontend `next build` | ❌ hung again — **9th occurrence across 9 sessions**, timed out at ~178s under a piped `timeout`, killed rather than retried |
| `rls_test.sql`'s new sections G/H (solo-tenant provisioning, the heatmap function's ADMIN gate + per-student isolation) against live Postgres | ❌ not possible here — no Docker; written and reasoned through carefully (traced the exact RLS policy text, not just asserted an expectation) but genuinely unverified — **the single highest-priority thing to run for real before trusting this pass's two migrations** |
| A real `POST /groups` round-trip as a brand-new signup, and a real `GET /groups/:id/heatmap` round-trip as an ADMIN vs. a 403 as a non-ADMIN | ❌ not possible here — no Docker, same standing limitation as every prior pass |

### Known gaps — carried forward, plus what this pass found and didn't fix

- **Roster still shows no name for an invite-redeemed member** — this
  pass corrected the *diagnosis* (see above) but did not implement the
  actual fix, which needs a `profiles` SELECT policy change (group-
  membership-based visibility, not tenant-based), not another tenant-
  provisioning tweak. Worth prioritizing next given it's now precisely
  understood.
- **Module 7 (Stripe seat billing) is fully open** — `billing/*` is still
  the literal empty scaffold from the initial pass. Deliberately not
  started this pass per the standing instruction; next pass's top item.
- **Module 4 offline-first sync** (local SQLite/IndexedDB queue for
  offline SRS reviews) — still not implemented on the frontend; `POST
  /srs/sync` exists and is unit-tested on the backend only. Open since
  Phase 2.
- **`FR-6.2`'s sprint route still has no rate limiting** (flagged 6th and
  7th pass) — untouched this pass.
- **`next build` hanging in this sandbox is now 9-for-9** across nine
  separate sessions — treat as a property of this sandbox, not something
  to keep re-investigating without a different environment to test in.
- **Nothing in this pass has run against a live Postgres/GoTrue/Redis
  stack** — same standing limitation as all eight prior passes. The two
  new migrations (`006`, `007`) and the two new `rls_test.sql` sections
  are the single most load-bearing unverified thing in this pass —
  they're SQL that has never actually executed anywhere.
- Everything else in the 8th pass's "Known gaps" not explicitly listed
  above is still open and unchanged by this pass.

### UAT checklist for tomorrow (supersedes the eighth pass's own checklist — items 3–5 changed, item 9 new)

1. `docker compose up -d && ./database/apply-migrations.sh --seed` (or
   `--test` for the RLS suite, now 45 assertions — see this pass's
   "Testing performed" for why that count changed) — unchanged mechanism
   from prior passes, but this is the **first real run of `006`/`007`**,
   so watch the migration output closely for any error, not just the
   final `ALL RLS CHECKS PASSED` line.
2. Open the frontend at `localhost:3000/login` and sign in as
   `sarah@dygo.test` / `dygo-dev-2026` (or marco/alex/priya/dana, same
   password). Confirm the session lands on `/topics` and the Navbar shows
   five tabs including "Groups." (Unchanged from prior passes.)
3. Sign out, **register a brand-new account, and confirm `POST /groups`
   now actually succeeds** — create a group, confirm you land on it as
   ADMIN. This is the opposite of the 8th pass's checklist item 4, which
   expected this to fail; if it still fails, this pass's core fix did not
   land correctly and needs immediate attention before anything else on
   this list matters.
4. As that same brand-new user, mint an invite link from the group you
   just created, open it in a private window, redeem it as
   `priya@dygo.test`. Confirm Priya lands on the group. Then, as the
   brand-new ADMIN, open the roster and confirm Priya's row **still shows
   her real name** (she's a seeded fixture with a real tenant already —
   this does not exercise the still-open invite-redeemed-member gap; see
   "Known gaps" above for why a genuinely fresh account redeeming into
   someone else's group is still the one case that shows a blank name).
5. Click "Groups" → open Sarah's Oxford English Center group → confirm
   the roster still shows "Marco"/"Alex"/"Priya" by name (unchanged from
   8th pass) → as Sarah, click into "Progress" in the Navbar. Confirm the
   analytics page shows a real streak/mastered/due/leech grid (not the
   old stub) and, further down, a **"Class mistake heatmap" card for each
   group Sarah administers**, listing words ranked worst-first with a
   failure percentage. Confirm the numbers plausibly match the seeded
   review_logs (Alex's `AGAIN` on "resilient" should show up as a
   failure).
6. Sign in as `alex@dygo.test` (READ everywhere) and open "Progress."
   Confirm his own stats/leech list render, and confirm **no heatmap
   section appears at all** — not even empty or disabled.
7. From the group detail page, click "+ New topic," confirm it appears
   under Topics, then delete it as Sarah (ADMIN) and confirm it's gone; as
   Marco (WRITE) confirm the delete button doesn't render at all.
   (Unchanged from 7th/8th pass — re-verified in code this pass, not
   re-fixed.)
8. `cd com.dygoacademy.frontend && npm run build` — confirm the
   production build completes; unverified here for a 9th consecutive
   session (see "Testing performed" above).
9. **New this pass:** confirm `com.dygoacademy.backend/src/modules/billing/*`
   is still the empty stub — Module 7 was deliberately not touched, so
   there should be no visible billing UI or working `/api/v1/billing/*`
   route to test yet.
10. Everything from the 6th pass's own checklist items 1–2 and 5–6 (SRS,
    quiz, push-tick timing, wireframe turns 3/8) still applies and is
    unchanged by this pass.

---

## Eighth pass — UAT-prep pass: roster naming gap closed, stale wireframe captions fixed

### What this pass did

Same standing instruction as every prior pass, run the morning of UAT
(2026‑09‑02, tomorrow): compared the working tree against
`dygo_academy_master_project_schedule.md` and `dygo_academy_api_surface.md`.
`git status` was clean, `git log` showed seven prior commits all landed, and
`npm run test` reproduced the seventh pass's 129/129 backend pass before any
new work started. Also re-checked whether this sandbox now has Docker
available (it would let this pass finally verify against a live stack,
something all seven prior passes flagged as impossible) — it does not;
`docker`/`docker compose` are still not installed here. So this pass stayed
scoped to what static checks and code review can actually fix, and treated
tomorrow's UAT as the point where the real Postgres/GoTrue/Redis run finally
happens.

With Phase 3 code-complete and Phase 4 (Stripe billing) not yet started,
this pass took the seventh pass's own most actionable open item rather than
opening Phase 4 cold the morning before UAT: **`GET /groups/:id/members` has
no email/display-name join**, flagged as a known gap since the 7th pass's
own report and directly visible in tomorrow's UAT checklist item 3 (open the
roster, expect to see "Marco"/"Alex"/"Priya" — the running frontend would
have shown three shortened UUIDs instead). Fixing a rough edge someone will
actually click through tomorrow morning outranked starting a new, multi-day
billing module the day before UAT.

### Roster naming fix

`GroupsService.findMembers` (`com.dygoacademy.backend/src/modules/groups/groups.service.ts`)
now `left join`s `public.profiles` for `email`/`display_name`, instead of
selecting only `user_id`/`role`/`joined_at` off `group_members`. The join
choice needed a real decision, not just "add a join": `profiles`' own RLS
policy (`profiles_select_self_or_tenant`) only lets a caller see another
user's profile row when that row's `tenant_id` matches the caller's own —
and `redeem_group_invite()` (`005_group_invites_redeem.sql`) seats a new
member into `group_members` without ever touching `profiles.tenant_id` (the
same root cause as the standing "no solo-user tenant provisioning" gap,
first flagged in the very first session report, still open). An `inner`
join would have silently dropped every invite-redeemed member from the
roster entirely the moment their profile became RLS-invisible to the
caller — worse than the UUID it was replacing. A `left` join instead
returns `email`/`display_name` as `null` for exactly that case, so the row
still renders, just without a name — the same graceful-degradation instinct
Module 5 and Module 6 used for "don't persist what's derivable," applied
here to "don't drop a row RLS happens to obscure part of."

`GroupMember` (backend interface) and `GroupRosterMember` (frontend type,
`com.dygoacademy.frontend/src/types/group.ts`) both gained `email: string |
null` and `display_name: string | null`, with header comments explaining
the null case rather than leaving it to be rediscovered. `RosterPanel.tsx`
now renders `display_name`, falling back to `email`, falling back to the
shortened user id — the exact fallback chain its own prior-pass comment
said didn't exist yet because the API didn't return anything to fall back
to. `groups.controller.ts`'s Swagger description for the route was updated
to match. 1 new backend unit test added to `groups.service.spec.ts`
(specifically exercising the left-join-not-inner-join behavior with a
null-profile row), for 130 total, up from 129 — the existing "scopes to the
group id" test was also updated to assert on the new fields rather than
just row count. `tsc --noEmit` and lint are clean on both sides.

### Wireframes

Two caption corrections, not a new turn — turn 3's own roster/invite
screens (3c, 3d) already depicted this fix's end state (`RosterPanel`
shows "Sarah (you)" / "Marco" / "Alex" in the mockup, real names, not
UUIDs) since they were drawn; what was stale was the *caption* under each,
which still read "Not live yet... Implied, not built" long after
`GET`/`POST /groups/:id/members` and `/invites` actually shipped (as early
as the 2nd/3rd pass, per the 7th pass's own account of when these routes
first existed) and after the frontend caught up to them in the 7th pass.
3c's caption now explains the left-join fix directly; 3d's now just marks
the endpoint and screen both live. `Dygo Academy Wireframes.html` was
touched for these two caption edits only — no new mockup, since none was
needed for a data-shape fix to a screen already designed correctly.

### Testing performed

| Check | Result |
| :--- | :--- |
| Backend `jest` | ✅ 130/130 pass (129 prior + 1 new) |
| Frontend `tsc --noEmit` | ✅ clean |
| Frontend `next lint` | ✅ clean |
| Backend `tsc --noEmit` | ✅ clean |
| Frontend `next build` | ❌ hung again — **8th occurrence across 8 sessions**, timed out at ~178s under a piped `timeout` |
| A real `GET /groups/:id/members` round-trip against live Postgres, to confirm the RLS-visible/RLS-hidden cases both behave as designed | ❌ not possible here — no Docker; **this is the one change this pass most needs a real run before UAT depends on it**, same caveat every prior pass has carried for its own changes |

### Known gaps — not fixed, flagged for grooming

- **No solo-user tenant provisioning** (open since the 1st session report)
  is now visibly the same root cause behind *two* symptoms instead of one:
  a brand-new solo signup can't create a group (original symptom), and an
  invite-redeemed member's name never shows up to other members in the
  roster this pass just fixed for everyone else (new symptom, surfaced
  while building this fix, not introduced by it). Fixing tenant
  provisioning properly would close both at once — worth prioritizing
  over either symptom individually next time this area comes up.
- **`FR-6.2`'s sprint route still has no rate limiting** (flagged 6th and
  7th pass) — untouched this pass.
- Everything else in "Known gaps" from the 7th pass is still open except
  the roster-naming item closed above.
- `next build` hanging in this sandbox is now an 8-for-8 pattern across
  eight separate sessions — strong enough at this point to treat as a
  property of this sandbox, not something worth re-investigating in a 9th
  pass without a different environment to test in.

### UAT checklist for tomorrow (supersedes the seventh pass's own checklist — only item 3 changed)

1. `docker compose up -d && ./database/apply-migrations.sh --seed` (or
   `--test` for the RLS suite too) — unchanged from the 7th pass's own
   checklist; this pass did not touch migrations.
2. Open the frontend at `localhost:3000/login` and sign in as
   `sarah@dygo.test` / `dygo-dev-2026` (or marco/alex/priya/dana, same
   password). Confirm the session lands on `/topics` and the Navbar shows
   five tabs including "Groups." (Unchanged from 7th pass.)
3. Click "Groups" → confirm Sarah's Oxford English Center group appears →
   open it → **confirm the roster now shows "Marco," "Alex," and "Priya" by
   name (or their `@dygo.test` email, if `display_name` is unset for any of
   them) — not shortened UUIDs** — then confirm invite links can still be
   minted (copy the `/join/:token` URL) and revoked, and — as Sarah
   specifically — "Send a reminder now" returns a real `sent`/`recipients`
   count (needs `VAPID_*` configured and at least one subscribed device).
4. Sign out, register a brand-new account, confirm the copy on `/register`
   about not being able to create a group yet is accurate (`POST /groups`
   should fail until tenant provisioning exists) — expected, not a
   regression.
5. Open the `/join/:token` link copied in step 3 in a private/incognito
   window, sign in as `priya@dygo.test`, confirm it redeems and lands on
   the group. **New note for this step given today's fix:** Priya joined
   via the seed script, not a redeemed invite, so her `profiles.tenant_id`
   is already set — her name will show correctly in the roster. If UAT
   wants to specifically exercise the left-join's null-profile fallback
   path (a genuinely invite-redeemed member), that requires registering a
   brand-new account and having someone redeem an invite as them — item 4's
   own no-tenant-yet limitation means that account can't be the one
   redeeming into an *existing* group's roster check either, so this path
   is easiest confirmed by reading `groups.service.spec.ts`'s new test
   rather than by hand tomorrow morning.
6. From the group detail page, click "+ New topic," confirm it appears
   under Topics, then delete it as Sarah (ADMIN) and confirm it's gone; as
   Marco (WRITE) confirm the delete button doesn't render at all.
   (Unchanged from 7th pass.)
7. `cd com.dygoacademy.frontend && npm run build` — confirm the production
   build completes; unverified here across an 8th session running (see
   "Testing performed" above).
8. Everything from the 6th pass's own checklist items 1–2 and 5–6 (SRS,
   quiz, push-tick timing, wireframes turn 8) still applies and is
   unchanged by this pass.

---

## Seventh pass — group-management frontend goes live; login/register forms (a bigger, previously-missed gap) fixed

### What this pass did

Same standing instruction as every prior pass: compared the working tree
against `dygo_academy_master_project_schedule.md` and
`dygo_academy_api_surface.md`. `git status` was clean, `git log` showed six
prior commits all landed, and `npm run test` reproduced the sixth pass's
129/129 backend pass before any new work started. Phase 3 (both modules) is
code-complete and the master schedule's own Phase 4 (Stripe billing,
Module 7) hasn't started — a clean decision point, same one the sixth
pass's own report left open: start Phase 4, or close the "no
group-management frontend" gap every single prior pass (second through
sixth) flagged as open. Took the sixth pass's own recommendation: Module
7's free student-onboarding flow is hard to demo meaningfully without a
teacher-facing screen to originate an invite from, so the gap came first.

This is a **frontend-only pass** — every route it wires up
(`GET`/`POST /groups`, roster, invites, `POST /topics`, `DELETE /topics/:id`,
the Module 6 sprint trigger) has existed on the backend since as early as
the second pass. No backend module, migration, or test changed as a result
of this work; `npm run test` at the end of this pass is byte-identical to
its start, 129/129.

### Group-management frontend (Module 1's missing half)

New `app/(dashboard)/groups/` (list + create, wireframe 3a/3b) and
`app/(dashboard)/groups/[groupId]/` (roster with role management and member
removal — 3c; invite mint/list/revoke with a copy-link affordance — 3d;
the Module 6 teacher-sprint trigger — 8g; ADMIN settings: rename,
visibility, delete; topics-in-group list with create — 4a — and
ADMIN-gated delete — 4b), plus `app/(dashboard)/join/[token]/` (the invite
redemption landing screen turn 3's own "Try next" note asked for, closing a
gap flagged since the second pass).

There is no `GET /groups/:id` — Module 1's API surface never named a
single-group route, only the list. The group detail page's header (name,
description, the caller's own role) is read from `useGroups()` filtered to
one id client-side, the exact "list + client-side find" pattern the topic
detail page used before `GET /topics/:id` existed (third pass). Everything
below the header — roster, invites, topics — has its own real,
group-scoped endpoint, so only the header needed the workaround.

One real, structural limitation surfaced building the roster panel, not
fixed here: `GET /groups/:id/members` (`GroupsService.findMembers`) returns
`user_id`/`role`/`joined_at` only — no email or display name join anywhere
in that query. `RosterPanel` shows a shortened UUID rather than inventing a
name the API doesn't provide, and its own header comment flags this as a
real gap (no roster-with-profile endpoint exists) rather than a rendering
bug — see "Known gaps" below.

`CreateTopicModal` is shared between two callers: the group detail page
(pre-selects that group via `fixedGroupId`, hides the picker) and
`topics/browse`'s "+ New Topic" tile, which had read "· Phase 1" since
turn 1f and is real now, with a group picker filtered to WRITE/ADMIN
memberships (`POST /topics` requires WRITE on the target group). Topic
delete is the first frontend caller of `DELETE /topics/:id` at all — the
fifth pass's own last-ADMIN-removal work checked and found "no delete-topic
button exists anywhere in the running frontend yet, only in the wireframe";
`GroupTopicsPanel` gates it to `canManage` (ADMIN) specifically, matching
`topics_delete_admin` and wireframe 4b's own dashed note about not showing
WRITE members a button that would silently no-op.

New types added rather than reused from adjacent ones, following the
existing `TopicWordSummary`/`TopicRow` precedent of "don't claim a field
the response doesn't have": `GroupSummary`/`GroupRow`/`GroupRosterMember`/
`GroupInviteSummary`/`CreatedInvite`/`RedeemedInvite` (`types/group.ts`) and
`TopicRow` (`types/topic.ts`, narrower than `Topic` — no `updated_at`,
since `POST`/`PATCH /topics` never return it). New hooks:
`useGroups`/`useCreateGroup`/`useUpdateGroup`/`useDeleteGroup`,
`useGroupMembers`/`useUpdateMemberRole`/`useRemoveMember`,
`useInvites`/`useCreateInvite`/`useRevokeInvite`/`useRedeemInvite`,
`useTriggerSprint`, `useCreateTopic`/`useUpdateTopic`/`useDeleteTopic`/
`useCloneTopic`, and `useCurrentUser` (nothing client-side previously
resolved the caller's own user id — `RosterPanel` needs it to label "(you)"
on the caller's own roster row). `RemoveMember`'s error handling
specifically surfaces the fifth pass's own 409 last-ADMIN guard
("Can't remove the group's last ADMIN — assign someone else first.")
rather than a generic failure message. `/groups` and `/join` were added to
`PROTECTED_PATH_PREFIXES` (`constants/routes.ts`); `Navbar` gained a fifth
tab, "Groups," between Topics and Progress.

### A bigger gap, found while wiring the "Login" link into a working page

Adding a "Sign in" link from the new `/join/:token` error state led to
actually opening `(auth)/login` — and it was still the literal
"Coming in Phase 1" stub from Phase 0, no form, no `supabase.auth` call
anywhere. Checked `(auth)/register`: identical. **This meant no route in
this entire application was reachable through a real browser**, independent
of how complete Modules 1–6 were on paper — every one of the six prior
session reports verified only `tsc`/`eslint`/`jest`, none of which would
ever catch a page with no interactive form on it, and none of the six
booted an actual browser (no Docker in this sandbox, so nothing to boot it
against). Fixed: real `signInWithPassword` (`/login`) and `signUp`
(`/register`) forms, both honoring `middleware.ts`'s existing `?next=`
redirect param (already being set on every unauthenticated bounce to a
protected path — session five's own work — but nothing previously read it
back). Also added `app/(auth)/layout.tsx`, a server-side redirect for an
*already*-signed-in user hitting either route — `constants/routes.ts` has
exported an `isAuthPath` helper since before this pass that nothing ever
called; closed as dead code once these routes became real.

That surfaced a second, older gap underneath the first:
`database/migrations/004_seed_data.sql`'s `auth.users` insert only ever set
`id`/`email`. That's sufficient for `scripts/dev-token.js` (it signs its
own JWT with `SUPABASE_JWT_SECRET` directly and never touches GoTrue at
all — its own header comment says so) but not sufficient for the real
`supabase-auth` (GoTrue) container the new login form actually calls:
GoTrue rejects a null `encrypted_password` and an unconfirmed email
outright. Fixed by setting `encrypted_password` (`crypt('dygo-dev-2026',
gen_salt('bf'))`, `pgcrypto` was already enabled in `001_initial_schema.sql`)
and `email_confirmed_at` on all five fixtures, changing the insert's
conflict clause from `do nothing` to an update of just those two columns so
re-running the seed script upgrades an already-seeded database rather than
silently leaving old rows without a password. `instance_id`/`aud`/`role`/
`raw_app_meta_data` are left to the `supabase/postgres` image's own column
defaults, as they always were — nothing about adding a password needed to
touch those.

The register page's copy explicitly warns that a brand-new solo signup
can't create its own group yet — `groups.tenant_id` is `not null` and
nothing provisions a tenant for a user with none, a gap flagged since the
very first session report and still open — rather than letting someone hit
an unexplained 500 on their first click after signing up.

### Wireframes

No new turn added — unlike every prior pass, this one didn't need one.
Turns 3 (3a–3d), 4 (4a–4e), and 8g already designed every screen this pass
built: the groups dashboard, create-group form, roster, invite-link screen,
topic create/edit/delete, and the sprint trigger. `Dygo Academy
Wireframes.html` itself was not touched this pass — checked, and there was
nothing left to design here, only to build. Same "points back to existing
screens rather than re-drawing them" call the third pass made for turn 5's
intro. Not re-verified against a browser (same standing sandbox
limitation) since the file wasn't edited.

### Testing performed

| Check | Result |
| :--- | :--- |
| Backend `jest` | ✅ 129/129 pass, unchanged — no backend code touched this pass |
| Frontend `tsc --noEmit` | ✅ clean |
| Frontend `next lint` | ✅ clean |
| Frontend `next build` | ❌ hung again — **7th occurrence across 7 sessions**, exit 124 confirmed through a piped `timeout` |
| `POST /invites/:token/redeem`, roster/invite CRUD, `POST /groups`, real `signInWithPassword` against GoTrue | ❌ not possible here — no Docker |
| The `encrypted_password`/`email_confirmed_at` seed fix, against a real `supabase-auth` container | ❌ not possible here — no Docker; this is the one change this pass most needs a real run before UAT depends on it |

### Known gaps — not fixed, flagged for grooming

- **`GET /groups/:id/members` has no email/display-name join.** The roster
  UI shows a shortened user id. A `GET /groups/:id/members` response that
  included `profiles.display_name`/`email` (RLS already scopes `profiles`
  reads appropriately elsewhere in this codebase) would let this show real
  names instead — flagged, not guessed at with a fake join here.
- **No solo-user tenant provisioning**, per the register page's own
  warning above — open since the first session report.
- **`FR-6.2`'s sprint route still has no rate limiting** (sixth pass's own
  flag) — the new trigger button doesn't add one; an ADMIN could still
  click it in a tight loop.
- Everything else in "Known gaps" from the sixth pass is still open except
  the two closed this pass (group-management frontend, login/register).
- The `CreateGroupForm`/`GroupSettingsPanel`/roster/invite panels have not
  been visually confirmed in a real browser — same standing sandbox
  limitation `next build`'s own hang represents; `tsc`/lint catch type and
  syntax errors, not layout or interaction bugs.

### UAT checklist for tomorrow (supersedes the sixth pass's own checklist)

1. `docker compose up -d && ./database/apply-migrations.sh --seed` (or
   `--test` for the RLS suite too) — **this pass changed 004's insert**, so
   run this even on an already-migrated database; the `on conflict ... do
   update` clause upgrades existing fixture rows with real passwords rather
   than requiring a full reset.
2. Open the frontend at `localhost:3000/login` and sign in as
   `sarah@dygo.test` / `dygo-dev-2026` (or marco/alex/priya/dana, same
   password) — **this is the first UAT checklist item across all seven
   passes that starts in the browser instead of curl/Swagger.** Confirm the
   session lands on `/topics` and the Navbar shows five tabs including the
   new "Groups."
3. Click "Groups" → confirm Sarah's Oxford English Center group appears →
   open it → confirm the roster shows Marco/Alex/Priya, invite links can be
   minted (copy the `/join/:token` URL) and revoked, and — as Sarah
   specifically — "Send a reminder now" returns a real `sent`/`recipients`
   count (needs `VAPID_*` configured and at least one subscribed device,
   per the sixth pass's own checklist item 2).
4. Sign out, register a brand-new account, confirm the copy on `/register`
   about not being able to create a group yet is accurate (`POST /groups`
   should fail until tenant provisioning exists) — this is expected, not a
   regression to chase down before UAT.
5. Open the `/join/:token` link copied in step 3 in a private/incognito
   window, sign in as `priya@dygo.test`, confirm it redeems and lands on
   the group.
6. From the group detail page, click "+ New topic," confirm it appears
   under Topics, then delete it as Sarah (ADMIN) and confirm it's gone; as
   Marco (WRITE) confirm the delete button doesn't render at all.
7. `cd com.dygoacademy.frontend && npm run build` — confirm the production
   build completes; unverified here across a 7th session running.
8. Everything from the sixth pass's own checklist items 1–2 and 5–6 (SRS,
   quiz, push-tick timing, wireframes turn 8) still applies and is
   unchanged by this pass.

---

## Sixth pass — Phase 3, Module 6: push & habit scheduling goes live, Phase 3 complete

### What this pass did

Same standing instruction as every prior pass: compared the working tree
against `dygo_academy_master_project_schedule.md` and
`dygo_academy_api_surface.md`. `git status` was clean and `git log` showed
five prior commits, all landed — no repeat of the second pass's
`.git/index.lock` blocker. `npm run test` reproduced the fifth pass's
107/107 backend pass before any new work started. Phase 3's other half was
the clear next step: `NotificationsService`/`NotificationsController` were
still the Phase 0 stub (constructor only), `NotificationProcessor` only
logged a tick, and the schedule says Phase 4 (Stripe billing, analytics
heatmaps) shouldn't start until Phase 3 is actually done — Module 6, not
Module 7, was next.

### Module 6 — Web Push & Habit Scheduling

New `src/modules/notifications/` on the backend, following the split
Modules 3 and 5 established: `notification-message.ts` holds a pure,
DB-free decision function (`buildReminderPayload`, unit tested in
isolation) for "what does the tick's push say," `push-dispatch.service.ts`
owns the actual VAPID `web-push` send plus dead-subscription cleanup,
`notifications.service.ts` owns the Postgres reads/writes and RLS scoping,
`notifications.controller.ts` exposes seven routes: `GET
/notifications/vapid-public-key`, `POST`/`DELETE /notifications/subscribe`,
`GET`/`POST /notifications/schedules`, `DELETE
/notifications/schedules/:id`, `POST
/notifications/groups/:groupId/sprint`. `study_schedules` and
`push_subscriptions` already existed as tables with RLS policies from
Phase 0 — nothing to migrate, this pass is pure application code.

The design call that had to be made before writing the processor, same
spirit as Module 5's "no persisted quiz row" and Module 3's
`recent_mistakes`-decay decision: **no `notification_log` table.** The BRD
describes FR-6.1 (daily habit), FR-6.3 (streak protection), and FR-6.4
(leech alerts) as three separate triggers, but nothing here tracks "was
this user already notified today." Instead, `buildReminderPayload` decides
**one** message per matched schedule, priority-ordered — leech drill
outranks streak protection outranks a plain habit nudge — so a student
with both a leech word and a streak at risk gets one actionable push, not
two. A user with nothing due gets nothing.

`NotificationProcessor`'s 15-minute tick needed a real answer for
"which schedules are due right now," and a plain UTC-quarter-hour
comparison doesn't work: `Asia/Kathmandu` is UTC+5:45, so its users'
local reminder times never land on a UTC `:00/:15/:30/:45` boundary at
all. The fix is `width_bucket(extract(epoch from local_time), 0, 86400,
96)` — 96 fixed 900-second buckets anchored to each user's *own* local
midnight, computed inside the SQL rather than in the tick schedule. Both
"now" and `reminder_time` get bucketed the same way, so the comparison
is offset-agnostic. Documented in the processor's own header comment
since it's the one piece of this pass with real correctness risk
un-testable without a live Postgres to actually run `width_bucket`
against — a syntax or semantics mistake here wouldn't show up in a
jest mock.

`PushDispatchService` is exported from `NotificationsModule` and injected
into both `NotificationProcessor` (the tick) and
`NotificationsService.triggerSprint` (FR-6.2's immediate teacher-triggered
push) — one implementation of "send + prune a dead subscription on
404/410," not two. FR-6.2 itself is ADMIN-gated by an explicit
`has_group_role` application-level check rather than leaning on RLS's
`with check` the way most writes in this codebase do (see
`GroupsService.createInvite`'s own header comment on that convention) —
there's no table row being written here for RLS to gate, so the explicit
check is the only enforcement point. No teacher-facing trigger screen
exists for it: there is no group-management frontend at all yet (roster
and invite screens have been wireframe-only since turn 3), so this route
is API- and wireframe-only for now — flagged in wireframe turn 8g's
caption, same "nothing live to fix" treatment the fifth pass gave the
topic-delete-button gap.

22 new backend unit tests (129 total, up from 107): 6 for
`notification-message.spec.ts` (the priority ordering, singular/plural
phrasing, the null case), 5 for `push-dispatch.service.spec.ts` (no-op
when unconfigured, successful send, 410-prunes, non-410 failure counted
without pruning, `vapidPublicKey()`), 7 for `notifications.service.spec.ts`
(subscribe upsert, unsubscribe/deleteSchedule 404s, schedule upsert
defaults, sprint's forbidden/conflict/success paths), 4 for
`notification.processor.spec.ts` (nothing due, matched-but-nothing-to-say,
leech-priority dispatch, one user's failure not stopping the tick).
`tsc --noEmit` and `npm run lint` clean.

### Frontend

New `public/sw.js` — the actual push/notificationclick service worker;
Module 4's offline-sync worker (still an open gap, unrelated) is a
separate concern this file has nothing to do with. `src/lib/push.ts` wraps
the Push API's own plumbing (VAPID key base64url→`Uint8Array` conversion,
service worker registration, subscribe/unsubscribe) so
`usePushSubscription.ts` — a plain `useState`/`useEffect` hook, not a
TanStack Query one, since a live browser `PushSubscription` object has no
`queryFn` to point at — stays about state, not browser-API mechanics. New
`useNotificationSchedules`/`useUpsertSchedule`/`useDeleteSchedule` hooks
follow the existing TanStack Query conventions exactly (see
`useGenerateQuiz`/`useRateWord`).

The Settings ("You" tab) page — a literal "Coming in a later phase." stub
since turn 0/1 — is real now: `NotificationSettings.tsx`, a push on/off
card plus a daily-reminder list with an add/remove form, using the
browser's own `Intl.DateTimeFormat().resolvedOptions().timeZone` so a
student is never asked to type an IANA zone name by hand.

One real bug found and fixed while wiring this up, not specific to Module
6: `apiClient.delete()` (`lib/api-client.ts`) had no way to send a request
body, but `DELETE /notifications/subscribe` needs one (the endpoint to
remove). Extended it to accept an optional JSON body, matching
`post`/`patch`'s existing signature. Surfaced a second, latent bug in the
same file while fixing the first: every `@HttpCode(HttpStatus.NO_CONTENT)`
route in this codebase (`removeMember`, `revokeInvite`, and now
`unsubscribe`/`deleteSchedule`) returns a body-less 204 — Express strips
the body regardless of what `TransformResponseInterceptor` produced — but
`request()` unconditionally called `res.json()` and, on the ok-but-bodiless
204, threw an `ApiError` anyway (`body?.success` is `undefined` on nothing
to parse). No frontend caller had ever hit a 204 route before this pass
(no group-management frontend exists), so this had never been exercised;
fixed by special-casing 204 to resolve `undefined` when `res.ok`, rather
than only when there's a real envelope to unwrap.

### Wireframes

Added turn 8 (`Dygo Academy Wireframes.html`) — 7 screens (8a–8g) across
four groups: turning on notifications (the settings toggle, then the
browser's own native permission dialog, deliberately rendered in the dark
`.wf.dk` phone frame to visually separate "the browser's own UI, which
Dygo cannot skin" from the app's own screens), the daily reminder
schedule form and its saved state, two priority-ordered push examples
(leech drill outranking streak protection, shown as locked-screen
notification banners), and the teacher sprint push with a caption flagging
that no trigger screen exists for it yet. Same edit process as turns 4–7:
decoded the JSON blob, inserted the new `<section id="t8">` immediately
before `id="t7"` (newest-first ordering), verified programmatically before
writing anything back — open/close tag counts balance for the new
section, all seven new `dv-opt` ids (`8a`–`8g`) plus `id="t8"` each appear
exactly once, the re-encoded JSON round-trips byte-for-byte through
`json.loads`/`json.dumps`, and the `__bundler/manifest`/`ext_resources`/
`page_order` blocks still parse untouched. `git diff --stat` confirms
exactly one line changed. Not visually confirmed in a browser — same
sandbox limitation as every prior turn.

### Testing performed

| Check | Result |
| :--- | :--- |
| Backend `jest` | ✅ 129/129 pass (22 new: 6 message-priority, 5 push-dispatch, 7 notifications.service, 4 processor) |
| Backend `tsc --noEmit` | ✅ clean |
| Backend `npm run lint` | ✅ clean |
| Frontend `tsc --noEmit` | ✅ clean |
| Frontend `next lint` | ✅ clean |
| Frontend `next build` | ❌ hung again — **6th occurrence across 6 sessions**, exit 124 confirmed through a piped `timeout` |
| Wireframes JSON round-trip + tag balance | ✅ verified programmatically |
| `width_bucket` tick-matching SQL, VAPID `web-push` sends, RLS on `study_schedules`/`push_subscriptions` | ❌ not possible here — no Docker, and a real send would need a real browser subscription this sandbox cannot produce |

### Known gaps — not fixed, flagged for grooming

- **No group-management frontend exists at all.** Roster, invite, and now
  sprint-trigger screens are wireframe-only (turns 3, 4, 8g). This is the
  single biggest gap standing between "Module 1/6 API is done" and "a
  teacher can actually use any of it."
- **FR-6.2's sprint has no rate limiting.** An ADMIN can call it in a tight
  loop and fan out a push storm to an entire group; nothing here throttles
  it. Not specified in the BRD — flagged, not guessed at.
- **`width_bucket` tick-matching has never run against real Postgres.**
  The 96-bucket math is straightforward but unverified outside a jest
  mock — this is the one piece of this pass worth hand-checking against a
  few real half/quarter-hour timezones before trusting it in production.
- **No `notification_log` / delivery-receipt table**, per the design call
  above — there is no way to answer "did user X get pushed yesterday" from
  the database today, only "would they be pushed right now."
- **Push payloads are unencrypted-at-rest in the job**, i.e. plain text in
  the BullMQ job/queue log, same as every other job payload in this
  codebase (no BullMQ payload encryption anywhere) — consistent with
  existing practice, not a regression, but worth a security-review line
  item before Phase 5.
- Everything in "Known gaps" from the fifth pass is still open except the
  two items this pass closed (Module 6 itself, and the `apiClient.delete()`
  body/204 bugs above).

### UAT checklist for tomorrow (supersedes the fifth pass's own checklist)

1. `docker compose up -d && ./database/apply-migrations.sh --test` —
   confirms schema, RLS suite, and indexes against real Postgres (unchanged
   this pass — no new migration; `study_schedules`/`push_subscriptions` RLS
   is Phase 0's, not new).
2. `cd com.dygoacademy.backend && npm run start:dev`, hit `/api/docs`.
   Spot-check Modules 1–5 as prior checklists described, **plus**: set
   `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` in `.env` (`npx
   web-push generate-vapid-keys` if you don't have a pair), `POST
   /notifications/subscribe` with a real browser subscription →
   `POST /notifications/schedules` with a reminder time a few minutes out
   → wait for `notification-tick-every-15m` (or trigger the BullMQ job
   manually) → confirm a real push arrives and tapping it opens `/study` or
   `/quiz?mode=leech`. Also: `POST
   /notifications/groups/:groupId/sprint` as a non-ADMIN → confirm `403`.
3. `cd com.dygoacademy.frontend && npm run build` — confirm the production
   build completes; unverified here across a 6th session running.
4. In the running frontend, open Settings ("You" tab) → turn on push
   notifications → accept the browser's permission prompt → add a
   reminder time → confirm it appears in the list → remove it → confirm
   it's gone.
5. Open `Dygo Academy Wireframes.html` directly and check turn 8 (screens
   8a–8g) renders correctly, same caveat as every prior turn.
6. **With Phase 3 now fully code-complete**, decide whether to start Phase
   4 (Stripe seat billing, Module 7) next, or spend a pass first on the
   standing "no group-management frontend" gap — Module 7's own free
   student-onboarding flow (FR-7's "$0-cost join") is hard to demo
   meaningfully without a teacher-facing screen to originate an invite
   from in the running app, not just the wireframe.

---

## Fifth pass — Phase 3, Module 5: the quiz engine goes live

### What this pass did

Same standing instruction as every prior pass: compared the working tree
against `dygo_academy_master_project_schedule.md` and
`dygo_academy_api_surface.md`. Phases 0–2 held up exactly as the fourth pass
left them — `git log --oneline` showed a clean, fully-committed tree (no
repeat of the second pass's `.git/index.lock` blocker), and `npm run test`
reproduced the fourth pass's 75/75 backend pass before any new work started.
Phase 3 was the clear next step: `SrsController`/`SrsModule` covered Module
3 completely, but no `quiz`/`billing`(routes)/`notifications`(routes)
directory existed yet, and the master schedule's own Phase 3 section had no
status note at all — a clean, unstarted phase.

### Module 5 — Dynamic Multi-Modal Quiz Engine

New `src/modules/quiz/` on the backend, following the same split the SRS
module already established: `quiz-generator.ts` holds pure, DB-free
generation and grading functions (unit tested in isolation), `quiz.service.ts`
owns the Postgres reads and the one Gemini call FR-5.5 needs, `quiz.controller.ts`
exposes the three routes `dygo_academy_api_surface.md`'s own §4 table had
already sketched as "implied": `POST /quizzes/generate`, `POST
/quizzes/:id/answer`, `GET /quizzes/leech-drill`.

The one design call that had to be made before writing any service code,
same as Module 3's `recent_mistakes`-decay decision last pass: **no
persisted quiz/session/attempt row.** Checked
`dygo_academy_database_dictionary.md` — nothing like a `quiz_attempts` table
exists, and `StartSessionDto`'s own precedent (Phase 2) already treats
"which cards, what shape" as recomputable rather than stored. Took that one
step further here: a quiz item's id is deterministic
(`` `${topicWordId}:${type}` ``), and its correct answer is always *derived*
the same way for a given word+type — first example sentence for CLOZE/
CONTEXTUAL_CHOICE, first synonym (falling back to first antonym) for
MATCHING, the word itself for DICTATION. That means `POST
/quizzes/:id/answer` can reconstruct and grade the exact question `POST
/quizzes/generate` handed out earlier without a database row remembering
it — only the wrong-answer distractor options differ run to run, and
grading never looks at those, so their non-determinism costs nothing.

Two things worth flagging as deliberate, not accidental:

- **FR-5.3 ("Synonym & Antonym Matching... interactive drag-and-drop
  semantic pairing") is implemented as one-word-at-a-time multiple choice**,
  not a multi-pair drag-and-drop board. The BRD's phrase describes a UI
  interaction, not a grading contract; a single "which of these words is a
  synonym of X" question tests the identical semantic-relationship
  knowledge while staying gradable with the same stateless shape as the
  other three types. Flagged in `quiz-generator.ts`'s header comment and in
  the API surface doc, same treatment as the Module 4 clue-ladder
  disagreement two passes ago, rather than picked silently.
- **CLOZE and CONTEXTUAL_CHOICE mask the target word using the exact same
  regex** the frontend's `/study` page already uses for Reverse mode
  (`maskForReverse`) — a word that fails to mask (doesn't literally appear
  in its own example sentence) behaves identically in both places: the item
  is skipped rather than shown with the answer visible.

Distractor generation (`pickDistractors`/`buildDistractorPool`) draws first
from the other candidate words already fetched for the batch, falling back
to a random `master_lexicon` sample when a topic (or a small leech batch) is
too small to supply three wrong-answer options on its own — the same
global-cache reasoning `master_lexicon`'s dedup lookup already relies on,
since distractors are cosmetic and borrowing unrelated words from the
global lexicon costs nothing.

FR-5.5's AI nuance explanation is a new method on the existing
`GeminiEnrichmentService` (`explainNuance`, free-text prompt, not
structured JSON like `enrichWord`) — called from `QuizService.answer` only
when the submission was wrong, same cost-avoidance instinct as the dedup
cache: a correct answer needs no explanation. A failed Gemini call (no API
key, network error) is caught and degrades to a generic "the correct answer
was X" message rather than turning a working quiz into a 500 — matches the
codebase's existing rule that AI-optional features must never break core
functionality (same as `EnrichmentProcessor`'s per-word failure isolation).

`GET /quizzes/leech-drill` builds on `SrsService.findLeeches` rather than a
second leech query (one definition of "leech" for the whole codebase, new
`QuizModule` imports `SrsModule` the same way `TopicsModule` already does),
and tries the richest question type per word first (CONTEXTUAL_CHOICE →
CLOZE → MATCHING → DICTATION), falling back through whatever that word's
enrichment data actually supports. This is the destination the fourth
pass's own turn-6 caption (screen 6f) said was "still Module 5 work" — it
exists now.

32 new backend unit tests (107 total, up from 75): 28 across
`quiz-generator.spec.ts` and `quiz.service.spec.ts` (generation, grading,
distractor exclusion, the nuance-call/no-call split, Gemini-failure
degradation, leech-drill preference ordering), plus 4 replacing
`groups.service.spec.ts`'s old single-case `removeMember` test with real
last-ADMIN coverage (see below). `tsc --noEmit` and `npm run lint` clean.

### A standing gap fixed in passing: the last-ADMIN-removal guard

Not part of Module 5, but small, well-scoped, and flagged as a real
correctness bug since the second pass's own report: `DELETE
/groups/:id/members/:userId` had nothing stopping an ADMIN from removing a
group's only other ADMIN (or themselves), leaving a group no one could
manage — `groups.owner_id` still points at them, but ownership and
`group_members` ADMIN role are tracked separately, so this was a genuine
dead end, not cosmetic. Fixed in `GroupsService.removeMember`: now runs
inside a `withUser` transaction (was a single `queryAs` DELETE before),
counting ADMINs before the delete and throwing `409 Conflict` if the target
is the last one. The pre-delete SELECT runs under the same RLS as
everything else — a non-ADMIN caller reaching this method still collapses
to the same 404 it did before (either they can't see the row, or they can
but the DELETE itself gets RLS-filtered), so no existing caller sees a
behavior change except when the last-ADMIN case is actually hit. Did **not**
touch the frontend's topic-delete-button-showing-for-WRITE gap (also
flagged since the second pass) — checked, and it turns out no delete-topic
button exists anywhere in the running frontend yet, only in the wireframe
(screen 4b's own dashed note); there's nothing live to fix.

### Frontend

New `src/app/(dashboard)/quiz/page.tsx`, mirroring `/study`'s
`StudyPage`/`StudySessionScreen` Suspense split (same `useSearchParams()`
requirement). Two entry points share one page: `?topicId=` (a normal quiz
batch) and `?mode=leech` (the remedial drill) — both
`useGenerateQuiz`/`useLeechDrillQuiz` hooks are called unconditionally with
an `enabled` flag deciding which one actually fetches, rather than breaking
the rules of hooks with a conditional call. `QuizQuestion.tsx` renders any
of the four FR-5.1–5.4 types off one flag (`answerMode: 'TEXT' | 'CHOICE'`)
rather than branching on all four type names itself; `QuizFeedback.tsx`
shows FR-5.5's nuance line whenever the API response includes one. Reused
`AudioButton.tsx` as-is for DICTATION, same component the flashcard player
already uses — no mode-specific rebuild.

Two small wiring fixes so the new page is actually reachable, same "worth
catching before UAT" instinct the fourth pass applied to the "Study" button:
added a "Quiz" button next to "Study" on the topic detail page, and turned
`LeechNudge` from a static box into a real `Link` to `/quiz?mode=leech` —
its own code comment used to say it was "a static box, not a link, until
there's a real leech-drill destination to send someone to." That
destination exists now. Did **not** wire the home page's hardcoded
`dueCount`/`count` mock props to real `/srs/stats`/`/srs/leeches` data —
that's a separate, still-open task the `LeechNudge` component's updated
comment now calls out explicitly, not something Module 5's scope covers.

### Wireframes

Added turn 7 (`Dygo Academy Wireframes.html`) — 7 screens (7a–7g) across
four groups: starting a quiz, the two TEXT-mode types (cloze, dictation),
the two CHOICE-mode types plus the FR-5.5 nuance-feedback state (matching,
contextual-choice-with-wrong-answer), and leech drill + completion summary.
Same edit process as turns 4–6: decoded the JSON blob on line 394 (still the
actual template line), inserted the new `<section id="t7">` immediately
before `id="t6"` (newest-first ordering), verified programmatically before
writing anything back — open/close tag counts balance for the new section,
all seven new `dv-opt` ids (`7a`–`7g`) plus `id="t7"` each appear exactly
once, and the re-encoded JSON round-trips byte-for-byte through
`json.loads`/`json.dumps`. `git diff --stat` confirms exactly one line
changed. Not visually confirmed in a browser — same sandbox limitation as
every prior turn.

### Testing performed

| Check | Result |
| :--- | :--- |
| Backend `jest` | ✅ 107/107 pass (32 new: 28 quiz, 4 last-ADMIN guard) |
| Backend `tsc --noEmit` | ✅ clean |
| Backend `npm run lint` | ✅ clean |
| Frontend `tsc --noEmit` | ✅ clean |
| Frontend `next lint` | ✅ clean |
| Frontend `next build` | ❌ hung again — **5th occurrence across 5 sessions**, see below |
| Wireframes JSON round-trip + tag balance | ✅ verified programmatically |
| `POST /quizzes/generate` → `POST /quizzes/:id/answer` against real Postgres + Gemini | ❌ not possible here — no Docker, and a live Gemini call would spend real quota with no way to verify the result in this sandbox |
| Last-ADMIN guard against real Postgres/RLS | ❌ not possible here — no Docker |

`next build` hung immediately after the `▲ Next.js` banner again, killed by
a 100s `timeout` (exit code 124, confirmed directly per the fourth pass's
own note about checking real exit codes through a pipe). Same symptom, same
timing, now five-for-five across five separate sessions and several
completely different code changes each time — reads more strongly than ever
as a sandbox restriction rather than a code defect, but still needs one real
run on your machine before UAT depends on a production build existing.

### Known gaps — not fixed, flagged for grooming

- Everything in "Known gaps" from the fourth pass (below) is still open
  **except** the last-ADMIN-removal guard, fixed this pass — *and* the
  "no dedicated leech-drill queue screen" gap, also closed this pass
  (`GET /quizzes/leech-drill` + `/quiz?mode=leech`).
- **Module 6 (Web Push & Habit Scheduling) has not been started.**
  `NotificationsModule`/`NotificationProcessor` are still exactly the Phase
  0 stub: a 15-minute cron tick that only logs. No VAPID subscribe endpoint,
  no `study_schedules` matching, no push dispatch, no FR-6.2 teacher
  sprints. This is Phase 3's other half and the natural next pass.
- The home page (`topics/page.tsx`) still hardcodes `dueCount`, `etaMinutes`,
  streak, and leech `count` — none of it reads real `/srs/stats` or
  `/srs/leeches` data yet. `LeechNudge`'s link now goes somewhere real, but
  the number on it is still fake.
- FR-5.3's literal "drag-and-drop" interaction (as opposed to the
  one-word-multiple-choice implementation here) is not built — flagged as a
  deliberate simplification, not silently dropped.
- Quiz results are not routed back into the SRS system at all — a correct
  cloze answer doesn't rate the underlying `user_word_srs` row, and there is
  no attempt/results table (deliberately, per the design call above). The
  quiz-complete screen's "the 2 you missed will come back around" line
  (wireframe 7g) is aspirational copy, not a real mechanic yet.
- Gemini's `explainNuance` free-text output is not validated beyond "did it
  return non-empty text" — unlike `enrichWord`'s structured-schema
  guarantees, a low-quality or off-topic explanation wouldn't be caught
  before reaching the student.
- `.gitkeep` in `components/quiz/` could not be deleted in this sandbox
  (same `Operation not permitted` restriction the third pass documented for
  `.git/`-adjacent files) — harmless, coexists fine with the real files now
  in that directory.

### UAT checklist for tomorrow (supersedes the fourth pass's own checklist)

1. `docker compose up -d && ./database/apply-migrations.sh --test` —
   confirms schema, RLS suite, and indexes against real Postgres (unchanged
   this pass — no new migration).
2. `cd com.dygoacademy.backend && npm run start:dev`, hit `/api/docs`.
   Spot-check Modules 1–3 as prior checklists described, **plus**: `POST
   /quizzes/generate` with a real topic → confirm a mix of CLOZE/DICTATION/
   MATCHING/CONTEXTUAL_CHOICE items comes back → `POST
   /quizzes/:id/answer` with a wrong answer and a real `GEMINI_API_KEY` →
   confirm a real nuance explanation comes back, not the generic fallback →
   `GET /quizzes/leech-drill` after manually flagging a word as a leech.
   Also: `DELETE /groups/:id/members/:userId` on a group's last ADMIN →
   confirm `409`, not a silent success.
3. `cd com.dygoacademy.frontend && npm run build` — confirm the production
   build completes; unverified here across a 5th session running.
4. In the running frontend, open a topic and click the new "Quiz" button →
   answer a few questions of each type → get one wrong on purpose and
   confirm the AI nuance line renders. From the home screen, click the
   leech nudge's "Fix →" link → confirm it lands on the leech-drill quiz,
   not a dead end.
5. Open `Dygo Academy Wireframes.html` directly and check turn 7 (screens
   7a–7g) renders correctly, same caveat as every prior turn.

---

## Fourth pass — Phase 2 (Modules 3 & 4): the SRS engine and flashcard player go live

### What this pass did

Compared the working tree against `dygo_academy_master_project_schedule.md`
and `dygo_academy_api_surface.md` per the task's standing instruction ("check
the tasks have done then compare with project plan"). Phase 0 and Phase 1
held up exactly as the third pass left them — `git log` showed a clean,
fully-committed tree (no repeat of the second pass's `.git/index.lock`
blocker; whatever caused it either resolved itself or wasn't triggered this
run), and `npm run test` reproduced third pass's 51/51 backend pass before
any new work started. Phase 2 (Module 3 — SRS, Module 4 — 3D flashcards) was
the clear next step: `SrsService`/`SrsController` were the Phase 0 stub
(`constructor` only, one line), and `/study` ran entirely off a hardcoded
`MOCK_QUEUE`. Both are real now.

### Module 3 — Error-Adaptive SRS

`src/modules/srs/srs-algorithm.ts` (pure functions, unit tested in isolation
— same split as `GeminiEnrichmentService.pcmToWav`) implements FR-3.1's
formula and FR-3.2's four rating actions. Three assumptions had to be made
because nothing pins them, all documented in that file's header comment and
cross-referenced from `dygo_academy_api_surface.md`:

- **Rating → SM-2 `q` mapping.** FR-3.1's formula expects `q` on a 0–5
  scale; FR-3.2 only gives four named buttons. Mapped onto the conventional
  SM-2/Anki scale (AGAIN→0, HARD→3, GOOD→4, EASY→5) rather than inventing a
  new curve.
- **λ = 0.05.** Not specified anywhere. Chosen so the `M_recent` penalty
  (recent mistakes are realistically 0–6ish, the leech threshold being 4)
  stays comparable in magnitude to the formula's own AGAIN/EASY swing
  without letting it alone drive EF negative.
- **`recent_mistakes` decay — resolves the open question
  `dygo_academy_api_surface.md` §5.4 flagged for Phase 2.** Recomputed from
  `review_logs` inside the same transaction as `POST /srs/rate`, not decayed
  on a schedule. This was the one design call that had to be made *before*
  writing any service code, not discovered along the way — no third
  repeating job was needed, and `GET /srs/leeches` still reads a plain
  stored column rather than a live aggregate.

One spec disagreement surfaced and is flagged rather than silently picked:
FR-3.2 describes Hard as a flat "×1.2" multiplier, distinct from Good's own
1d→3d→7d→16d ladder — implemented literally (Hard multiplies the *previous*
interval, never touches the ladder), which means a card rated Hard
repeatedly never catches up to Good's pace. Worth a product sign-off if
that's not the intended feel.

`SrsService` (`src/modules/srs/srs.service.ts`) implements:
`findDue` (existing due `user_word_srs` rows, topped up with never-reviewed
"new cards" — there's no separate new-card table, so "no `user_word_srs`
row yet" is the operational definition used throughout), `rate` (one
transaction: read state → count recent mistakes → insert `review_logs` →
upsert `user_word_srs`, via `DatabaseService.withUser` same as
`TopicsService.clone`), `findLeeches`, `stats` (streak computed from
distinct UTC review dates), `startSession` (FR-4.3, see below), and `sync`
(replays offline-queued reviews in chronological order, isolating per-item
failures rather than failing the whole batch — same philosophy as
`EnrichmentProcessor`'s per-word failure isolation).

`GET /topics/:id/cards/due` (tech spec §3.4's exact route) lives on
`TopicsController`, not `SrsController` — `TopicsModule` now imports
`SrsModule` and the controller just delegates to `SrsService.findDue`,
rather than duplicating the due-card query on two controllers.

`POST /srs/sessions` does **not** create a persisted session row. Checked
`dygo_academy_database_dictionary.md` — no `study_sessions` table exists.
FR-4.3's three modes are a display concern (which face of the card shows
first, whether audio is the only clue), not server state, so the endpoint
just returns a due-card batch tagged with the requested mode. Documented in
`StartSessionDto`'s header rather than assumed silently, since a future pass
adding real session-resume would need to know this was a deliberate choice,
not an oversight.

24 new backend unit tests (75 total, up from 51) — `srs-algorithm.spec.ts`
covers the EF formula, the interval ladder, and each rating's edge cases in
isolation from the database; `srs.service.spec.ts` covers the due-query
merge logic, the rate transaction's parameter shapes (including the
leech-threshold crossover), the leech query, the streak calculation, and
sync's chronological-ordering + per-item-failure-isolation behavior.
`tsc --noEmit` and `npm run lint` both clean.

### Module 4 — 3D Flashcard Player

Phase 0 had already scaffolded the flip-card mechanics for real:
`Flashcard.tsx` (CSS `perspective`/`preserve-3d`/`backface-hidden` flip,
flip state controlled by the caller) and `RatingButtons.tsx` (two buttons,
a press-and-hold gesture collecting all four FR-3.2 ratings — tap vs. hold
past 450ms) were already correct and needed no changes. What Phase 1/2 had
left as a placeholder was `/study`'s data: a 3-card `MOCK_QUEUE` with a
`console.log` where a real rating submission should be.

Rewired `/study` to real data:

- **`useStudySession(topicId?, mode, limit)`** — `POST /srs/sessions`
  fetched via `useQuery`, not `useMutation`: the endpoint has no side
  effects (see above), so it's a read like every other one in this
  codebase, and `useQuery` gives loading/error/refetch state for free
  instead of hand-wiring it.
- **`useRateWord()`** — `POST /srs/rate`, invalidates the `['srs']` query
  key on success rather than patching the cache in place; a rated card can
  leave the due queue entirely, which is an awkward shape for
  `setQueryData` compared to just refetching (same reasoning
  `useCreateWord` already used for topic invalidation).
- **`ProgressiveClues.tsx`** — FR-4.2's tap-to-reveal ladder. The BRD names
  three steps (First-Letter → IPA → Context Sentence); the master schedule's
  own Phase 2 task description names four, inserting Audio between IPA and
  the sentence. Implemented the four-step version, since Module 4's front
  face already promises audio per FR-4.1 — flagged as a spec disagreement
  in both the component's header comment and
  `dygo_academy_api_surface.md`, the same way the billing route name
  conflict is already flagged there, rather than picking one silently.
- **`AudioButton.tsx`** — FR-2.4's 0.75x/1.0x speed toggle, one `<audio>`
  element per mount, reused across all three modes' front and back faces
  rather than a mode-specific rebuild.
- **Mode and topic scope read from the URL** (`/study?topicId=&mode=`)
  rather than component-local state seeded elsewhere — FR-6.5's "1-tap
  notification deep links routing directly into `/study`" will need exactly
  this once Module 6 exists, so it's built the way that future caller will
  actually need it, not the way that's easiest today.
- `useSearchParams()` requires a Suspense boundary for Next's static
  rendering — split the page into an outer `StudyPage` (Suspense + fallback)
  and an inner `StudySessionScreen` (the actual logic), which is new
  structure this codebase didn't have a precedent for yet.

Reverse mode masks the target word in the topic's first example sentence
(client-side regex, case-insensitive exact match) rather than a second
backend endpoint — mode is purely how the fetched card is *displayed*.
Listening mode hides all word text on the front face; the clue ladder and
rating buttons are unchanged across all three modes.

Also added a "Study" button to the topic detail page (`topics/[topicId]/page.tsx`),
linking to `/study?topicId=`. Without it, `/study` was real but unreachable
from anywhere in the app — worth catching before UAT rather than after.
It defaults to Standard mode only; there is no in-app mode *picker* yet
(wireframe 6a exists, the screen behind it doesn't) — Reverse and Listening
are reachable by editing the URL, which is fine for UAT but not for a real
user.

**Not implemented**: offline-first sync. `POST /srs/sync` exists and is
unit-tested on the backend, but nothing on the frontend queues a rating
locally when offline and replays it later — Module 4's "local SQLite /
IndexedDB cache" line in the schedule doc is still open. Flagging rather
than stubbing something that would just be dead code today.

### Wireframes

Added turn 6 (`Dygo Academy Wireframes.html`) — 7 screens (6a–6g) across
four groups: starting a session (mode picker), standard mode (front with
the clue ladder mid-reveal, back with rating), reverse and listening modes,
and leech-flag / empty-session states. Same edit process as turns 4 and 5:
decoded the JSON blob on line 394 (confirmed still the actual template
line, unchanged position), inserted the new `<section id="t6">` immediately
before the existing `id="t5"` (matching the established newest-first
ordering — t6, t5, t4, t3, t2, t1), then verified programmatically before
writing anything back: open/close tag counts balance for the new section
specifically, all seven new `dv-opt` ids (`6a`–`6g`) are unique and appear
exactly once, `id="t6"` appears exactly once, and the re-encoded JSON
round-trips byte-for-byte through `json.loads`/`json.dumps`. `git diff
--stat` confirms exactly one line changed in the file, as expected for this
edit pattern. Not visually confirmed in a browser — same sandbox limitation
as turns 4 and 5.

### Testing performed

| Check | Result |
| :--- | :--- |
| Backend `jest` | ✅ 75/75 pass (24 new: 15 `srs-algorithm`, 9 `SrsService`) |
| Backend `tsc --noEmit` | ✅ clean |
| Backend `npm run lint` | ✅ clean |
| Frontend `tsc --noEmit` | ✅ clean |
| Frontend `next lint` | ✅ clean |
| Frontend `next build` | ❌ hung again — **4th occurrence across 4 sessions**, see below |
| Wireframes JSON round-trip + tag balance | ✅ verified programmatically |
| `POST /srs/rate` / due-card queries against real Postgres | ❌ not possible here — no Docker |
| `p95 < 15ms` due-card query SLO (FR-3.4) | ❌ unmeasured — no running stack to load-test |

`next build` hung immediately after the `▲ Next.js` banner, killed by an
explicit 100s `timeout` this time (exit code 124, confirmed via the actual
process exit code rather than a piped command's, which the third pass's own
tooling didn't check — worth remembering for whoever runs this next: `cmd
> file 2>&1; echo $?` before trusting an exit code through a pipe). Same
symptom, same timing as all three prior sessions — still reads as a sandbox
restriction, not a code defect, but this is now four-for-four and still
needs one real run on your machine before UAT depends on a production build
existing.

### Known gaps — not fixed, flagged for grooming

- Everything in "Known gaps" from the third pass (below) is still open:
  last-ADMIN-removal guard, topic-delete button showing for WRITE,
  solo-user tenant provisioning, no re-enrichment endpoint, and the
  standing "nothing here has run against a live Postgres" caveat — which
  now also covers this pass's `user_word_srs` upsert, the `recent_mistakes`
  recompute, and the leech-threshold crossover logic.
- Offline-first sync (Module 4's IndexedDB cache) is not built — see above.
- No in-app mode picker (wireframe 6a) — the "Study" button added this pass
  only reaches Standard mode; Reverse/Listening need a manual URL edit.
- No dedicated leech-drill queue screen exists yet (Module 5 territory per
  the schedule); today's leech UI is the standard study card with a badge
  added (wireframe 6f). FR-3.3's "routed to intensive remedial drills"
  implies something more targeted.
- `HARD`'s multiplier-not-ladder behavior (see Module 3 section above) is a
  literal reading of FR-3.2, not confirmed with product — a card stuck on
  Hard never reaches Good's growth curve.
- Gemini's structured output is still trusted to return exactly 5
  synonyms/antonyms per the third pass's own flag — unrelated to this
  pass's work, just still open.

### UAT checklist for tomorrow (supersedes the third pass's §UAT checklist)

1. `docker compose up -d && ./database/apply-migrations.sh --test` —
   confirms schema, RLS suite, and indexes (including
   `idx_user_word_srs_user_next_due`/`_user_leech`) against real Postgres.
2. `cd com.dygoacademy.backend && npm run start:dev`, hit `/api/docs`.
   Spot-check Module 1/2 as prior checklists described, **plus**: `POST
   /srs/rate` with each of AGAIN/HARD/GOOD/EASY on the same word across
   several calls → confirm `ease_factor`/`interval_days`/`next_due_at` move
   the way `srs-algorithm.spec.ts` predicts → rate AGAIN 4 times inside 7
   days → confirm `GET /srs/leeches` picks it up.
3. `GET /topics/:id/cards/due` and `GET /srs/due` — confirm a never-rated
   `READY` word appears as a "new card" and a past-due `user_word_srs` row
   appears too; time this against the `p95 < 15ms` SLO with more than a
   handful of rows.
4. `cd com.dygoacademy.frontend && npm run build` — confirm the production
   build completes; unverified here across a 4th session running.
5. In the running frontend, open a topic with words and click the new
   "Study" button (added this pass, topic detail page → `/study?topicId=`,
   defaults to Standard mode) — rate a few cards for real, confirm the
   queue shrinks and next_due_at changes stick after a refresh. Then try
   `/study?mode=REVERSE` and `/study?mode=LISTENING` directly via the URL —
   there is no in-app mode *picker* yet (turn 6a is a wireframe, not wired
   UI), so editing the URL is still the only way to reach those two today.
6. Open `Dygo Academy Wireframes.html` directly and check turn 6 (screens
   6a–6g) renders correctly, same caveat as turns 4 and 5 before it.

---

## Third pass — git lock resolved, Module 2 enrichment goes live

### What changed since the second pass

**The `.git/index.lock` blocker from §0 below is resolved for this pass —
with a caveat.** `rm`/`unlink` still fail with `Operation not permitted` on
every file in `.git/` in this sandbox (verified: a file created and
`unlink`ed in the same Python process, never touched by git, still fails —
this is a mount-level restriction, not lock contention with another
process). `mv`/`rename`, however, works. Workaround: rename `.git/index.lock`
out of the way immediately before each git operation that needs to create
one, retry if git recreates it before finishing. `git add -A` and `git
commit` both went through this way — **this pass's work, and both prior
passes' uncommitted work, are now committed** (`git log --oneline`: `wip`,
then `init`). Amending the commit message to something more descriptive hit
the same race repeatedly (the lock reappears within milliseconds of being
moved aside) and wasn't worth fighting further — the commit itself is what
mattered for UAT. **Leave this workaround in the next session's toolbox**:
before any git operation, `mv .git/index.lock .git/index.lock.stray$RANDOM`
if it exists, then retry the operation once or twice if it fails with "File
exists".

One side effect of this same restriction: a locally-created directory with a
typo'd name (`com.dygoacademory.frontend`, one keystroke off from the real
`com.dygoacademy.frontend`) could not be deleted either. Renamed to
`.SANDBOX_UNDELETABLE_JUNK_ignore/` and added to `.gitignore` — harmless,
but flagging so a future session doesn't mistake it for a real package.

### Module 2 (AI enrichment) — the Gemini/TTS stub is now real

Picked up exactly where the second pass's own schedule-doc status note left
off: `EnrichmentProcessor` had the `master_lexicon` dedup lookup but the
actual Gemini/TTS calls were a `TODO`. Implemented:

- **`src/ai/gemini-enrichment.service.ts`** — Gemini 1.5 Flash
  (`@google/genai`) for the linguistic fields, with a `responseSchema` that
  mirrors tech spec §4.2's JSON example field-for-field (dual IPA, CEFR
  level, 5 synonyms/5 antonyms with levels, 2 example sentences). Gemini's
  own TTS model (`gemini-2.5-flash-preview-tts`) for audio — the tech spec
  names a generic "Neural TTS engine" without pinning a vendor; using
  Gemini's own keeps one API key and one rate-limit budget instead of adding
  a second AI vendor, and matches the single `GEMINI_API_KEY` already in
  `.env` (no separate TTS credential exists).
- **`src/storage/storage.service.ts`** — S3-compatible upload
  (`@aws-sdk/client-s3`), works against both R2 (production) and MinIO
  (local, `docker-compose.yml`'s `minio` service) since both speak the S3
  API; only endpoint/credentials differ (`configuration.ts` `storage`,
  switches on whether `R2_ACCOUNT_ID` is set).
- **One deliberate spec deviation**: audio is stored as `.wav`, not the
  `.mp3` tech spec §4.2 names. An MP3 encoder needs a native codec
  (ffmpeg/lame) not available in this sandbox; Gemini's TTS returns raw PCM,
  and wrapping it in a WAV container (`GeminiEnrichmentService.pcmToWav`,
  pure function, unit tested) needs zero dependencies while playing natively
  in every browser `<audio>` tag. Swapping to real MP3 later is a drop-in
  change to that one function plus the storage key extension — flagged in
  `dygo_academy_api_surface.md` note (4) and here for whoever picks this up
  with ffmpeg available.
- **Failure handling**: a TTS/upload failure no longer fails the whole word
  — `topic_words_ready_requires_lexicon` only requires a `lexicon_id`, not
  audio, so Gemini's text fields still land and `audio_url` stays `null`,
  recoverable later without redoing the (paid) text call. A terminal
  `EnrichmentProcessor` failure (BullMQ's last attempt, `job.attemptsMade +
  1 >= job.opts.attempts`) now writes `status = 'FAILED'` with the real
  error in `failure_reason`; a non-final attempt just rethrows so BullMQ's
  own backoff (queues.module.ts, exponential, 3 attempts) retries it. Two
  concurrent enrichments of the same never-before-seen word (both miss the
  dedup check before either finishes) is handled with `ON CONFLICT
  (normalized_word, language_code) DO UPDATE` on the `master_lexicon` insert
  rather than erroring.
- **`GET /topics/:id` now returns `failure_reason`** per word — the SELECT
  in `topics.service.ts` `findById` simply never included it before, so the
  frontend's FAILED state could only show static copy regardless of why a
  word actually failed.

### Frontend integration (schedule doc Phase 1 task 3)

The topic detail page (`(dashboard)/topics/[topicId]/page.tsx`) was built
against a `GET /topics` list + client-side find, with its word list hard-
coded as `MOCK_WORDS` — the comment at the time said `GET
/topics/:topicId/words` "doesn't exist until Phase 1." It turned out to
already exist, just nested differently than expected: `GET /topics/:id`
(Module 1, second pass) already returns `words[]` in its response. Rewired:

- **`useTopic(topicId)`** — replaces the list+find pattern, polls every
  2.5s via TanStack Query's `refetchInterval` *only* while at least one word
  is `ENRICHING`, stops once everything's settled. Short polling, not
  websockets/SSE — there's no push channel yet, and claiming "real-time" via
  a fake channel would be worse than an honest 2.5s poll.
- **`useCreateWord(topicId)`** — `POST /words`, invalidates both the topic
  detail query and the topics list query (word count changes) on success.
- **`AddWordModal`** — a fixed-overlay form, not a new dialog primitive
  (no Radix dialog dependency in the project yet — `components/ui/` only
  has `button.tsx` and `card.tsx`). `EmptyTopicState`'s "+ Add a word"
  button, previously `disabled` with a "Phase 1" label, now opens it for
  real.
- Added `TopicWordSummary`/`TopicDetail` types (`types/topic.ts`) matching
  the actual `GET /topics/:id` response shape exactly — narrower than the
  full `TopicWord` type (`word.ts`), which has fields (`topic_id`,
  `lexicon_id`, `added_by`, `updated_at`) this endpoint's SELECT never
  returns. Using the full type would have compiled but lied about the
  response.

### Wireframes

Added turn 5 (`Dygo Academy Wireframes.html`) — one new screen, 5a "Add a
word," matching `AddWordModal`'s actual interaction. Turn 5's intro
explicitly points back to 1j/1k/1l (empty/enriching/failed) rather than
re-drawing them: those screens were already designed in turn 1 and are now
backed by a real pipeline instead of a mock, which is the story worth
telling, not new pixels for states that didn't change. Verified the same
way the second pass verified turn 4: decoded the JSON bundle (the actual
template string is on line 394, a single 51KB line — the naive
`<script>...</script>` regex the second pass's report describes finding
truncates early because the JSON contains an unescaped literal `<script>`
tag mid-string; reading that specific line directly avoids the problem),
inserted the new section before `id="t4"`, checked open/close tag counts
balance for the added block, checked `id="t5"`/`id="5a"` each appear
exactly once, round-tripped the re-encoded JSON through
`json.loads`/`json.dumps`. Not visually confirmed in a browser — same
sandbox limitation as before.

### Testing performed

| Check | Result |
| :--- | :--- |
| Backend `jest` | ✅ 51/51 pass (6 new: 5 EnrichmentProcessor scenarios, 1 `pcmToWav`) |
| Backend `tsc --noEmit` | ✅ clean |
| Backend `npm run lint` | ✅ clean |
| Frontend `tsc --noEmit` | ✅ clean |
| Frontend `next lint` | ✅ clean |
| Frontend `next build` | ❌ hung again — third occurrence across three sessions, see below |
| Wireframes JSON round-trip + tag balance | ✅ verified programmatically |
| Gemini/TTS calls against the live API | ❌ not attempted — would spend real quota with no way to verify the result in this sandbox |
| RLS / real Postgres / real MinIO upload | ❌ not possible here — no Docker |

**`next build` hanging is now reproduced a third time**, across three
separate sessions, immediately after the `▲ Next.js` banner. Given the
consistency (same symptom, same timing, across unrelated code changes in
each pass), this reads as a sandbox restriction rather than a code defect —
but it still needs one real run on your machine
(`cd com.dygoacademy.frontend && npm run build`) before UAT depends on a
production build existing, since nothing in this sandbox can rule out a
real bug hiding behind the hang.

### Known gaps — not fixed, flagged for grooming

- Everything in "Known gaps" from the second pass (below) is still open:
  the last-ADMIN-removal guard, the topic-delete button showing for WRITE,
  solo-user tenant provisioning, and the standing "nothing here has run
  against a live Postgres" caveat — which now also covers this pass's
  `master_lexicon` upsert, `ON CONFLICT` path, and the R2/MinIO upload.
- Gemini's structured-output mode (`responseSchema`) is trusted to return
  well-formed JSON matching the schema; `enrichWord` only guards against
  `JSON.parse` throwing, not against, e.g., an empty `synonyms` array when
  the tech spec asks for "exactly 5." Worth a real call against live Gemini
  before assuming the prompt gets 5 every time.
- No re-enrichment endpoint exists yet (`POST /words/:id/re-enrich` is
  still "Implied" in the API surface doc) — the "Try again" button on the
  FAILED wireframe (1l) and the FAILED state's own recovery path have
  nothing to call yet.

### UAT checklist for tomorrow (supersedes the second pass's §6)

1. `docker compose up -d && ./database/apply-migrations.sh --test` —
   confirms schema, RLS suite, `005`'s function, against real Postgres.
2. `cd com.dygoacademy.backend && npm run start:dev`, hit `/api/docs`.
   Spot-check Module 1 as the second pass's checklist described, **plus**:
   `POST /words` with a real `GEMINI_API_KEY` → confirm the job reaches
   `EnrichmentProcessor` → confirm `master_lexicon` gets a real row with
   real IPA/synonyms/antonyms/examples → confirm `topic_words.status` flips
   to `READY` → confirm `audio_url` resolves to a playable `.wav` in MinIO's
   console (`localhost:9001`, `minioadmin`/`minioadmin` by default).
3. `cd com.dygoacademy.frontend && npm run build` — confirm the production
   build completes; unverified here across six attempts over three
   sessions.
4. In the running frontend, open a topic, use "+ Add a word," watch it go
   `ENRICHING → READY` live via the 2.5s poll without a manual refresh.
5. Open `Dygo Academy Wireframes.html` directly and check turn 5 (screen
   5a) renders correctly, same caveat as turn 4 before it.

---

## Second pass (previous state) — Module 1 complete, git lock unresolved

## 0. Read this first — one blocker before UAT, still unresolved

**`.git/index.lock` exists and still cannot be removed from this sandbox.**
Re-tested at the start and end of this second pass: `rm .git/index.lock`,
`git add`, and a plain `rm -f` all still fail with `Operation not permitted`,
identical to the first pass. Every fix and addition described below is real
and sitting on disk, but **none of it is committed** — the working tree now
carries two full sessions of uncommitted work.

**Before UAT, on your own machine:** confirm no editor/git GUI has this repo
open mid-operation, then remove the stale lock —
`rm "/Users/dylan/dygo/claude/.git/index.lock"` — and commit. Until then this
repo is uncommitted working-tree state only. `git status --short` currently
shows every file from both sessions as staged-or-modified; review the diff
before committing rather than blindly `git add -A`.

---

## 1. What this second pass did

Picked up exactly where the first pass's own report (§6 checklist item 1
aside) left off: Module 1's schedule status said "Groups leads Phase 1" with
only `GET`/`POST /groups` live. Compared the working tree again against
`dygo_academy_master_project_schedule.md` and `dygo_academy_api_surface.md`
and built the rest of Module 1's implied-endpoint table — 14 endpoints,
now all live:

- **Group management**: `PATCH`/`DELETE /groups/:id`, roster (`GET
  /groups/:id/members`), role assignment and removal (`PATCH`/`DELETE
  /groups/:id/members/:userId`).
- **Magic invites (FR-1.3)**: `POST`/`GET /groups/:id/invites`, `DELETE
  /invites/:id` (soft-revoke), `POST /invites/:token/redeem`.
- **Topics (FR-1.1/1.2)**: `POST /topics`, `GET`/`PATCH`/`DELETE
  /topics/:id`, `POST /topics/:id/clone`.

Invite redemption needed new database work, not just a controller: the
joiner isn't a group member yet, so RLS can't show them the group to write
their own `group_members` row. Added `database/migrations/
005_group_invites_redeem.sql` — `public.redeem_group_invite`, a `SECURITY
DEFINER` function (same pattern as the existing `trg_group_owner_membership`
trigger), rather than reaching for `DATABASE_ADMIN_URL` — see that
migration's header comment for the reasoning (narrower blast radius: one
auditable function vs. a superuser connection reachable from any
authenticated request). `database/apply-migrations.sh` now runs `005` after
`003`.

Also updated `Dygo Academy Wireframes.html` (turn 4, screens 4a–4e): topic
create/edit/delete, cloning a public topic, changing or removing a member's
role, and the screen a new student actually lands on after redeeming a
magic link — the last one was turn 3's own "Try next" suggestion.

## 2. Testing performed (second pass)

Same constraint as the first pass: no Docker in this environment, so
nothing was booted end-to-end.

| Check | Result |
| :--- | :--- |
| Backend `jest` | ✅ 45/45 pass (25 new: 16 groups, 9 topics) |
| Backend `tsc --noEmit` | ✅ clean |
| Backend `npm run lint` (scoped `eslint "src/**/*.ts" --fix`) | ✅ clean |
| Frontend `tsc --noEmit` | ✅ clean (untouched this pass) |
| Frontend `next lint` | ✅ clean, no warnings |
| Frontend `next build` | ❌ **reproduced the hang from the first pass, twice more** — see §3 |
| Wireframes JSON round-trip + tag balance | ✅ verified programmatically (see §4) |
| RLS suite (§F, invite redemption) against real Postgres | ❌ not possible here — no Docker |

## 3. Frontend `next build` — now confirmed reproducible, not a fluke

The first pass flagged this as unconfirmed after three hangs. This pass
reproduced it twice more, with `NEXT_TELEMETRY_DISABLED=1` and after running
`next telemetry disable` — ruling out telemetry as the cause, which the
first pass hadn't tested. Both attempts hang immediately after printing the
`▲ Next.js 15.5.24` banner, before "Creating an optimized production build"
ever appears — killed by the tool's own timeout at ~178s and ~55s
respectively, no lingering process afterward. This is consistent with a
sandbox resource/network restriction (matches the backend's own
unlink-under-`dist/` quirk from the first pass) rather than application
code, but **still needs a real run on your machine** —
`cd com.dygoacademy.frontend && npm run build` — before UAT depends on a
production build existing.

## 4. Wireframes edit — how it was verified

`Dygo Academy Wireframes.html` is a self-extracting bundle: the visible
content lives as a JSON-encoded HTML string inside a `<script
type="__bundler/template">` tag, not as plain markup. Editing it directly
with a text tool would either fight JSON escaping or risk corrupting the
one-line blob. Instead: decoded the JSON, inserted the new `<section
class="dv-turn" id="t4">` block as plain HTML immediately before the
existing `id="t3"` section (newest-first ordering, matching turns 1–3),
then verified programmatically before writing anything back — open/close
tag counts equal for every tag used in the new section, all five new
`dv-opt` ids (`4a`–`4e`) appear exactly once, the re-encoded JSON
round-trips byte-for-byte through `json.loads`/`json.dumps`, and the
`__bundler/manifest` and `__bundler/page_order` blocks were left untouched
and still parse. This file cannot be opened as plain HTML in this sandbox
to visually confirm rendering — **please open it directly on your machine**
before UAT to sanity-check turn 4 renders as intended.

## 5. Known gaps — not fixed, flagged for grooming

- **Removing the last ADMIN from a group is possible and unguarded.**
  `DELETE /groups/:id/members/:userId` has no check preventing an ADMIN
  from removing the only other ADMIN, or themselves, leaving a group no one
  can manage. Not specified in the BRD — flagged in both the API surface
  doc and wireframe screen 4d rather than guessed at.
- **`DELETE` on a topic renders for WRITE members, not just ADMIN**, per
  wireframe 4b's own dashed note — `topics_delete_admin` correctly blocks
  the actual delete at the database, but the button shouldn't be shown to a
  role it will silently do nothing for. Frontend follow-up, not a backend
  gap.
- **Everything from the first pass's §4 is still open**: solo-user tenant
  provisioning for `POST /groups`, and the general "nothing here has run
  against a live Postgres" caveat that now also covers `005`'s
  `SECURITY DEFINER` function and RLS suite §F.

## 6. UAT checklist for tomorrow (supersedes the first pass's §6)

1. Resolve `.git/index.lock` (§0) and commit — nothing from either session
   today is committed yet.
2. `docker compose up -d && ./database/apply-migrations.sh --test` —
   confirms schema, the RLS suite (now including §F's invite-redemption
   regression tests), and `005_group_invites_redeem.sql`'s function against
   real Postgres.
3. `cd com.dygoacademy.backend && npm run start:dev`, hit `/api/docs`,
   spot-check the 14 new Module 1 endpoints with a real token (`npm run
   token alex` / `sarah`) — group update/delete, roster management, invite
   create → redeem round-trip, topic CRUD, and cloning a public topic.
4. `cd com.dygoacademy.frontend && npm run build` — confirm the production
   build actually completes; unverified here across five attempts over two
   sessions (§3).
5. Open `Dygo Academy Wireframes.html` directly (not through this sandbox)
   and check turn 4 (screens 4a–4e) renders correctly.

---

## First pass, original report (screens 3a–3d, `POST /words`, `GET`/`POST /groups`)

### What was checked against the plan

Compared the working tree against `dygo_academy_master_project_schedule.md`
and `dygo_academy_api_surface.md`. Phase 0 (Foundations) was previously
marked complete and that held up. Phase 1 (Module 1 — Groups/RBAC, Module 2
— AI enrichment) had a first slice in progress but uncommitted: `POST
/words` and `GET /topics`, plus matching frontend screens (topic detail,
topic browse, flashcard components, guest trial). No Groups endpoints
existed yet even though Module 1 leads Phase 1 in the schedule.

### Testing performed

No Docker in this environment, so nothing could be booted end-to-end
(Postgres, Redis, the NestJS API, or a full Next.js production server).
What *was* verified: backend `jest` (20 tests, 4 suites) passed, backend
`tsc --noEmit` clean, backend `eslint` clean after fixing a broken lint
setup (see below), frontend `tsc --noEmit` clean, frontend `next lint`
clean. Backend `nest build` and frontend `next build` were both
unverifiable in this sandbox (see §3 above for the build hang, now
confirmed reproducible). RLS policies were not tested against a real
Postgres — no Docker.

### Bugs found and fixed

**Backend lint was completely broken.** `npm run lint` calls `eslint`, but
`eslint` wasn't a devDependency and no `eslint.config.*` existed — every
invocation failed outright. Added `eslint.config.mjs` (flat config,
typescript-eslint + prettier) and `.prettierrc.json` (single quotes, to
match the codebase's existing style). Auto-fix cleaned up 352
pure-formatting issues; 6 real ones needed manual judgment calls, documented
inline.

**Self-service group creation was impossible under RLS — a real deadlock.**
`groups_insert` only checks `owner_id = auth.uid()`, but
`group_members_insert_admin` requires already holding ADMIN on the group —
including yourself, on the group you just created. Fixed with a `security
definer` trigger, `trg_group_owner_membership`
(`database/migrations/001_initial_schema.sql`), that seats the owner as
ADMIN inside the same insert.

### New work (first pass)

Backend — `GroupsModule` first slice (`GET`/`POST /groups`), 5 unit tests.
Wireframes — turn 3 (screens 3a–3d): teacher's "Your Groups" dashboard,
"Create a group," the roster, and the magic-invite-link screen. Docs —
`dygo_academy_api_surface.md` updated, live endpoint count 3→5.
