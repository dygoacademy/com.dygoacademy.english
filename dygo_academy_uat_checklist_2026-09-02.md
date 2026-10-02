# Dygo Academy — UAT test script (2026-09-02 morning)

Consolidated from the thirteen automated development passes' individual
"UAT checklist for tomorrow" sections scattered across
`dygo_academy_session_report_2026-09-01.md` (checklists appended by the
6th through 12th passes, each superseding or adding to the last). This is
the single script to actually run tomorrow — it supersedes all of those;
they don't need to be read separately. Written by the 13th pass.

> **2026-10-02 update (Phase 12 UI-8): new UI and URLs.** The classic UI is
> gone; the garden is the only signed-in UI. Signed-in `/` lands on
> `/garden` (not `/topics`). Screens: `/garden` home, `/review` (was
> `/study`), `/topics`, `/topics/:id`, `/missions`, `/me` (replaces
> `/analytics` and `/settings`), `/groups/**`, `/quiz`, `/join/:token`.
> Old links redirect permanently: `/garden/<x>/**` → `/<x>/**`, `/study` →
> `/review`, `/analytics` and `/settings` → `/me`. Read the paths in the
> sections below with that mapping. Extra checks: open an old
> `/garden/review` and `/study` bookmark and confirm the redirect; on a real
> iPhone (bottom tab bar) and iPad (rail ≥ 600px, sidebar ≥ 1024px) walk
> every screen in English and Vietnamese.

## Read this first: what's genuinely untested

Every check below has passed unit tests and static analysis (159/159
backend jest, clean `tsc`/lint both sides) in a sandbox with **no Docker**.
That means three things have *never actually run* anywhere before
tomorrow, and UAT is the first real signal on all three:

1. **The database migrations and all 63 RLS assertions** — reasoned
   through against policy text and mocked queries only, never against a
   live Postgres. (Was 47 as of the 16th pass, 54 as of the 17th (item 24
   below), now 63 as of the 19th pass's item 25 — this line has gone stale
   after each of the last three passes added assertions, so double-check
   the real count in `rls_test.sql` rather than trusting this number by
   the time you read it.)
2. **`npm run build` on the frontend** — hung with no output ~170s in,
   identically, across all 12 automated sessions. Unknown whether this is
   a real bug or an artifact of that specific sandbox. If it also hangs on
   whatever machine runs UAT, treat it as a P0 — it would mean this is a
   real, previously-invisible problem, not a sandbox quirk.
3. **Anything touching a real browser** — IndexedDB (offline sync), the
   `online` event, Web Push/VAPID, actual clipboard/devtools interaction.

Two things are **intentionally not built** — do not report these as bugs:

- **Module 7 (Stripe seat billing)** — `billing/*` is a deliberate empty
  scaffold. Every pass from the 7th through the 13th considered starting
  it and declined, on the reasoning that a live payment integration is
  the wrong thing to build hours before feedback that might redirect it.
  It's the top item for whichever pass runs first after this UAT.
- **"Write it myself" manual word entry** (the FAILED word state's second
  button, screen 1l) — no endpoint, no design beyond a wireframe caption.
  As of the 12th/13th pass it renders visibly disabled (dashed, muted,
  labeled "soon") rather than silently doing nothing.

## Setup

```
docker compose up -d && ./database/apply-migrations.sh --test   # watch for ANY error, not just the final "ALL RLS CHECKS PASSED" line (47 assertions)
./database/apply-migrations.sh --seed                             # five fixtures below
cd com.dygoacademy.backend && npm run start:dev                   # Swagger at /api/docs
cd com.dygoacademy.frontend && npm run dev                        # localhost:3000
```

Seeded accounts (all password `dygo-dev-2026`): `sarah@dygo.test` (ADMIN,
owns "Oxford English Center"), `marco@dygo.test` (WRITE), `alex@dygo.test`
(READ), `priya@dygo.test`, `dana@dygo.test`.

## A. Registration, auth, solo tenant

1. Register a **brand-new** account (not one of the five above). Confirm
   it lands on `/garden`, then confirm `POST /groups` succeeds and you
   land on the new group as ADMIN — this only works because every signup
   now auto-provisions a personal 0-seat tenant (fixed 9th pass; before
   that, any non-seeded user's first `POST /groups` failed outright).
2. Sign in as `sarah@dygo.test`. Confirm the session lands on `/garden`
   and the Navbar shows five tabs including "Groups."

## B. Groups, roster, invites

3. As Sarah, open Groups → Oxford English Center. Confirm the roster
   shows Marco/Alex/Priya **by name**, not a UUID (fixed 7th/8th pass).
4. Mint an invite link, copy the `/join/:token` URL, then revoke a
   separate link and confirm the revoked one no longer redeems.
5. Open the still-valid invite link in a private window, redeem it as a
   **second brand-new account** (not one of the five seeded fixtures —
   those already have real tenants and won't exercise this fix). Confirm
   it redeems, then as Sarah reopen the roster and confirm that new
   member's **real name shows, not a blank cell** — this is the fix the
   10th pass shipped (`shares_group_with()` / migration `008`); the
   seeded-fixture version of this check (a fixture redeeming into
   someone else's group) doesn't hit the bug at all, so it must be a
   genuinely fresh account.
6. As Sarah, attempt to remove herself as the group's last ADMIN. Confirm
   `409`, not a silent success.
7. As Marco (WRITE), confirm the delete-topic and remove-member controls
   don't render at all for him — not disabled, absent.

## C. Topics & word ingestion/enrichment

8. Create a topic, add a word. Confirm it shows `ENRICHING` then flips to
   `READY` on its own via polling — no manual page refresh.
9. Produce a `FAILED` word (temporarily break `GEMINI_API_KEY`, or wait
   for an organic Gemini failure). Confirm the card shows "Try again" and
   a visibly muted/dashed "Write it myself." Click "Try again": confirm
   it flips to the `ENRICHING` visual immediately, then resolves to
   `READY` (or `FAILED` again if the underlying cause is still present)
   with no manual refresh — this is `POST /words/:id/re-enrich`, new in
   the 12th pass.
10. Delete a word as ADMIN; confirm the same action is unavailable to a
    WRITE-role member.

## D. SRS & flashcards

11. Review at `/review`, rate several cards (again/hard/good/easy), confirm
    the deck reorders and due counts on `/me` and `/garden` move accordingly.
12. In devtools, go offline (Network tab → Offline), rate a card: confirm
    it still advances immediately rather than waiting on the network.
    Reconnect and confirm the rating lands within a few seconds without a
    manual refresh — check the `dygo-offline-queue` IndexedDB store
    (`pending-reviews`) is empty afterward, or that `/srs/stats`'s counts
    moved. This is the offline-first queue shipped in the 11th pass;
    there is no way it has ever been checked in a real browser before now.

## E. Quizzes

13. From a topic, click "Quiz." Confirm a mix of CLOZE / DICTATION /
    MATCHING / CONTEXTUAL_CHOICE questions. Answer one wrong on purpose
    and confirm a real AI-generated nuance explanation appears (needs a
    working `GEMINI_API_KEY`), not a generic fallback string.
14. From the home screen's leech nudge, click "Fix →" and confirm it
    lands on the leech-drill quiz, not a dead end.

## F. Push notifications & habit scheduling

15. In Settings ("You" tab), turn on push, accept the browser permission
    prompt, add a reminder time, confirm it appears in the list, remove
    it, confirm it's gone.
16. Set real `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`,
    subscribe a real browser, schedule a reminder a few minutes out, wait
    for the `notification-tick-every-15m` job (or trigger it manually).
    Confirm a real push arrives and tapping it opens `/study` (now 308 → `/review`) or
    `/quiz?mode=leech`.
17. As a group ADMIN, trigger a class sprint twice in quick succession.
    Confirm the second call returns `429` with a `retryAfterSeconds`
    body, and that a third call succeeds after that cooldown (the limiter
    is in-process and resets on an API restart — new in the 11th pass).
18. As a non-ADMIN, call the sprint route directly and confirm `403`.

## G. Analytics & the class mistake heatmap

19. As Sarah (ADMIN of a group), open "Progress." Confirm her own
    streak/mastered/due/leech numbers render, and below them a **"Class
    mistake heatmap"** card per group she administers, words ranked
    worst-first with a failure percentage that plausibly matches seeded
    review history.
20. As Alex (READ-only everywhere, administers no group), open
    "Progress." Confirm his own stats render but **no heatmap section
    appears at all** — not empty, not disabled, entirely absent. The
    underlying route is ADMIN-gated; this is checking the frontend
    doesn't even attempt the call.

## H. Billing — confirm it's *absent*, not broken

21. Confirm there is no billing UI anywhere in the running app and no
    working `/api/v1/billing/*` route. This is expected per the "read
    this first" section above, not something to file as a bug.

## I. Wireframes / UI-UX review

22. Open `Dygo Academy Wireframes.html` directly in a browser. Scroll
    through all eleven turns. Specifically re-check turn 1, screen **1l**
    (the FAILED word state) — its caption was updated this pass to
    describe "Try again" as live and "Write it myself" as an
    intentionally disabled stub; confirm that reads clearly against the
    actual running app's behavior from step 9 above.
23. Check turn **10** (screens 10a–10d, added the 14th pass) — the
    Module 7 seat-billing paywall's teacher/ADMIN-side wireframes —
    turn **11** (screens 11a–11d, added the 15th pass) — the
    card-decline/dunning follow-on (FR-7.3): in-app banner, past-due
    billing panel, the "email Stripe sends" mockup, and the suspended
    state — turn **12** (screens 12a–12c, added the 16th pass) — the
    academy-tier director rollup and cohort ROI export (BRD Journey 3,
    FR-8.2 widened tenant-wide) — turn **13** (screens 13a–13b, added
    the 17th pass) — the same rollup for a brand-new class under 7 days
    old, before there's a retention curve to draw — and the new
    **turn 14** (screens 14a–14b, added the 18th pass) — what 12c's
    export modal and the resulting emailed report look like when the
    selected range includes a class like 13a/13b, mid-window with real
    mistake data but no retention number yet. None of the five has
    ever been rendered in a real browser; confirm all display correctly
    (a JSON-escaping mistake would be the likely failure mode) before
    treating their content as reviewed design.
    Turn 13's opening note **partially corrects** turn 12's own note:
    turn 12 said "there is no tenant-level director role in the
    schema" and treated 12a's access model as a stand-in for one; it
    turns out `is_tenant_admin()` already exists and already grants
    exactly that reach — see item 24 below, which is the real,
    backend-side follow-up this correction produced, not just a
    wireframe caption fix. **Update from the 19th pass:** the tenant-wide
    rollup query itself is no longer unbuilt — `GET
    /api/v1/analytics/tenant/heatmap` ships the mistake-heatmap half of
    it (see item 25 below) — but nothing on the frontend calls it yet, so
    turns 12–14's screens are still ahead of what a director could
    actually open today; worth confirming during UAT whether wiring a
    real "Director rollup" screen to the new route is in scope before
    this release, or stays deferred like Module 7.
24. **New this pass (009_tenant_admin_read_expansion.sql):** run
    `./database/apply-migrations.sh` (which now runs 009) then
    `./database/apply-migrations.sh --test` and confirm section **J**
    of `rls_test.sql` passes — it asserts that a tenant admin (`ADMIN`
    of even one group) can now read a *sibling* group's roster and
    topics in the same tenant despite never having joined it
    (`group_members_select`/`can_read_group` previously granted this
    for `groups_select` and `tenant_seats_select` only), while a rival
    tenant's admin still cannot. This has never run against a real
    Postgres in the sandbox that wrote it — same standing limitation as
    everything else in this section — so section J passing for real is
    itself part of what this UAT run is confirming, not a given.
25. **New this pass (010_tenant_word_heatmap.sql):** with 009 and 010
    both applied and seeded, `GET /api/v1/analytics/tenant/heatmap` as
    `sarah@dygo.test` should return the same words/counts as `GET
    /api/v1/groups/bbbbbbbb-0000-0000-0000-000000000001/heatmap` (only
    her `ieltsClass` group has seeded review activity — `publicAwl`
    contributes nothing), each row additionally carrying `group_id`/
    `group_name`. The same call as `marco@dygo.test` (WRITE, ADMIN
    nowhere) or `alex@dygo.test` (READ) should `403`; as
    `dana@dygo.test` (Rival Academy ADMIN, a genuine tenant admin of a
    *different* tenant) it should `200` with an empty list, not a `403`
    — she's legitimately asking about her own tenant, which has no
    review activity in the seed data, and the route takes no `tenantId`
    param so there's no way for her to ask about Oxford's. Also run
    `./database/apply-migrations.sh --test` and confirm section **K** of
    `rls_test.sql` passes — it proves the aggregate genuinely spans
    multiple groups in one tenant (not just one group re-served under a
    new name) by inserting a second Oxford class mid-transaction and
    checking the totals actually change. Like item 24, this has never
    run against a real Postgres in the sandbox that wrote it.

## J. Build & regression (already run this pass, re-verify if anything above fails)

- Backend: `npm test` → 159/159 (was 153/153 through the 18th pass; the
  19th pass added `AnalyticsService.tenantHeatmap`'s 6 tests); `npx tsc
  --noEmit` → clean; `npm run lint` → clean.
- Frontend: `npx tsc --noEmit` → clean; `next lint` → clean.
- Frontend `npm run build` — **run this on whatever machine hosts UAT**;
  see point 2 under "Read this first."

## K. Live-stack integration tests (new the 16th pass — never run anywhere)

`com.dygoacademy.automationtesting/` (`npm install && npm test` after
Setup above) hits the running backend + seeded Postgres directly over
real HTTP, no mocks — one spec per built module (groups/RBAC, topics,
word enrichment, SRS, quizzes, analytics/heatmap, notifications). It
was written and typechecked in the sandbox but **has never actually
run against a live stack** (no Docker there) — this is its first real
execution anywhere. A handful of its own assertions are explicitly
one-shot against a freshly-seeded database (documented in code
comments, e.g. `words-enrichment.spec.ts`'s FAILED→ENRICHING case) and
will self-skip with a `console.warn` rather than false-fail on a
second run without a re-seed — that warning is expected, not a bug.
Treat any other failure here as a real regression signal alongside the
backend's own 159 unit tests, not a replacement for them. **19th pass:**
`analytics.spec.ts` gained a second `describe` block covering `GET
/analytics/tenant/heatmap` (item 25 above) — same never-run-yet caveat.
