# Dygo Academy

AI-powered collaborative vocabulary platform — automated word enrichment (dual-accent IPA, neural audio, CEFR-graded synonyms and examples), error-adaptive spaced repetition (FSRS-6, fed by both flashcards and quizzes), and multi-tenant classroom groups with granular RBAC.

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
> [`docs/reports/dygo_academy_session_report_2026-09-01.md`](docs/reports/dygo_academy_session_report_2026-09-01.md)
> (tenth pass) for exactly what to click through, and
> [`docs/product/dygo_academy_master_project_schedule.md`](docs/product/dygo_academy_master_project_schedule.md)
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
docker compose up -d                      # Postgres, Kong, Studio, Redis, RustFS, speech scorer
./database/apply-migrations.sh            # schema + all seed data (empty database)
cd com.dygoacademy.backend && npm install && npm run start:dev
cd ../com.dygoacademy.frontend && npm install && npm run dev
```

Then open http://localhost:3001/api/docs and authorize with
`npm run token alex` for API-level testing, or http://localhost:3000/login
and sign in as `sarah@dygo.test` / `dygo-dev-2026` (marco/alex/priya/dana
share the same password — see `database/seeds/01_core_fixtures.sql`'s
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
chmod +x database/apply-migrations.sh database/reset-db.sh database/restore-db.sh
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
should reach `running` (most report `healthy`); `dygo_rustfs_createbucket` is a
one-shot job and correctly shows `exited (0)`. The speech scorer is built
locally on the first run and downloads ~1.4 GB of models on its first start, so
it reports `healthy` about 90 s later than the rest.

| Service | Container | URL / Port | Purpose |
| :--- | :--- | :--- | :--- |
| PostgreSQL | `dygo_supabase_db` | `localhost:5432` | Database (Supabase Postgres 17) |
| Kong | `dygo_supabase_kong` | http://localhost:8000 | API gateway — the single entry point |
| Studio | `dygo_supabase_studio` | http://localhost:54323 | Database dashboard |
| GoTrue | `dygo_supabase_auth` | via Kong `/auth/v1/` | Authentication |
| PostgREST | `dygo_supabase_rest` | via Kong `/rest/v1/` | Auto-generated REST API |
| Storage | `dygo_supabase_storage` | via Kong `/storage/v1/` | Object storage (S3 backend → RustFS) |
| postgres-meta | `dygo_supabase_meta` | internal `:8080` | Backs Studio's schema browser |
| Redis | `dygo_redis` | `localhost:6379` | BullMQ queues + SRS cache |
| Speech scorer | `dygo_speech` | `127.0.0.1:8100` (this Mac only) | Checks a learner's recording against a sentence (words + sounds), free and local. See [Speech checking](#speech-checking-speech-scorer) |
| RustFS | `dygo_rustfs` | http://localhost:9001 (console), `localhost:9100` (S3 API) | S3-compatible store behind Supabase Storage (login = `RUSTFS_ACCESS_KEY` / `RUSTFS_SECRET_KEY` in `.env`). Replaced MinIO on 2026-10-04; S3 port is 9100 because Homebrew php-fpm holds 9000 |

Use `localhost`, not `0.0.0.0` — the latter is a bind address, and some browser
APIs treat it as a non-secure context.

**Stop** with `docker compose down`. Add `-v` to also destroy the database
volume — see the reset note in step 3.

---

## 3. Migrate database

The schema was squashed on 2026-09-25 into one ordered baseline (`database/schema/`),
with test data in `database/seeds/`. Full detail: [`database/README.md`](database/README.md).

```bash
./database/apply-migrations.sh            # EMPTY database: schema + every seed pack
./database/apply-migrations.sh --no-seed  # EMPTY database: schema only
./database/reset-db.sh                    # EXISTING database: back up → wipe → rebuild (asks you to type RESET)
./database/apply-migrations.sh --test     # RLS suite (64 checks) in a throwaway database
./database/apply-migrations.sh --verify   # what is installed
```

| Folder | Contents |
| :--- | :--- |
| `schema/` | `01_extensions_types` → `02_tables` → `03_functions_triggers` → `04_rls_policies` → `05_indexes` → `06_grants` |
| `seeds/` | `01_core_fixtures` (**never on a real production database**), `02_tier_ladder`, `03_qa_tenant`, `04_qa_words`, `05_hello_world_word`, `06_onboarded_fixtures` |
| `migrations/` | Changes after the baseline; `--migrations` applies pending ones, each once |
| `archive/` | The original 001–021 migrations, history only |

`--test` builds a scratch database from the stub auth schema, the baseline and
the core fixtures, then runs 64 assertions: cross-tenant isolation, SRS
progress unreadable even by a teacher, READ members unable to add words or
enumerate the roster, WRITE unable to delete a topic, blocked self-promotion,
invite redemption, heatmap gates, and group creation by a non-admin. It ends
with `ALL RLS CHECKS PASSED`, then drops the scratch database.

To start over at any time, `./database/reset-db.sh` (backups land in
`database/backups/`, git-ignored; `./database/restore-db.sh <file>` puts one back).

### Seeded logins

`seeds/01_core_fixtures.sql` creates two tenants so isolation can be exercised by hand.
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
| http://localhost:3000 | Signed out → `/search` (guest trial); signed in → `/garden` |
| http://localhost:3000/login | Sign in (also `/register`, `/forgot-password`, `/reset-password`) |
| http://localhost:3000/garden | Home — Today's garden |
| `/review` · `/topics` · `/topics/:id` · `/missions` · `/me` · `/groups/**` · `/quiz` · `/join/:token` | The garden screens (final URLs since Phase 12 UI-8) |
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
**Since Phase 12 UI-8 (2026-10-02)** the classic UI is deleted and the
Word Garden (`src/app/(garden)`, `src/components/garden`) is the only
signed-in UI; there is no `NEXT_PUBLIC_GARDEN_UI` flag or `?ui=classic`
any more. Old links redirect permanently in `src/middleware.ts`:
`/garden/<x>/**` → `/<x>/**`, `/study` → `/review`, `/analytics` and
`/settings` → `/me`. Paths live in `src/constants/routes.ts` and
`src/constants/garden.ts`; see `docs/architecture/dygo_academy_frontend_architecture.md` §4.

Requires the backend (step 4) to be running for `/api/v1/topics` to resolve;
the landing page itself has no data dependency.

---

## Running modes: local, dev, production

Three profiles — **local**, **stg** (network/tailscale), **prod** — all
built on the same mechanism: a small file under `env-profiles/` holding
only the values that differ from the base `.env`, sourced into the shell
right before the dev/build/start command runs (`set -a; .
../env-profiles/<profile>.env; set +a`), so it overrides those keys
without editing `.env` itself.

`env-profiles/*.env` are gitignored (real values); the matching
`*.env.example` files next to them are tracked templates — copy one with
`cp env-profiles/local.env.example env-profiles/local.env` (etc.) to get
started, or just use the working copies already in this repo checkout.

**Why a whole folder, not root-level `.env.local` / `.env.stg` /
`.env.prod` (how this used to be laid out):** `.env.local` at the repo root
collided, in name only, with `com.dygoacademy.frontend/.env.local` — a
*completely unrelated* file Next.js auto-loads on its own (holds the
Supabase anon key). Two different mechanisms, same filename, easy to edit
the wrong one and wonder why nothing changed. `env-profiles/` can't be
confused with either app's own dotenv conventions.

| Profile | Who it's for | Backend | Frontend |
| :--- | :--- | :--- | :--- |
| **local** | Browsing from this machine only, via `localhost` | `npm run start:dev:local` | `npm run start:dev:local` |
| **stg** (network) | Another device on your network (e.g. a phone) via this machine's IP | `npm run start:dev:stg` | `npm run start:dev:stg` |
| **prod** | The public internet, via a real domain | `npm run build` then `npm run start:prod:domain` | `npm run build:prod:domain` then `npm run start` |

local and stg both run in watch mode (`nest start --watch` / `next dev`) —
no build step, edits reload live. **prod is the only profile that builds
first**, and the order matters: Next.js bakes every `NEXT_PUBLIC_*` value
into the browser bundle at `next build` time, not at start time, so
`env-profiles/prod.env` must already hold the right values *before*
`build:prod:domain` runs — editing it after the fact and just restarting
`next start` does nothing until you rebuild.

**App media now lives in RustFS on this Mac (option 2, 2026-10-04).** Word and
speaking audio is uploaded by `StorageService` to the RustFS bucket `media`
(`src/config/storage-config.ts`: `STORAGE_PROVIDER=rustfs`, the default) and
served publicly at `https://media.dygoacademy.com/<key>` through the tunnel,
cached by Cloudflare. Each clip is stored twice at the same key: AAC `.m4a`
(about 6× smaller, the URL the app uses) and the original `.wav`
(`KEEP_WAV_COPY` in `src/storage/audio-encode.ts`, kept for the WAV support
period). ffmpeg (Homebrew) does the encoding; without it, only the WAV is
stored. `STORAGE_PROVIDER=r2` switches back to Cloudflare R2 (same keys).
The history below describes the R2-only period.

**Object storage is the same everywhere — Cloudflare R2, no local
fallback.** This app's own audio uploads (`StorageService`) used to fall
back to a local MinIO container when `R2_ACCOUNT_ID` was unset, so
local/dev could run offline — removed 2026-09-16 at the project owner's
request, so every profile now uploads to the same real R2 bucket. The
credentials live in the root `.env` (shared across all profiles, like
`DATABASE_URL`/`SUPABASE_URL` already are), not in any `env-profiles/`
file — see `.env`'s own storage section. One side-effect worth knowing:
`docker-compose.yml`'s local object store (MinIO until 2026-10-04, now
RustFS) only backs Supabase's own Storage feature (`storage-api`), which is
unrelated to this app's audio pipeline. MinIO was replaced because its
community edition is unmaintained and its Docker images were removed.

Before this change, only `prod.env` carried real R2 credentials while
`local`/`stg` fell back to MinIO — but a copy-paste of the real credentials
had accidentally ended up in `local.env`/`stg.env` too (so local/LAN dev
was silently uploading to the real bucket) while `prod.env` briefly had
*none* (so production was silently falling back to an unreachable
`localhost:9000`). Both were bugs; this section describes the fixed,
current state.

### Local

Exactly steps 4–5 above, or the explicit `start:dev:local` variant — same
values either way, `env-profiles/local.env` just makes "everything is
`localhost`" explicit instead of relying on the app's own fallback
defaults. Nothing extra beyond Docker running (step 2).

### Dev — reachable from another device on your network

`env-profiles/stg.env` overrides `FRONTEND_URL` / `NEXT_PUBLIC_API_URL` /
`NEXT_PUBLIC_SUPABASE_URL` to this machine's LAN or tailscale IP instead of
`localhost` — update that IP in that file if it ever changes
(`ipconfig getifaddr en0` on the Mac, or `tailscale ip -4` if you're on
tailscale). No object-storage override needed here — R2's URL is already a
real public internet address, reachable from any device.

```bash
cd com.dygoacademy.backend && npm run start:dev:stg
cd ../com.dygoacademy.frontend && npm run start:dev:stg
```

### Production — public domain

Backed by three files: `env-profiles/prod.env` (the URL overrides above),
`cloudflared-config.yml` (Cloudflare Tunnel ingress — which local port each
subdomain maps to), and `ecosystem.config.js` (a
[pm2](https://pm2.keymetrics.io/) process file so all three processes
survive crashes and reboots). All three assume `www.<domain>` → the
frontend, `api.<domain>` → the backend, and `supabase.<domain>` → the Kong
gateway, mirroring the exact `host:port` split the local/dev profiles
already use.

**Why a tunnel instead of a plain reverse proxy + port forwarding:** this
was the original plan, but it needs a stable public IP with ports 80/443
reachable from the internet. A home ISP connection (this one's on StarHub
cable in Singapore) typically hands out a *dynamic* IP that can change
without notice, and may or may not even be a real per-customer public IP —
some ISPs share it behind carrier-grade NAT (CGNAT), in which case no
amount of router port-forwarding makes it reachable at all. Cloudflare
Tunnel sidesteps both problems: `cloudflared` on this Mac opens an
*outbound* connection to Cloudflare's edge, which terminates TLS and
proxies matching hostnames back down that connection. No public IP is
published, no ports need forwarding, and it keeps working even if the IP
changes or turns out to be CGNAT'd.

**One-time setup, run directly on the Mac** (not through this bridge —
`cloudflared tunnel login` needs a real browser session, and the tunnel
needs to stay running against this machine's real network, not a sandbox):

```bash
# 1. DNS for the domain must already be on Cloudflare (not GoDaddy) — in
#    the Cloudflare dashboard, add the site, then at your registrar change
#    the domain's nameservers to the two Cloudflare ones it gives you.
#    This can take a few minutes to propagate.

# 2. Install cloudflared and authorize it against your Cloudflare account
#    (opens a browser — log in and click "Authorize").
brew install cloudflared
cloudflared tunnel login

# 3. Create the tunnel — prints a tunnel ID and a credentials-file path.
cloudflared tunnel create dygo-academy

# 4. Open cloudflared-config.yml and replace both TUNNEL_ID placeholders
#    with the ID printed above (credentials-file is normally
#    ~/.cloudflared/<TUNNEL_ID>.json — never commit that json file).

# 5. Point each subdomain at the tunnel (repeat per hostname).
cloudflared tunnel route dns dygo-academy www.dygoacademy.com
cloudflared tunnel route dns dygo-academy api.dygoacademy.com
cloudflared tunnel route dns dygo-academy sso.dygoacademy.com        # Supabase (Kong), 2026-10-17
cloudflared tunnel route dns dygo-academy supabase.dygoacademy.com   # old Supabase host, still routed
cloudflared tunnel route dns dygo-academy media.dygoacademy.com   # RustFS `media` bucket (2026-10-04)
# The bare domain -> www redirect is a Cloudflare dashboard rule
# (Rules > Redirect Rules), not something cloudflared handles. See
# "Cloudflare dashboard rules" below for that and the media.* rules.

# 6. Build both apps (NEXT_PUBLIC_* values come from env-profiles/prod.env at this step).
cd com.dygoacademy.backend && npm run build
cd ../com.dygoacademy.frontend && npm run build:prod:domain

# 7. Keep everything running — backend, frontend, and the tunnel.
npm install -g pm2   # once
cd ..
pm2 start ecosystem.config.js
pm2 save && pm2 startup   # survive a reboot — follow the command pm2 prints
```

**Cloudflare dashboard rules** (zone `dygoacademy.com`; set by hand, no API token here):

| Where in the dashboard | Rule | Why |
| :--- | :--- | :--- |
| Rules → Redirect Rules | If hostname equals `dygoacademy.com` → dynamic redirect to `concat("https://www.dygoacademy.com", http.request.uri.path)`, **301**, preserve query string | One canonical address. The backend's CORS allowlist and sign-in only know `www`, so the bare domain must redirect, not serve the app |
| Caching → Cache Rules | If hostname equals `media.dygoacademy.com` → Eligible for cache; Edge TTL: use the origin's Cache-Control | `.wav` isn't cached by default; clips are uploaded as `public, max-age=31536000, immutable`, so after the first play Cloudflare serves them, not the Mac |
| Rules → Transform Rules → Modify Response Header | If hostname equals `media.dygoacademy.com` → Set static `Access-Control-Allow-Origin: *` | A clip cached from a request without `Origin` has no CORS header; this adds it at the edge for every copy. Safe: the bucket is public and read-only |
| Security → WAF → Custom rules | If `http.host eq "media.dygoacademy.com" and not http.request.method in {"GET" "HEAD" "OPTIONS"}` → Block | RustFS already refuses unsigned writes (403); this stops write and admin attempts before they reach the Mac |
| Rules → Settings (or Transform Rules) → Managed Transforms → **Add visitor location headers** → On | Adds `CF-IPCity` (country `CF-IPCountry` is on by default) | The audio start-time log (`media_load_events`) records the learner's city as well as country |

`media.dygoacademy.com/<key>` maps to RustFS bucket `media` (`RUSTFS_SERVER_DOMAINS` in
`docker-compose.yml`), public for GetObject only (`docker/rustfs/media-policy.json`), CORS in
`docker/rustfs/media-cors.json`. Keys mirror R2 (`speaking/en/us/<md5>.wav`), so a clip's
fallback URL is the R2 URL with the host swapped.

After step 5, DNS is a Cloudflare-managed CNAME to the tunnel rather than
an A record at a fixed IP, so nothing here needs updating again if the
home IP changes.

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
(`apply-migrations.sh` or `reset-db.sh`; several specs assume a one-time seed state,
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
storage-api and the S3 store. Not a blocker for Phase 0 or 1. (Until 2026-10-04
storage-api's S3 endpoint was `http://localhost:9000`, its own container, so it
never reached MinIO at all; it now points at `http://rustfs:9000`. Re-test TUS.)

---

## Layout

```
DygoAcademy/
├── docker-compose.yml              # Local Supabase, Redis & RustFS stack
├── .env.example                    # Template — copy to .env, never commit .env
├── env-profiles/                   # local/stg/prod overlays — see "Running modes"
│   ├── local.env(.example)         # localhost — no object storage override
│   ├── stg.env(.example)           # LAN/tailscale IP
│   └── prod.env(.example)          # real domain + real Cloudflare R2 credentials
├── cloudflared-config.yml          # Cloudflare Tunnel ingress for production
├── ecosystem.config.js             # pm2 process file for production
├── database/
│   ├── apply-migrations.sh         # Build: schema → migrations → seeds (see database/README.md)
│   ├── reset-db.sh / restore-db.sh # Back up + wipe + rebuild / put a backup back
│   ├── init/                       # Container bootstrap (runs on empty volume only)
│   ├── schema/                     # Squashed baseline, 01–06
│   ├── seeds/                      # Test/demo data packs, 01–05
│   ├── migrations/                 # Changes after the baseline (empty today)
│   ├── archive/                    # Original 001–021, history only
│   └── tests/                      # RLS verification suite
├── supabase/
│   ├── kong.yml                    # Gateway routes (a TEMPLATE — see above)
│   └── kong-entrypoint.sh          # Renders the template, then starts Kong
├── com.dygoacademy.backend/        # NestJS API — scaffolded
│   ├── scripts/dev-token.js        # Mint tokens for fixture users (dev only)
│   ├── scripts/test-push.js        # Send a real push to a user's subscription (dev only)
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
│       ├── app/                     # (auth), (auth-garden), (garden) route groups, search/, api/
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
        └── support/                # client.ts, token.ts, fixtures.ts (mirrors seeds/01_core_fixtures.sql)
```

## Spaced repetition

Word review scheduling lives in `com.dygoacademy.backend/src/modules/srs/`
and uses **FSRS-6** via [`ts-fsrs`](https://github.com/open-spaced-repetition/ts-fsrs).
**SM-2 has been removed** (Phase 10): the old `srs-algorithm.ts`, its
ease factor and its fixed 1→3→7→16-day ladder are gone.

| File | What it owns |
| :--- | :--- |
| `fsrs-config.ts` | Target retention (0.95), 180-day cap, 10-minute relearning step |
| `fsrs-scheduler.ts` | Pure FSRS math: stability, difficulty, recall probability, sticky mastery (stability ≥ 21 days) |
| `grading.ts` | What counts: flashcard and quiz grades, "successes only when due", at most one counted mistake per word per day |
| `srs.service.ts` | The review transaction (`rate`, `recordQuizResult`) |

Quiz answers feed the same schedule as flashcards. Those SM-2 columns no longer
exist in the schema.

**Rolling it out**: the FSRS schema is part of the squashed baseline, so a
rebuild (`./database/reset-db.sh`) gives you FSRS directly. There is no
SM-2 → FSRS conversion step. (The upgrade path with migrations 019–021 and
`scripts/backfill-fsrs.js` was superseded on 2026-09-25 by the decision to
wipe and rebuild; the migrations are kept in `database/archive/`.)

See [`phase 10 implementation plan.md`](phase%2010%20implementation%20plan.md)
for the design, the customer-experience decisions and the test plan.

## Audio and speaking content

All app audio is stored in RustFS (bucket `media`) and served at
`https://media.dygoacademy.com/<key>` (see "Production — public domain" and
`src/config/storage-config.ts`). Every clip is stored as AAC `.m4a` (what the
app plays) plus a `.wav` copy at the same key. Encoding needs **ffmpeg**
(`brew install ffmpeg`); without it only the `.wav` is stored.

| Audio | Made by | When |
| :--- | :--- | :--- |
| Word pronunciation (`master_lexicon.audio_url`) | Gemini TTS, in the enrichment worker | Automatically when a word is added |
| Speaking sentences (`speaking_items`, Phase 13) | Google Cloud TTS (Neural2, UK + US, with word timings) | **By hand**, with `speaking-generate` below |

Run these from `com.dygoacademy.backend/`. They read the root `.env`.

```bash
# Speaking sentences (Phase 13). Needs GOOGLE_TTS_API_KEY in the root .env
# (Google Cloud project "Dygo", key restricted to the Cloud Text-to-Speech API).
npm run speaking-generate -- --all --limit 200 --dry-run   # list what's missing + cost estimate, no TTS calls
npm run speaking-generate -- --all --limit 200             # make it for every word that has no speaking audio yet (stops at $2, see below)
npm run speaking-generate -- --topic <topic-id>            # only one topic's words
npm run speaking-generate -- --topic <topic-id> --force    # remake (e.g. after changing a voice)
npm run speaking-generate -- --fixture --out ../com.dygoacademy.frontend/public/audio/speaking-fixture  # dev test clip, no key needed

# Word audio for words that have none (queues jobs for the running backend).
npm run audio-backfill -- --dry-run
npm run audio-backfill

# One-off R2 → RustFS move (done 2026-10-04). Re-run is safe: copies only what's missing.
npm run media-migrate -- --dry-run
npm run media-migrate
```

Notes:

- **Spend caps (Phase 13 S13)**: a run stops before its TTS would pass `--max-usd`
  (default $2 at Neural2 list price; `--yes` lifts it) and when today's Google TTS total
  reaches `GOOGLE_TTS_DAILY_CHAR_LIMIT` (default 300,000 characters, always on). A stopped
  run keeps what it made; run it again to continue. The backend caps Gemini the same way
  (`GEMINI_DAILY_CALL_LIMIT`, default 1,000 calls a day: enrichment, translations, word
  audio, quiz explanations); over the cap a new word fails with "Daily gemini limit
  reached" and quiz explanations are left out. Usage per day is in the `api_usage_daily`
  table. These are app-side caps; also set budget alerts and quotas in Google Cloud (G5).
  To change a cap, edit `GEMINI_DAILY_CALL_LIMIT` / `GOOGLE_TTS_DAILY_CHAR_LIMIT` in the root
  `.env` (both listed there with the defaults) and run `pm2 restart dygo-backend`. On UAT the
  backend also loads `env-profiles/prod.env` first, so a value set there wins.
- **New words don't get speaking audio automatically yet**: run
  `speaking-generate -- --all` after adding words (each run only makes what's missing).
- **Cost**: about 300 characters per clip, 2 clips per word. Google's first 1 million
  Neural2 characters a month are free (the 138 words generated on 2026-10-04 used 73,000).
- **Voices**: `en-GB-Neural2-C` and `en-US-Neural2-F` by default; override with
  `SPEAKING_VOICE_UK` / `SPEAKING_VOICE_US` in `.env`. The voice is part of the file
  name, so a new voice makes new files and never overwrites old ones.
- **Skipped words**: a word without an example sentence, or a multi-word entry
  ("food court"), is skipped and listed in the output.

## Speech checking (speech scorer)

Any feature that needs to know **how well a learner said something** uses the
speech scorer: a Docker service on this Mac (`docker/speech`, container
`dygo_speech`), free, no account or API key. It was built for Phase 13's
speaking practice (G6: self-hosted instead of a paid service, see
`phase/phase 13/PHASE-13-RECORD.md` §20), and anything else that listens to a learner
(word pronunciation, shadowing, a future kids' mode) should use it too rather
than add another service.

What it does with one recording and the sentence that was meant:

- **Words** (faster-whisper `base.en`): finds a left-out word, or a different
  word ("migrate" said for "mitigate"), with word timings.
- **Sounds** (wav2vec2 phoneme model + espeak + forced alignment): a 0–100
  score for each word's sounds, so a mispronounced word shows even when the
  right word was heard.
- Result per word: `ok`, `unclear` (with `heard` when another word was heard)
  or `missing`, plus a 0–100 total for the sentence.

### Run and check it

```bash
docker compose up -d speech                       # first start: ~90 s to load the models
curl -fsS http://127.0.0.1:8100/health            # {"ok":true} when ready (503 while loading)
curl -s -F audio=@docker/speech/samples/missing-the.m4a \
  -F "sentence=Planting more trees can help mitigate the effects of climate change." \
  http://127.0.0.1:8100/check                     # → "the": "missing"
docker logs dygo_speech --tail 20                 # timings and totals only, never audio or text
```

**Postman:** import `docker/speech/dygo-speech.postman_collection.json` in the
Postman **desktop app on this Mac** (the API listens on 127.0.0.1 only, so the
web app and phones can't reach it). It has Health and four Check requests with
the sample clips in `docker/speech/samples/` (good speech, "the" left out,
"migrate" for "mitigate", a Vietnamese voice). If the repo is somewhere else,
change the collection variable `samplesDir`. To try your own voice, record the
sentence in Voice Memos, AirDrop the `.m4a` to the Mac and pick it as `audio`
(Body → form-data, key `audio` of type **File**, key `sentence` as Text).

### API

`POST http://127.0.0.1:8100/check`, multipart form:

| Field | Value |
| :--- | :--- |
| `audio` | The recording as the browser made it: `.m4a` (iPhone Safari), `.webm` (Chrome) or `.wav`. ≤ 1 MB, 0.3–30 s. No conversion on the phone (decision S15-a). |
| `sentence` | The text the learner was asked to say (≤ 500 characters). |

```json
{
  "total": 89,
  "heard_text": "Planting more trees can help mitigate effects of climate change.",
  "duration_ms": 3500,
  "latency_ms": 1650,
  "words": [
    { "index": 6, "text": "the", "score": 37, "status": "missing", "heard": null, "start": null, "end": null }
  ]
}
```

`words` has one entry per word of `sentence`, in order; `index` is the word's position in the sentence split on spaces (a lone "—" has a position but no entry).
Errors: **503** models still loading, **413** over 1 MB, **422** not audio /
too short / too long / no sentence. Full details: `docker/speech/README.md`.

### Rules for features that use it

- **Go through the backend's queue.** The browser never talks to a scorer:
  scorers are bound to `127.0.0.1` and must never get a Cloudflare tunnel
  route. The app calls `POST /api/v1/speaking/check-speech` (answers at once with a
  `check_id`) and polls `GET /api/v1/speaking/check/:id`; a BullMQ worker in the
  backend (`speech-check-queue`, `SpeechCheckProcessor`) sends each recording to
  a free scorer from `SPEECH_SCORER_URLS` (UAT: `http://127.0.0.1:8100,http://127.0.0.1:8101`
  in `env-profiles/prod.env`, the `speech` and `speech-2` containers). Add a
  scorer (another container, or another machine over a private network) by adding
  its URL there and `pm2 restart dygo-backend`. Reuse this endpoint rather than
  calling a scorer from a new feature.
- **Don't keep the audio.** It stays in the API process's memory
  (`SpeechCheckStore`): the queued job carries ids only, because Redis saves to
  disk; a waiting recording is dropped after 60 s, results after 10 min (Phase 13 D2).
- **Busy and failures.** When the wait for a new check would pass
  `SPEECH_BUSY_ETA_SECONDS` (15), the API answers 503 and the app shows its own
  quick result ("Quick check on this phone"). A failed check (scorer down,
  over `SPEECH_CHECK_TIMEOUT_MS`, bad audio) shows "Couldn't check this one";
  the app gives up after 30 s in all.
- **Rate-limit per user** (60 checks an hour) so one learner can't tie up the scorers.

### Limits and tuning

- **Speed:** CPU only (Docker on macOS can't use the GPU). A 4–6 s sentence
  takes ~1.7–3.3 s, up to ~5 s when the Mac is busy.
- **Capacity** (measured 2026-10-06, M2): 2 scorers × 2 threads (`MODEL_THREADS`) check
  ~0.8 recordings a second (6 in 7.2 s), ~50 a minute: fine for ~100 learners at
  once. More scorers on the same Mac add little (the CPU is the limit); grow with a
  faster model or another machine added to `SPEECH_SCORER_URLS`.
- **Memory:** ~0.8–1.5 GB (`mem_limit` 4 GB); models live in the `speech_models`
  volume.
- **Rules and thresholds** (M4, calibrated 2026-10-05): the target word counts 3×,
  a wrong or missing target word caps the sentence at 69 (sprout), any mistake at 89
  (no fruit); function words are judged by Whisper; very confident sounds overrule a
  Whisper mishearing (`HEARD_TRUST_SCORE` 85); UK / US spellings match. All in
  `docker/speech/app/matching.py`; re-check with `docker/speech/calibration/`
  (see `docker/speech/README.md`). Short words that people say more than one way
  ("the" as /ði/ before a vowel) are listed in `VARIANTS` in the same file;
  add to it when good speech gets flagged.
- **Not caught:** words that sound the same ("affects" / "effects").
- **After changing the code:** `docker compose build speech && docker compose up -d speech speech-2`;
  unit tests: `docker run --rm --entrypoint python comdygoacademyenglish-speech -m pytest -q tests`.

## Documentation

| Document | Contents |
| :--- | :--- |
| [Master BRD](docs/product/dygo_academy_final_master_brd.md) | Product vision, 8 functional modules, NFR/SLO targets |
| [System Architecture](docs/architecture/dygo_academy_complete_system_architecture_master.md) | Subsystem diagrams, ERD, billing flows |
| [Tech Spec & Conventions](docs/architecture/dygo_academy_tech_spec_and_conventions.md) | Stack matrix, directory structure, naming rules |
| [Frontend Architecture](docs/architecture/dygo_academy_frontend_architecture.md) | Request flow, auth guard, state ownership, performance strategy, extension checklist |
| [Project Schedule](docs/product/dygo_academy_master_project_schedule.md) | 12-week, 6-sprint phased plan |
| [Competitive Analysis](docs/product/dygo_academy_competitive_analysis.md) | Market positioning vs. Anki, Quizlet, Memrise |
| [Phase 10 Plan — FSRS](phase%2010%20implementation%20plan.md) | FSRS scheduler (replaced SM-2); quiz answers feed the SRS; rollout steps |
| [Phase 11 Plan — Locale, Household & i18n](phase%2011%20implementation%20plan.md) | Timezone/locale preferences, child profiles, internationalization |
