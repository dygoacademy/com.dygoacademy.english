# Dygo Academy

AI-powered collaborative vocabulary platform — automated word enrichment (dual-accent IPA, neural audio, CEFR-graded synonyms and examples), error-adaptive spaced repetition, and multi-tenant classroom groups with granular RBAC.

> **Project status — Phases 0–3 code-complete; Module 8 (analytics + the
> class mistake heatmap) is code-complete too, a brand-new signup can
> now actually create their first group, and the roster now shows every
> member's real name — even one who joined via a redeemed invite link.**
> *(2026-09-01)* Groups/RBAC, AI word enrichment, the error-adaptive SRS
> flashcard player, the multi-modal quiz engine, web push/habit scheduling,
> and student + teacher analytics are all built on both backend and
> frontend. **Module 7 (Stripe seat billing) is the one thing still fully
> open** — deliberately not started this close to UAT; see the schedule
> doc's Phase 4 section. UAT is scheduled for the morning of 2026-09-02 —
> see
> [`dygo_academy_session_report_2026-09-01.md`](dygo_academy_session_report_2026-09-01.md)
> (tenth pass) for exactly what to click through, and
> [`dygo_academy_master_project_schedule.md`](dygo_academy_master_project_schedule.md)
> for the full 12-week plan and per-phase status notes. **None of this has
> run against a live Postgres/GoTrue/Redis stack** — every session so far
> ran in a sandbox with no Docker; verify against a real `docker compose up`
> before trusting this status banner over your own boot, and watch
> `008_profiles_group_visibility.sql`'s migration output closely since it
> has never actually executed anywhere yet either.

---

## Quick start

Already have Docker running and `.env` filled in? The whole loop is five commands:

```bash
cp .env.example .env                      # then fill in the secrets — see step 1
docker compose up -d                      # Postgres, Kong, Studio, Redis, MinIO
./database/apply-migrations.sh --seed     # schema + RLS + indexes + fixtures
cd com.dygoacademy.backend && npm install && npm run start:dev
cd ../com.dygoacademy.frontend && npm install && npm run dev
```

Then open http://localhost:3001/api/docs and authorize with
`npm run token alex` for API-level testing, or http://localhost:3000/login
and sign in as `sarah@dygo.test` / `dygo-dev-2026` (marco/alex/priya/dana
share the same password — see `database/migrations/004_seed_data.sql`'s
own header comment) for the actual frontend. Each step is expanded below.

---

## Prerequisites

| Tool | Version | Notes |
| :--- | :--- | :--- |
| **Docker Desktop** | 4.x+ | Must be running before any command below. Allow it ~10 GB of disk. |
| **Node.js** | 20 LTS | Required to run the API (step 4). |
| **Git** | any | |

---

## 1. Install

```bash
git clone <your-remote> DygoAcademy
cd DygoAcademy

# Create your local environment file from the template.
cp .env.example .env

# The migration runner needs to be executable.
chmod +x database/apply-migrations.sh
```

> **Before your first commit:** `.env` is currently tracked by git. A
> `.gitignore` is in place, but git keeps tracking files it already knows
> about, so untrack it explicitly — otherwise your JWT signing secret, Stripe
> key and VAPID private key go into the repository:
>
> ```bash
> git rm --cached .env && git commit -m "Stop tracking .env"
> ```

Then open `.env` and set the values that must not stay at their defaults:

| Variable | What to do |
| :--- | :--- |
| `SUPABASE_JWT_SECRET` | Any string ≥ 32 chars. Everything else is derived from it. |
| `SUPABASE_ANON_KEY`<br>`SUPABASE_SERVICE_ROLE_KEY` | **Must be real HS256 JWTs signed with the secret above** — see below. |
| `PG_META_CRYPTO_KEY` | `openssl rand -hex 16` |
| `POSTGRES_PASSWORD` | Any local password. |
| `GEMINI_API_KEY`, `STRIPE_SECRET_KEY`, `VAPID_*` | Real keys only when you reach the phase that uses them; mock values are fine until then. |

### Generating the anon / service_role keys

These are not random strings — they are JWTs signed with `SUPABASE_JWT_SECRET`.
Kong's `key-auth` plugin and PostgREST both reject anything else, so a
placeholder here produces 401s on every API call.

```bash
python3 - <<'EOF'
import hmac, hashlib, base64, json, time, re
b64 = lambda b: base64.urlsafe_b64encode(b).rstrip(b'=').decode()
secret = re.search(r'^SUPABASE_JWT_SECRET=(.*)$', open('.env').read(), re.M).group(1).strip()

def make(role):
    hdr = b64(json.dumps({"alg":"HS256","typ":"JWT"}, separators=(',',':')).encode())
    iat = int(time.time()); exp = iat + 10*365*24*3600
    pl  = b64(json.dumps({"iss":"supabase","role":role,"iat":iat,"exp":exp}, separators=(',',':')).encode())
    msg = f"{hdr}.{pl}"
    return f"{msg}.{b64(hmac.new(secret.encode(), msg.encode(), hashlib.sha256).digest())}"

print("SUPABASE_ANON_KEY=" + make("anon"))
print("SUPABASE_SERVICE_ROLE_KEY=" + make("service_role"))
EOF
```

Paste both lines into `.env`, replacing the existing entries. **Regenerate both
whenever you change `SUPABASE_JWT_SECRET`** — a mismatched pair fails silently
as authentication errors rather than an obvious startup crash.

---

## 2. Start

```bash
docker compose up -d
docker compose ps
```

First run pulls roughly 3 GB of images and takes a few minutes. Every service
should reach `running` (most report `healthy`); `dygo_minio_createbucket` is a
one-shot job and correctly shows `exited (0)`.

| Service | Container | URL / Port | Purpose |
| :--- | :--- | :--- | :--- |
| PostgreSQL | `dygo_supabase_db` | `localhost:5432` | Database (Supabase Postgres 17) |
| Kong | `dygo_supabase_kong` | http://localhost:8000 | API gateway — the single entry point |
| Studio | `dygo_supabase_studio` | http://localhost:54323 | Database dashboard |
| GoTrue | `dygo_supabase_auth` | via Kong `/auth/v1/` | Authentication |
| PostgREST | `dygo_supabase_rest` | via Kong `/rest/v1/` | Auto-generated REST API |
| Storage | `dygo_supabase_storage` | via Kong `/storage/v1/` | Object storage (S3 backend → MinIO) |
| postgres-meta | `dygo_supabase_meta` | internal `:8080` | Backs Studio's schema browser |
| Redis | `dygo_redis` | `localhost:6379` | BullMQ queues + SRS cache |
| MinIO | `dygo_minio` | http://localhost:9001 | Local S3 (console login = `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY`) |

Use `localhost`, not `0.0.0.0` — the latter is a bind address, and some browser
APIs treat it as a non-secure context.

**Stop** with `docker compose down`. Add `-v` to also destroy the database
volume — see the reset note in step 3.

---

## 3. Migrate database

```bash
./database/apply-migrations.sh            # schema + RLS + indexes (001-003)
./database/apply-migrations.sh --seed     # ...plus development fixtures (004)
./database/apply-migrations.sh --test     # ...plus fixtures, then the RLS suite
```

On a database that is **already migrated**, use the `-only` flags instead —
re-running `001-003` would fail on "already exists":

```bash
./database/apply-migrations.sh --seed-only           # add fixtures to an existing schema
./database/apply-migrations.sh --qa-seed-only        # add the optional 3rd-tenant QA fixture (011)
./database/apply-migrations.sh --qa-words-seed-only  # add 100 sample words on top of 011 (012)
./database/apply-migrations.sh --test-only           # run the RLS suite (needs fixtures)
./database/apply-migrations.sh --verify              # report what is actually installed
```

| File | Contents |
| :--- | :--- |
| `001_initial_schema.sql` | 12 tables, 5 enums, `review_logs` partitioned monthly |
| `002_rls_policies.sql` | Multi-tenant Row-Level Security, ADMIN > WRITE > READ |
| `003_indexes.sql` | Performance and partial indexes |
| `004_seed_data.sql` | Dev fixtures — **never run against production** |
| `011_qa_test_tenant_seed.sql` | Optional 3rd-tenant QA fixture (independent of 004, `--qa-seed-only`) — see its own header |
| `012_qa_bulk_words_seed.sql` | 100 real words across 5 topics inside 011's QA group (`--qa-words-seed-only`, needs 011 loaded first) |

`--test` runs 47 assertions (was 45 as of the 9th pass; the 10th pass's own
addition, section I, covers the roster-visibility fix — see
`008_profiles_group_visibility.sql`) proving cross-tenant isolation, that a student's
SRS progress is unreadable even by their teacher, that a `READ` member cannot
add words or enumerate the class roster, that `WRITE` cannot delete a topic,
and that self-promotion to `ADMIN` is blocked. Expect it to end with
`ALL RLS CHECKS PASSED`.

> **Migrations are not idempotent.** They use plain `CREATE`, so running them
> twice fails on "already exists". Init scripts also only run on an empty data
> directory. To start over:
>
> ```bash
> docker compose down -v && docker compose up -d
> ./database/apply-migrations.sh --seed
> ```

### Seeded logins

`004_seed_data.sql` creates two tenants so isolation can be exercised by hand.
All fixture accounts use `@dygo.test` addresses and fixed UUIDs.

| User | Role | Tenant |
| :--- | :--- | :--- |
| `sarah@dygo.test` | `ADMIN` (tutor, owns the class) | Oxford English Center |
| `marco@dygo.test` | `WRITE` (co-teacher) | Oxford English Center |
| `alex@dygo.test` | `READ` (student) | Oxford English Center |
| `priya@dygo.test` | `READ` (student) | Oxford English Center |
| `dana@dygo.test` | `ADMIN` | Rival Academy — must never see Oxford data |

---

## 4. Run the API

```bash
cd com.dygoacademy.backend
npm install
npm run start:dev      # watch mode
```

| Endpoint | |
| :--- | :--- |
| http://localhost:3001/api/v1 | API root (URI-versioned) |
| http://localhost:3001/api/docs | Swagger UI — click **Authorize** and paste an access token |
| http://localhost:3001/api/v1/health | Liveness + database check (public) |

The API connects to Postgres as `authenticator`, the same role PostgREST uses,
and sets the caller's JWT claims per transaction — so the **RLS policies
enforce on API traffic too**. Service methods therefore contain no tenant or
membership filtering; PostgreSQL does it. Don't add `WHERE tenant_id = ...` to
a query "for safety": it duplicates policy logic and creates a second place for
it to go wrong.

Authentication is global and **opt-out** via the `@Public()` decorator, not
opt-in. A controller added later is protected by default.

Requires the Docker stack (step 2) to be running for Postgres and Redis.

### Getting a token to test with

Every route except `/health` returns `401 Missing bearer token` without one —
that is the guard working, not a misconfiguration. The seeded fixture users are
inserted directly into `auth.users` with no password, so they cannot sign in
through GoTrue. Mint a token for them instead:

```bash
cd com.dygoacademy.backend
npm run token                  # list the fixture users
npm run token alex             # print a token (valid 12h)
npm run token alex --curl      # print a ready-to-paste curl command
```

Paste the token into Swagger's **Authorize** dialog, or use it directly:

```bash
curl -s -H "Authorization: Bearer $(npm run --silent token alex)" \
  http://localhost:3001/api/v1/topics | python3 -m json.tool
```

Run the same request as `alex` and then as `dana` — they are in different
tenants, and the response differs even though the endpoint's SQL contains no
tenant filter. That is RLS doing the work.

The script signs tokens with `SUPABASE_JWT_SECRET`, so it is **local
development only**. Real users get their tokens from GoTrue via the frontend.

---

## 5. Run the frontend

```bash
cd com.dygoacademy.frontend
cp .env.example .env.local     # NEXT_PUBLIC_API_URL, Supabase URL + anon key
npm install
npm run dev
```

| Endpoint | |
| :--- | :--- |
| http://localhost:3000 | App Router shell — landing page, (auth) and (dashboard) route groups |
| http://localhost:3000/api/health | Route Handler placeholder, returns `{ "status": "ok" }` |

Phase 0 wires the scaffold end to end: App Router, Tailwind CSS + shadcn/ui
design tokens (`src/components/ui`), TanStack Query (`src/components/layout/QueryProvider.tsx`),
Zustand (`src/stores/useStudySessionStore.ts`), and Supabase Auth session
clients (`src/lib/supabase/{client,server,middleware}.ts`) that call the
NestJS API through `src/lib/api-client.ts`. `src/middleware.ts` refreshes
the session on every request and redirects a signed-out visitor away from
`(dashboard)` routes; the layout re-checks server-side as defense in
depth. `src/config/env.ts` validates the vars below at boot the same way
the backend does — missing or malformed `NEXT_PUBLIC_*` fails immediately
with a clear message instead of a runtime error three components deep.
The `(auth)` and `(dashboard)` routes still render placeholders — real
screens and the login form land in Phase 1.

Requires the backend (step 4) to be running for `/api/v1/topics` to resolve;
the landing page itself has no data dependency.

---

## 6. Run the live-stack integration tests

```bash
cd com.dygoacademy.automationtesting
npm install
npm test
```

`com.dygoacademy.automationtesting/` is a separate package from
`com.dygoacademy.backend`'s own `npm test` (Jest unit tests, everything below
the service layer mocked). This one hits a **running backend + seeded
Postgres directly** over real HTTP — real guards, real RLS, no mocks — so it
needs steps 3 and 4 above done first, against a freshly-seeded database
(`apply-migrations.sh --seed`; several specs assume a one-time seed state,
e.g. `words-enrichment.spec.ts`'s FAILED→ENRICHING re-enrich case, and note
in a comment when they'll no-op instead of false-failing on a re-run without
a re-seed). It mints its own JWTs for the seeded fixture users
(`api/support/token.ts`, the same signing scheme as
`com.dygoacademy.backend/scripts/dev-token.js`) so it never touches GoTrue,
and reads `SUPABASE_JWT_SECRET` from the repo-root `.env` automatically. Set
`API_BASE_URL` if the backend isn't on `http://localhost:3001/api/v1`.

Coverage is one spec file per built module (`groups-rbac`, `topics`,
`words-enrichment`, `srs`, `quizzes`, `analytics`, `notifications`) — RBAC/
tenant-isolation boundaries, the async enrichment pipeline actually
settling, SRS due/leech/rating math, quiz generation and grading, the
heatmap's admin-only + no-PII contract, and notification/schedule/rate-limit
behavior. Module 7 (billing) has no spec — there's no route to test yet.
This suite has never been run in this project's own dev sandbox (no
Docker there); it's written for whoever runs it against a real Docker
Compose stack, including UAT.

---

## Verify the stack end to end

```bash
# Should print 200 — proves Kong's key-auth, the rendered gateway config,
# PostgREST and your generated anon key all line up.
curl -s -o /dev/null -w 'rest:    %{http_code}\n' \
  -H "apikey: $(grep '^SUPABASE_ANON_KEY=' .env | cut -d= -f2)" \
  http://localhost:8000/rest/v1/

curl -s -o /dev/null -w 'storage: %{http_code}\n' \
  -H "Authorization: Bearer $(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env | cut -d= -f2)" \
  http://localhost:8000/storage/v1/bucket
```

A `401` means your keys don't match `SUPABASE_JWT_SECRET` — regenerate them.

---

## Troubleshooting

Every item below is a failure that actually occurred while bringing this stack
up. They are recorded because none of them announce their real cause.

**A container restart-loops immediately.**
Check that every bind-mount *source* is a file: `ls -la supabase/ database/init/`.
Docker silently creates a **directory** when a bind-mount source path doesn't
exist, so a missing `kong.yml` becomes a folder and Kong crashes trying to
parse it.

**Kong exits 127.**
127 is "command not found" — and the missing command is usually the entrypoint
itself. `kong/kong` ships `/entrypoint.sh`; the Docker Official `kong` image
ships `/docker-entrypoint.sh`. They are not interchangeable.

**Every API call returns 401 although Kong reports healthy.**
Kong does not expand environment variables in its declarative config.
`supabase/kong.yml` is a *template* rendered by `supabase/kong-entrypoint.sh`;
if that rendering is bypassed, the literal string `${SUPABASE_ANON_KEY}` is
stored as the API key and no request ever matches. Kong stays green throughout.

**GoTrue crash-loops on `password authentication failed for user "supabase_auth_admin"`.**
The Postgres image creates that role without a usable password;
`database/init/99-roles.sql` sets it. This only runs on a fresh volume —
`docker compose down -v`.

**Postgres fails init with `role "supabase_admin" does not exist`.**
Something set `POSTGRES_USER` on the db service. Don't — the Supabase image
bootstraps its superuser as `supabase_admin` and its own `migrate.sh` connects
as that role.

**`docker-entrypoint.sh: ignoring /docker-entrypoint-initdb.d/init-scripts`.**
Harmless. The stock entrypoint doesn't recurse into subdirectories; Supabase's
`migrate.sh` processes them immediately afterwards.

**Studio returns 500 on `/api/platform/pg-meta/...`.**
`PG_META_CRYPTO_KEY` is missing from `.env`.

**`error creating temporary lease: ... input/output error`.**
Not a config problem — Docker Desktop's disk image is full or its containerd
metadata is corrupt. Check `df -h /` and `docker system df`, then
`docker system prune -a`, or Docker Desktop → Troubleshoot → Clean / Purge data.

### Known issue

Resumable (TUS) uploads to `/storage/v1/upload/resumable` currently return 500.
Bucket listing and ordinary uploads work. Under investigation — the suspects
are missing TUS environment variables and S3 multipart/ETag behaviour between
storage-api and MinIO. Not a blocker for Phase 0 or 1.

---

## Layout

```
DygoAcademy/
├── docker-compose.yml              # Local Supabase, Redis & MinIO stack
├── .env.example                    # Template — copy to .env, never commit .env
├── database/
│   ├── apply-migrations.sh         # Migration runner
│   ├── init/                       # Container bootstrap (runs on empty volume only)
│   ├── migrations/                 # 001–004, applied in order
│   └── tests/                      # RLS verification suite
├── supabase/
│   ├── kong.yml                    # Gateway routes (a TEMPLATE — see above)
│   └── kong-entrypoint.sh          # Renders the template, then starts Kong
├── com.dygoacademy.backend/        # NestJS API — scaffolded
│   ├── scripts/dev-token.js        # Mint tokens for fixture users (dev only)
│   └── src/
│       ├── common/                 # Guards, interceptors, filters, decorators
│       ├── config/                 # Config + boot-time env validation
│       ├── database/               # pg Pool with per-request RLS context
│       ├── health/                 # Public liveness + dependency check
│       ├── modules/                # topics, words, srs, billing, notifications
│       ├── queues/                 # BullMQ queue names & job payload schemas
│       └── workers/                # enrichment + notification processors
├── com.dygoacademy.frontend/       # Next.js App Router — scaffolded
│   ├── .env.example                 # NEXT_PUBLIC_* template — copy to .env.local
│   └── src/
│       ├── app/                     # (auth), (dashboard) route groups + api/
│       ├── components/ui/           # shadcn/ui primitives (button, card, ...)
│       ├── hooks/                   # Custom hooks — empty until Phase 1+
│       ├── lib/                     # supabase/{client,server,middleware}.ts, api-client.ts, utils.ts
│       ├── config/                  # env.ts — zod-validated, fail-fast
│       ├── constants/               # routes.ts — single source of truth for path strings
│       ├── types/                   # Domain types mirroring backend DTOs & DB schema
│       └── stores/                  # Zustand stores (useStudySessionStore.ts)
└── com.dygoacademy.automationtesting/  # Live-stack integration tests (see step 6) — no mocks
    └── api/
        ├── specs/                  # One file per built module
        └── support/                # client.ts, token.ts, fixtures.ts (mirrors 004_seed_data.sql)
```

## Documentation

| Document | Contents |
| :--- | :--- |
| [Master BRD](dygo_academy_final_master_brd.md) | Product vision, 8 functional modules, NFR/SLO targets |
| [System Architecture](dygo_academy_complete_system_architecture_master.md) | Subsystem diagrams, ERD, billing flows |
| [Tech Spec & Conventions](dygo_academy_tech_spec_and_conventions.md) | Stack matrix, directory structure, naming rules |
| [Frontend Architecture](dygo_academy_frontend_architecture.md) | Request flow, auth guard, state ownership, performance strategy, extension checklist |
| [Project Schedule](dygo_academy_master_project_schedule.md) | 12-week, 6-sprint phased plan |
| [Competitive Analysis](dygo_academy_competitive_analysis.md) | Market positioning vs. Anki, Quizlet, Memrise |
