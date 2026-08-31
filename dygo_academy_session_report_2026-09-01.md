# Dygo Academy — session report, 2026‑09‑01 (updated, second pass)
**Run**: automated scheduled task, no user present. UAT is scheduled for tomorrow morning (2026‑09‑02).
This file covers two runs today: the original Phase 1 kickoff (Groups + Words
first slice) and a second pass that finished the rest of Module 1. Original
content is preserved below under "§0–6, first pass" where it's still accurate;
everything above that is the current state.

---

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
