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
| **Live** | 2 | Exists and responds today. Verified from the boot-time OpenAPI document. |
| **Specified** | 6 | Named verbatim in `dygo_academy_tech_spec_and_conventions.md` §3.4 or in `dygo_academy_complete_system_architecture_master.md`. The only endpoints committed to in writing. |
| **Implied** | 44 | Derived from the BRD's functional requirements. **Carries no authority** — review before treating as a plan. |

> **The live API is the authority, not this file.** Swagger is generated from the
> code at boot and cannot go stale: **http://localhost:3001/api/docs**. This
> document exists for the part Swagger cannot show — what is coming, and on what
> evidence. It *will* drift the moment a route is added.

---

## 2. Live today

**2 operations · Phase 0**

Four other controllers are registered — `words`, `srs`, `billing`,
`notifications` — but declare no routes, so they answer `404`, not `401`.

| Method | Path | Auth | Returns |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | public | Liveness plus a real `select 1` against Postgres. The only route exempt from the global guard. |
| `GET` | `/api/v1/topics` | bearer | Topics visible to the caller, with word counts. The SQL carries **no** tenant or membership filter — Row-Level Security does the filtering inside Postgres. |

---

## 3. Named in the specification

**6 operations · quoted, not inferred**

| Method | Path | Status | Source & purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/words` | spec | Tech spec §3.4 — ingest a word. Must return `201` with status `ENRICHING` in **< 50 ms**. |
| `GET` | `/api/v1/topics` | **live** | Tech spec §3.4 — list public and private topics. Built. |
| `GET` | `/api/v1/topics/:topicId/cards/due` | spec | Tech spec §3.4 — the SRS review queue. Carries the **p95 < 15 ms** SLO. |
| `POST` | `/api/v1/srs/rate` | spec | Tech spec §3.4 — submit a review rating (`AGAIN` / `HARD` / `GOOD` / `EASY`). |
| `POST` | `/api/v1/billing/checkout` | spec | Tech spec §3.4 — create a Stripe checkout session. See the conflict below. |
| `POST` | `/api/v1/notifications/subscribe` | spec | Architecture §4 sequence diagram — register a VAPID endpoint with `p256dh` and `auth` keys. |

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

**44 operations · inferred, needs review**

No document names these. Each is derived from a functional requirement that
cannot be satisfied without it — a teacher who can invite students needs
somewhere to create the invite. **Treat this as a proposal to argue with, not a
plan of record.**

Paths below omit the `/api/v1` prefix for readability.

### Module 1 — Groups, topics & RBAC · Phase 1

| Method | Path | Min role | Requirement |
| :--- | :--- | :--- | :--- |
| `GET` | `/groups` | member | FR-1.1 — groups the caller belongs to |
| `POST` | `/groups` | any | FR-1.1 — create a class or workspace |
| `PATCH` | `/groups/:id` | ADMIN | FR-1.2 — rename, toggle visibility |
| `DELETE` | `/groups/:id` | ADMIN | FR-1.2 — ADMIN only |
| `GET` | `/groups/:id/members` | WRITE | FR-1.2 — roster. READ members cannot enumerate classmates |
| `PATCH` | `/groups/:id/members/:userId` | ADMIN | FR-1.2 — assign role |
| `DELETE` | `/groups/:id/members/:userId` | ADMIN | FR-1.2 — revoke access |
| `POST` | `/groups/:id/invites` | ADMIN | FR-1.3 — mint a magic link. Raw token returned once, never stored |
| `GET` | `/groups/:id/invites` | ADMIN | FR-1.3 — list live invites |
| `DELETE` | `/invites/:id` | ADMIN | FR-1.3 — revoke |
| `POST` | `/invites/:token/redeem` | any | FR-1.3 — join. Runs as `service_role`: the joiner is not yet a member, so RLS cannot see the group for them |
| `POST` | `/topics` | WRITE | FR-1.1 |
| `GET` | `/topics/:id` | READ | FR-1.1 — detail with words |
| `PATCH` | `/topics/:id` | WRITE | FR-1.2 |
| `DELETE` | `/topics/:id` | ADMIN | FR-1.2 — WRITE explicitly **cannot** delete a topic |
| `POST` | `/topics/:id/clone` | any | FR-1.1 — public topics are "searchable, cloneable" |

### Module 2 — Word ingestion & AI enrichment · Phase 1

| Method | Path | Min role | Requirement |
| :--- | :--- | :--- | :--- |
| `GET` | `/topics/:topicId/words` | READ | FR-2.1 — list with enrichment status |
| `GET` | `/words/:id` | READ | Phase 1 frontend polls this for `ENRICHING → READY` |
| `PATCH` | `/words/:id` | WRITE | FR-1.2 — edit custom notes |
| `DELETE` | `/words/:id` | WRITE | Module 1 permission matrix |
| `POST` | `/words/:id/re-enrich` | WRITE | Tech spec §4.1 — WRITE may "trigger re-enrichment" |
| `GET` | `/lexicon/search` | any | FR-2.2 — backed by the trigram index on `master_lexicon` |

### Modules 3 & 4 — SRS engine and flashcards · Phase 2

| Method | Path | Min role | Requirement |
| :--- | :--- | :--- | :--- |
| `GET` | `/srs/due` | self | FR-3.4 — all due cards, not scoped to one topic |
| `GET` | `/srs/leeches` | self | FR-3.3 — ≥ 4 failures in 7 days |
| `GET` | `/srs/stats` | self | FR-8.1 — streaks, mastery projection |
| `POST` | `/srs/sessions` | self | FR-4.3 — start a session in standard, reverse or listening mode |
| `POST` | `/srs/sync` | self | Architecture §1 — offline review logs replayed on reconnect |

### Module 5 — Dynamic quizzes · Phase 3

| Method | Path | Min role | Requirement |
| :--- | :--- | :--- | :--- |
| `POST` | `/quizzes/generate` | READ | FR-5.1–5.4 — cloze, dictation, matching, contextual choice |
| `POST` | `/quizzes/:id/answer` | self | FR-5.5 — returns the AI nuance explanation on a wrong answer |
| `GET` | `/quizzes/leech-drill` | self | FR-3.3 — the remedial queue |

### Module 6 — Push & habit scheduling · Phase 3

| Method | Path | Min role | Requirement |
| :--- | :--- | :--- | :--- |
| `DELETE` | `/notifications/subscribe` | self | Unsubscribe a dead endpoint |
| `GET` | `/schedules` | self | FR-6.1 |
| `POST` | `/schedules` | self | FR-6.1 — local time plus IANA timezone |
| `PATCH` | `/schedules/:id` | self | FR-6.1 — change time, enable, disable |
| `DELETE` | `/schedules/:id` | self | FR-6.1 |
| `POST` | `/groups/:id/sprints` | WRITE | FR-6.2 — teacher-triggered class-wide alert |

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
| `EnrichmentProcessor` | `enrichment-queue` | partial | The `master_lexicon` cache lookup (FR-2.2) is implemented and returns early on a hit — no Gemini call is made for a word already in the global lexicon. The Gemini and TTS calls themselves land in Phase 1. |
| `NotificationProcessor` | `notification-queue` | stub | Now genuinely receiving a job every 15 minutes, but only logs the tick. The timezone match against `study_schedules` and the VAPID dispatch land in Phase 3. |
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

> **Open question for Phase 2.** `user_word_srs.recent_mistakes` is the
> `M_recent` term in FR-3.1's formula, but it is a plain counter with no
> mechanism to age entries out of the 7-day window. Either recompute it on read
> from `review_logs` (which has the timestamps) or decay it on a schedule — the
> latter would add a third repeating job here. The specification does not answer
> this; it should be settled before the SRS engine is implemented.

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
